import os from 'os';
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';

export function getDbDir() {
  const appdata = process.env.APPDATA || (process.platform === 'win32'
    ? path.join(os.homedir(), 'AppData', 'Roaming')
    : path.join(os.homedir(), '.config'));
  
  const dbDir = path.join(appdata, 'MediaPlanner');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return dbDir;
}

export function getDbPath() {
  return path.join(getDbDir(), 'media_planner.db');
}

let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = new sqlite3.Database(getDbPath());
    dbInstance.run('PRAGMA journal_mode = WAL');
  }
  return dbInstance;
}

// Helper methods returning promises for sqlite3
export function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

export function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

export async function initDb() {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS notes (
      key TEXT PRIMARY KEY,
      name TEXT,
      path TEXT,
      size INTEGER,
      ctime INTEGER,
      description TEXT DEFAULT '',
      shared INTEGER DEFAULT 0,
      hidden INTEGER DEFAULT 0,
      updated_at INTEGER DEFAULT 0,
      fixed_text TEXT DEFAULT '',
      publish_time TEXT DEFAULT ''
    )
  `);

  const columnsToAdd = [
    { name: 'path', type: 'TEXT' },
    { name: 'hidden', type: "INTEGER DEFAULT 0" },
    { name: 'updated_at', type: "INTEGER DEFAULT 0" },
    { name: 'fixed_text', type: "TEXT DEFAULT ''" },
    { name: 'publish_time', type: "TEXT DEFAULT ''" }
  ];

  for (const col of columnsToAdd) {
    try {
      await runQuery(`ALTER TABLE notes ADD COLUMN ${col.name} ${col.type}`);
    } catch {
      // Column already exists
    }
  }
}

export function makeKey(name, size, ctime) {
  return `${name}_${size}_${ctime}`;
}

export async function getNote(key) {
  if (!key) return null;
  const row = await getQuery('SELECT description, shared, hidden, path, updated_at, fixed_text, publish_time FROM notes WHERE key = ?', [key]);
  if (!row) return null;

  return {
    description: row.description || '',
    shared: Boolean(row.shared),
    hidden: Boolean(row.hidden),
    path: row.path || null,
    updated_at: row.updated_at || 0,
    fixed_text: row.fixed_text || '',
    publish_time: row.publish_time || ''
  };
}

export async function getNotesBulk(keys) {
  if (!keys || keys.length === 0) return {};
  const placeholders = keys.map(() => '?').join(',');
  const rows = await allQuery(`SELECT key, description, shared, hidden, path, updated_at, fixed_text, publish_time FROM notes WHERE key IN (${placeholders})`, keys);

  const result = {};
  for (const row of rows) {
    result[row.key] = {
      description: row.description || '',
      shared: Boolean(row.shared),
      hidden: Boolean(row.hidden),
      path: row.path || null,
      updated_at: row.updated_at || 0,
      fixed_text: row.fixed_text || '',
      publish_time: row.publish_time || ''
    };
  }
  return result;
}

export async function saveNote({ key, name, size, ctime, description = '', shared = false, path: filePath = null, hidden = false, updated_at = null, fixed_text = '', publish_time = '' }) {
  let finalUpdatedAt = updated_at;
  if (finalUpdatedAt === null) {
    const existing = await getQuery('SELECT updated_at FROM notes WHERE key = ?', [key]);
    finalUpdatedAt = existing ? existing.updated_at : 0;
  }

  const sql = `
    INSERT INTO notes (key, name, path, size, ctime, description, shared, hidden, updated_at, fixed_text, publish_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      description = excluded.description,
      shared = excluded.shared,
      hidden = excluded.hidden,
      path = COALESCE(excluded.path, notes.path),
      updated_at = excluded.updated_at,
      fixed_text = excluded.fixed_text,
      publish_time = excluded.publish_time
  `;

  await runQuery(sql, [
    key,
    name,
    filePath,
    size,
    ctime,
    description,
    shared ? 1 : 0,
    hidden ? 1 : 0,
    finalUpdatedAt,
    fixed_text,
    publish_time
  ]);
}

export async function deleteNote(key) {
  await runQuery('DELETE FROM notes WHERE key = ?', [key]);
}

export async function getAllNotesForExport() {
  const rows = await allQuery('SELECT name, path, size, ctime, description, shared, updated_at FROM notes');
  return rows.map(row => ({
    name: row.name,
    path: row.path,
    size: row.size,
    ctime: row.ctime,
    description: row.description || '',
    shared: Boolean(row.shared),
    updated_at: row.updated_at || 0
  }));
}

export async function importNotesBulk(notesList) {
  for (const note of notesList) {
    if (note.name && note.size !== undefined && note.ctime !== undefined) {
      const key = makeKey(note.name, note.size, note.ctime);
      const sql = `
        INSERT INTO notes (key, name, path, size, ctime, description, shared, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          description = excluded.description,
          shared = excluded.shared,
          path = COALESCE(excluded.path, notes.path),
          updated_at = COALESCE(excluded.updated_at, notes.updated_at, 0)
      `;
      await runQuery(sql, [
        key,
        note.name,
        note.path || null,
        note.size,
        note.ctime,
        note.description || '',
        note.shared ? 1 : 0,
        note.updated_at || 0
      ]);
    }
  }
}

export async function searchNotes(queryStr) {
  const pattern = `%${queryStr}%`;
  const rows = await allQuery(`
    SELECT name, path, size, ctime, description, shared, updated_at 
    FROM notes 
    WHERE (name LIKE ? OR description LIKE ? OR path LIKE ?) AND path IS NOT NULL
  `, [pattern, pattern, pattern]);

  return rows.map(row => ({
    name: row.name,
    path: row.path,
    size: row.size,
    ctime: row.ctime,
    description: row.description || '',
    shared: Boolean(row.shared),
    updated_at: row.updated_at || 0,
    extension: row.name ? path.extname(row.name).toLowerCase() : ''
  }));
}
