import express from 'express';
import fs from 'fs';
import path from 'path';
import { getNote, saveNote, makeKey, getAllNotesForExport, importNotesBulk, searchNotes, deleteNote, getQuery } from '../core/database.js';

const router = express.Router();

export const clipboardState = {
  operation: null, // "copy" or "cut"
  paths: []
};

class UndoManager {
  static history = [];
  static MAX_HISTORY = 10;

  static addAction(action) {
    this.history.push(action);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }
  }

  static async executeUndo() {
    if (this.history.length === 0) {
      return { success: false, message: 'Geri alınacak bir işlem bulunamadı.' };
    }

    const action = this.history.pop();
    try {
      if (action.type === 'delete') {
        let restoredCount = 0;
        for (const item of action.items) {
          if (fs.existsSync(item.trashPath)) {
            const destDir = path.dirname(item.originalPath);
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }
            fs.renameSync(item.trashPath, item.originalPath);
            if (item.note) {
              await saveNote({
                key: item.note.key,
                name: item.note.name,
                size: item.note.size,
                ctime: item.note.ctime,
                description: item.note.description,
                shared: item.note.shared,
                path: item.originalPath,
                hidden: item.note.hidden,
                updated_at: item.note.updated_at,
                fixed_text: item.note.fixed_text,
                publish_time: item.note.publish_time
              });
            }
            restoredCount++;
          }
        }
        return { success: true, message: `${restoredCount} dosya çöp kutusundan geri yüklendi.` };
      }
    } catch (err) {
      return { success: false, message: `Geri alma hatası: ${err.message}` };
    }
    return { success: false, message: 'Bilinmeyen geri alma işlemi.' };
  }
}

// POST /api/metadata/update
router.post('/metadata/update', async (req, res) => {
  const { folder, updates } = req.body || {};
  if (!folder || !fs.existsSync(folder) || !Array.isArray(updates)) {
    return res.status(400).json({ detail: 'Geçersiz parametreler.' });
  }

  const updatedNotes = {};
  const now = Date.now();

  for (const update of updates) {
    const { name } = update;
    if (!name) continue;

    const videoPath = path.join(folder, name);
    if (!fs.existsSync(videoPath)) continue;

    try {
      const stat = fs.statSync(videoPath);
      const ctimeMs = Math.floor(stat.ctimeMs || stat.mtimeMs);
      const key = makeKey(name, stat.size, ctimeMs);

      const existing = (await getNote(key)) || {
        description: '',
        shared: false,
        hidden: false,
        fixed_text: '',
        publish_time: ''
      };

      const description = update.description !== undefined ? update.description : existing.description;
      const shared = update.shared !== undefined ? update.shared : existing.shared;
      const hidden = update.hidden !== undefined ? update.hidden : existing.hidden;
      const fixed_text = update.fixed_text !== undefined ? update.fixed_text : existing.fixed_text;
      const publish_time = update.publish_time !== undefined ? update.publish_time : existing.publish_time;

      await saveNote({
        key,
        name,
        size: stat.size,
        ctime: ctimeMs,
        description,
        shared,
        path: videoPath,
        hidden,
        updated_at: now,
        fixed_text,
        publish_time
      });

      updatedNotes[name] = now;
    } catch (err) {
      console.error(`Error updating metadata for ${name}:`, err);
    }
  }

  res.json({ success: true, updated_notes: updatedNotes });
});

