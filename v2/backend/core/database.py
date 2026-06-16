import os
import sqlite3
import platform

def get_db_dir() -> str:
    appdata = os.getenv('APPDATA')
    if not appdata:
        if platform.system() == 'Windows':
            appdata = os.path.expanduser('~/AppData/Roaming')
        else:
            appdata = os.path.expanduser('~/.config')
    path = os.path.join(appdata, 'MediaPlanner')
    os.makedirs(path, exist_ok=True)
    return path

def get_db_path() -> str:
    return os.path.join(get_db_dir(), 'media_planner.db')

def get_connection():
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notes (
        key TEXT PRIMARY KEY,
        name TEXT,
        path TEXT,
        size INTEGER,
        ctime INTEGER,
        description TEXT DEFAULT '',
        shared INTEGER DEFAULT 0
    )
    """)
    conn.commit()
    
    # Safely upgrade existing tables if they lack the 'path' column
    try:
        cursor.execute("ALTER TABLE notes ADD COLUMN path TEXT")
        conn.commit()
    except Exception:
        # Column already exists or table doesn't exist yet
        pass
        
    conn.close()

def make_key(name: str, size: int, ctime: int) -> str:
    return f"{name}_{size}_{ctime}"

def get_note(key: str) -> dict:
    if not key:
        return None
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT description, shared, path FROM notes WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"description": row["description"], "shared": bool(row["shared"]), "path": row["path"]}
    return None

def get_notes_bulk(keys: list[str]) -> dict:
    if not keys:
        return {}
    conn = get_connection()
    cursor = conn.cursor()
    placeholders = ",".join("?" for _ in keys)
    cursor.execute(f"SELECT key, description, shared, path FROM notes WHERE key IN ({placeholders})", keys)
    rows = cursor.fetchall()
    conn.close()
    return {row["key"]: {"description": row["description"], "shared": bool(row["shared"]), "path": row["path"]} for row in rows}

def save_note(key: str, name: str, size: int, ctime: int, description: str, shared: bool, path: str = None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO notes (key, name, path, size, ctime, description, shared)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
        description = excluded.description,
        shared = excluded.shared,
        path = COALESCE(excluded.path, notes.path)
    """, (key, name, path, size, ctime, description, 1 if shared else 0))
    conn.commit()
    conn.close()

def delete_note(key: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM notes WHERE key = ?", (key,))
    conn.commit()
    conn.close()

def get_all_notes_for_export() -> list[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name, path, size, ctime, description, shared FROM notes")
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "name": row["name"],
            "path": row["path"],
            "size": row["size"],
            "ctime": row["ctime"],
            "description": row["description"],
            "shared": bool(row["shared"])
        }
        for row in rows
    ]

def import_notes_bulk(notes_list: list[dict]):
    conn = get_connection()
    cursor = conn.cursor()
    for note in notes_list:
        name = note.get("name")
        path = note.get("path")
        size = note.get("size")
        ctime = note.get("ctime")
        description = note.get("description", "")
        shared = note.get("shared", False)
        if name is not None and size is not None and ctime is not None:
            key = make_key(name, size, ctime)
            cursor.execute("""
            INSERT INTO notes (key, name, path, size, ctime, description, shared)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                description = excluded.description,
                shared = excluded.shared,
                path = COALESCE(excluded.path, notes.path)
            """, (key, name, path, size, ctime, description, 1 if shared else 0))
    conn.commit()
    conn.close()

def search_notes(query_str: str) -> list[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT name, path, size, ctime, description, shared 
    FROM notes 
    WHERE (name LIKE ? OR description LIKE ? OR path LIKE ?) AND path IS NOT NULL
    """, (f"%{query_str}%", f"%{query_str}%", f"%{query_str}%"))
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "name": row["name"],
            "path": row["path"],
            "size": row["size"],
            "ctime": row["ctime"],
            "description": row["description"],
            "shared": bool(row["shared"]),
            "extension": os.path.splitext(row["name"])[1].lower() if row["name"] else ""
        }
        for row in rows
    ]

# Deprecated folder JSON metadata stubs for backward-compatibility if imported elsewhere
def load_metadata(folder: str) -> dict:
    return {}

def save_metadata(folder: str, metadata: dict):
    pass

# Initialize database on module load
try:
    init_db()
except Exception as e:
    print("Failed to initialize SQLite database:", e)