import express from 'express';
import fs from 'fs';
import path from 'path';
import { exec, execFile } from 'child_process';
import { fileURLToPath } from 'url';
import { makeKey, getNotesBulk, getNote, saveNote } from '../core/database.js';
import { clipboardState } from './file_ops.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PICK_FOLDER_PS1 = path.join(__dirname, '..', 'pick_folder.ps1');

const router = express.Router();

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm']);

async function migrateLegacyMetadata(folderPath, videoEntries) {
  const legacyPath = path.join(folderPath, 'content_metadata.json');
  if (!fs.existsSync(legacyPath)) return;

  try {
    const raw = fs.readFileSync(legacyPath, 'utf-8');
    const legacyData = JSON.parse(raw);
    if (!legacyData) return;

    for (const { name, stat, key, fullPath } of videoEntries) {
      if (legacyData[name]) {
        const existingNote = await getNote(key);
        if (!existingNote) {
          const entryData = legacyData[name];
          const desc = entryData.description || '';
          const shared = Boolean(entryData.shared);
          const ctime = Math.floor(stat.ctimeMs || stat.mtimeMs);
          await saveNote({
            key,
            name,
            size: stat.size,
            ctime,
            description: desc,
            shared,
            path: fullPath
          });
        }
      }
    }
  } catch (err) {
    console.error('Metadata migration error:', err);
  }
}

export async function scanFolderContents(folderPath) {
  const folders = [];
  const videos = [];

  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    const videoEntries = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.resolve(folderPath, entry.name);

      if (entry.isDirectory()) {
        folders.push({
          name: entry.name,
          path: fullPath,
          is_folder: true
        });
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VIDEO_EXTENSIONS.has(ext)) {
          let stat;
          try {
            stat = fs.statSync(fullPath);
          } catch {
            continue;
          }
          const ctimeMs = Math.floor(stat.ctimeMs || stat.mtimeMs);
          const key = makeKey(entry.name, stat.size, ctimeMs);
          const fileTime = (stat.ctimeMs || stat.mtimeMs) / 1000;

          videoEntries.push({ name: entry.name, fullPath, stat, key, ctimeMs, fileTime });
        }
      }
    }

    // Legacy migration
    await migrateLegacyMetadata(folderPath, videoEntries);

    // Fetch DB notes bulk
    const notesMap = await getNotesBulk(videoEntries);

    for (const item of videoEntries) {
      const meta = notesMap[item.key] || {};

      if (notesMap[item.key] && !meta.path) {
        try {
          await saveNote({
            key: item.key,
            name: item.name,
            size: item.stat.size,
            ctime: item.ctimeMs,
            description: meta.description || '',
            shared: meta.shared || false,
            path: item.fullPath
          });
        } catch {}
      }

      videos.push({
        name: item.name,
        path: item.fullPath,
        is_folder: false,
        description: meta.description || '',
        shared: Boolean(meta.shared),
        hidden: Boolean(meta.hidden),
        size: item.stat.size,
        extension: path.extname(item.name).toLowerCase(),
        time: item.fileTime,
        updated_at: meta.updated_at || 0,
        fixed_text: meta.fixed_text || '',
        publish_time: meta.publish_time || ''
      });
    }

    folders.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    videos.sort((a, b) => {
      if (a.shared !== b.shared) return a.shared ? 1 : -1;
      return b.time - a.time;
    });
  } catch (err) {
    console.error('Scan folder error:', err);
  }

  return { folders, videos };
}

// GET /api/scan
router.get('/scan', async (req, res) => {
  const rawFolder = req.query.folder;
  if (!rawFolder) {
    return res.status(400).json({ detail: 'Klasör yolu boş olamaz.' });
  }

  // Decode URI-encoded chars (e.g. %C3%BC -> ü), strip quotes, normalize backslashes
  let cleanFolder;
  try {
    cleanFolder = path.resolve(path.normalize(
      decodeURIComponent(String(rawFolder)).replace(/^["']|["']$/g, '').trim()
    ));
  } catch {
    cleanFolder = path.resolve(path.normalize(
      String(rawFolder).replace(/^["']|["']$/g, '').trim()
    ));
  }

  if (!fs.existsSync(cleanFolder) || !fs.statSync(cleanFolder).isDirectory()) {
    return res.status(400).json({ detail: `Geçersiz veya bulunamayan klasör yolu: ${cleanFolder}` });
  }

  const { folders, videos } = await scanFolderContents(cleanFolder);
  const parentFolder = path.dirname(cleanFolder) === cleanFolder ? null : path.dirname(cleanFolder);

  res.json({
    success: true,
    current_folder: cleanFolder,
    parent_folder: parentFolder,
    subfolders: folders,
    videos: videos,
    clipboard: clipboardState
  });
});

// POST /api/open-explorer
router.post('/open-explorer', (req, res) => {
  const paths = req.body.paths || [];
  if (!paths || paths.length === 0) {
    return res.status(400).json({ detail: 'Dosya yolu bulunamadı.' });
  }

  for (const itemPath of paths) {
    if (fs.existsSync(itemPath)) {
      if (process.platform === 'win32') {
        exec(`explorer /select,"${itemPath}"`);
      } else {
        exec(`open "${path.dirname(itemPath)}"`);
      }
    }
  }

  res.json({ success: true });
});

// GET /api/pick-folder
router.get('/pick-folder', async (req, res) => {
  // Primary: Electron native dialog if running inside Electron
  if (typeof global.electronPickFolder === 'function') {
    try {
      const selectedFolder = await global.electronPickFolder();
      if (selectedFolder) {
        const cleanPath = path.resolve(path.normalize(selectedFolder));
        return res.json({ success: true, folder: cleanPath });
      }
      return res.json({ success: false, folder: null });
    } catch (err) {
      console.error('Electron native pick-folder error:', err);
    }
  }

  // Secondary: Invoke .ps1 helper with UTF-8 output encoding (Windows)
  if (process.platform === 'win32') {
    execFile('powershell', [
      '-Sta',
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', PICK_FOLDER_PS1
    ], { encoding: 'utf8', maxBuffer: 4096 }, (err, stdout) => {
      const selectedPath = (stdout || '').trim();
      if (selectedPath) {
        const cleanPath = path.resolve(path.normalize(selectedPath));
        return res.json({ success: true, folder: cleanPath });
      }
      return res.json({ success: false, folder: null });
    });
  } else {
    res.json({ success: false, folder: null });
  }
});

export default router;