// GET /api/notes/shared-today
router.get('/notes/shared-today', async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const row = await getQuery('SELECT COUNT(*) as count FROM notes WHERE shared = 1 AND updated_at >= ?', [startOfToday]);
    res.json({ success: true, shared_today: (row ? row.count : 0) > 0 });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /api/notes/search
router.get('/notes/search', async (req, res) => {
  try {
    const query = req.query.query || '';
    const matches = await searchNotes(query);
    const results = matches.filter(m => m.path && fs.existsSync(m.path));
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /api/notes/export
router.get('/notes/export', async (req, res) => {
  try {
    const notes = await getAllNotesForExport();
    res.json({ success: true, notes });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// POST /api/notes/import
router.post('/notes/import', async (req, res) => {
  const notes = req.body ? req.body.notes : null;
  if (!Array.isArray(notes)) {
    return res.status(400).json({ detail: 'Pano verisi eksik.' });
  }

  try {
    await importNotesBulk(notes);
    res.json({ success: true, message: `${notes.length} adet not başarıyla içe aktarıldı.` });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// POST /api/clipboard
router.post('/clipboard', (req, res) => {
  const { operation, paths } = req.body || {};
  clipboardState.operation = operation || null;
  clipboardState.paths = Array.isArray(paths) ? paths : [];
  res.json({ success: true, clipboard: clipboardState });
});

// POST /api/paste
router.post('/paste', async (req, res) => {
  const { folder: destDir } = req.body || {};
  if (!destDir || !fs.existsSync(destDir) || !fs.statSync(destDir).isDirectory()) {
    return res.status(400).json({ detail: 'Geçersiz hedef klasör.' });
  }

  const { operation, paths: pathsToPaste } = clipboardState;
  if (!operation || !pathsToPaste || pathsToPaste.length === 0) {
    return res.status(400).json({ detail: 'Pano boş.' });
  }

  let successCount = 0;
  const errors = [];

  for (const srcPath of pathsToPaste) {
    if (!fs.existsSync(srcPath)) {
      errors.push(`${srcPath} bulunamadı.`);
      continue;
    }

    try {
      const filename = path.basename(srcPath);
      let destPath = path.join(destDir, filename);

      if (fs.existsSync(destPath) && path.resolve(srcPath) !== path.resolve(destPath)) {
        const ext = path.extname(filename);
        const nameWithoutExt = path.basename(filename, ext);
        let counter = 1;
        while (fs.existsSync(destPath)) {
          destPath = path.join(destDir, `${nameWithoutExt}_kopya${counter}${ext}`);
          counter++;
        }
      }

      if (operation === 'copy') {
        fs.copyFileSync(srcPath, destPath);
      } else if (operation === 'cut') {
        fs.renameSync(srcPath, destPath);
      }

      const stat = fs.statSync(destPath);
      const ctimeMs = Math.floor(stat.ctimeMs || stat.mtimeMs);
      const srcStat = fs.statSync(srcPath);
      const srcCtimeMs = Math.floor(srcStat.ctimeMs || srcStat.mtimeMs);

      const srcKey = makeKey(path.basename(srcPath), srcStat.size, srcCtimeMs);
      const srcNote = await getNote(srcKey);
      if (srcNote) {
        const newKey = makeKey(path.basename(destPath), stat.size, ctimeMs);
        await saveNote({
          key: newKey,
          name: path.basename(destPath),
          size: stat.size,
          ctime: ctimeMs,
          description: srcNote.description,
          shared: srcNote.shared,
          path: destPath,
          hidden: srcNote.hidden,
          updated_at: srcNote.updated_at,
          fixed_text: srcNote.fixed_text,
          publish_time: srcNote.publish_time
        });
      }

      successCount++;
    } catch (err) {
      errors.push(`${path.basename(srcPath)} hatası: ${err.message}`);
    }
  }

  if (operation === 'cut' && successCount > 0) {
    clipboardState.paths = [];
    clipboardState.operation = null;
  }

  res.json({
    success: true,
    copied: successCount,
    errors,
    clipboard: clipboardState
  });
});

// POST /api/delete
router.post('/delete', async (req, res) => {
  const pathsToDelete = req.body ? req.body.paths : [];
  if (!Array.isArray(pathsToDelete) || pathsToDelete.length === 0) {
    return res.status(400).json({ detail: 'Silinecek dosya seçilmedi.' });
  }

  const trashDir = path.join(process.cwd(), '.trash');
  if (!fs.existsSync(trashDir)) {
    fs.mkdirSync(trashDir, { recursive: true });
  }

  let successCount = 0;
  const errors = [];
  const deletedItems = [];

  for (const itemPath of pathsToDelete) {
    if (!fs.existsSync(itemPath)) continue;

    try {
      const fname = path.basename(itemPath);
      const stat = fs.statSync(itemPath);
      const ctimeMs = Math.floor(stat.ctimeMs || stat.mtimeMs);
      const key = makeKey(fname, stat.size, ctimeMs);
      const note = await getNote(key);

      const trashPath = path.join(trashDir, `${Date.now()}_${Math.floor(Math.random() * 1000)}_${fname}`);
      fs.renameSync(itemPath, trashPath);

      if (note) {
        note.key = key;
        note.name = fname;
        note.size = stat.size;
        note.ctime = ctimeMs;
        await deleteNote(key);
      }

      deletedItems.push({ originalPath: itemPath, trashPath, note });
      successCount++;
    } catch (err) {
      errors.push(`${path.basename(itemPath)}: ${err.message}`);
    }
  }

  if (deletedItems.length > 0) {
    UndoManager.addAction({ type: 'delete', items: deletedItems });
  }

  res.json({
    success: true,
    deleted: successCount,
    errors
  });
});

// POST /api/undo
router.post('/undo', async (req, res) => {
  const result = await UndoManager.executeUndo();
  if (!result.success) {
    return res.status(400).json({ detail: result.message });
  }
  res.json(result);
});

export default router;
