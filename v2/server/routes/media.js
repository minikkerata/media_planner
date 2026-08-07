import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { exec } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { allQuery } from '../core/database.js';

const router = express.Router();
const ffmpegExec = ffmpegPath || 'ffmpeg';
const thumbCache = new Set();

// GET /api/video
router.get('/video', (req, res) => {
  const videoPath = req.query.path;
  if (!videoPath || !fs.existsSync(videoPath)) {
    return res.status(404).json({ detail: 'Video bulunamadı.' });
  }
  res.sendFile(path.resolve(videoPath));
});

// GET /api/thumbnail
router.get('/thumbnail', (req, res) => {
  const videoPath = req.query.path;
  if (!videoPath) {
    return res.status(400).json({ detail: 'Video yolu gerekli.' });
  }

  const folder = path.dirname(videoPath);
  const thumbDir = path.join(folder, '.medi_thumbs');
  const cacheKey = `${videoPath}_540x960_q95`;
  const hName = crypto.createHash('md5').update(cacheKey).digest('hex');
  const thumbPath = path.join(thumbDir, `${hName}.jpg`);

  // 1. Memory cache check (0ms response)
  if (thumbCache.has(thumbPath)) {
    return res.sendFile(path.resolve(thumbPath));
  }

  // 2. Disk check
  if (fs.existsSync(thumbPath)) {
    thumbCache.add(thumbPath);
    return res.sendFile(path.resolve(thumbPath));
  }

  if (!fs.existsSync(thumbDir)) {
    fs.mkdirSync(thumbDir, { recursive: true });
  }

  // 3. Generate high quality 9:16 thumbnail via bundled ffmpeg executable
  const ffmpegCmd = `"${ffmpegExec}" -y -ss 00:00:02 -i "${videoPath}" -vframes 1 -vf "scale=540:960:force_original_aspect_ratio=decrease,pad=540:960:(ow-iw)/2:(oh-ih)/2:color=0x161B22" -q:v 2 "${thumbPath}"`;

  exec(ffmpegCmd, (err) => {
    if (!err && fs.existsSync(thumbPath)) {
      thumbCache.add(thumbPath);
      return res.sendFile(path.resolve(thumbPath));
    }
    // Fallback if ffmpeg failed on offset 2s: try offset 0s
    const fallbackCmd = `"${ffmpegExec}" -y -i "${videoPath}" -vframes 1 -vf "scale=540:960:force_original_aspect_ratio=decrease,pad=540:960:(ow-iw)/2:(oh-ih)/2:color=0x161B22" -q:v 2 "${thumbPath}"`;
    exec(fallbackCmd, (fallbackErr) => {
      if (!fallbackErr && fs.existsSync(thumbPath)) {
        return res.sendFile(path.resolve(thumbPath));
      }
      res.status(404).json({ detail: 'Önizleme resmi üretilemedi.' });
    });
  });
});

// POST /api/shutdown
router.post('/shutdown', (req, res) => {
  res.json({ success: true, message: 'Sistem kapatılıyor...' });
  setTimeout(() => {
    if (process.platform === 'win32') {
      exec('taskkill /f /im node.exe', () => process.exit(0));
    } else {
      process.exit(0);
    }
  }, 500);
});

// GET /api/usernames
router.get('/usernames', async (req, res) => {
  try {
    const rows = await allQuery("SELECT description FROM notes WHERE description IS NOT NULL AND description != ''");
    const usernames = new Set();
    const regex = /@([a-zA-Z0-9_\.\-]+)/g;

    for (const row of rows) {
      const desc = row.description || '';
      let match;
      while ((match = regex.exec(desc)) !== null) {
        const cleaned = match[1].trim().replace(/[.\-_]+$/, '');
        if (cleaned && !['username', 'filename', 'folder'].includes(cleaned.toLowerCase())) {
          usernames.add(cleaned);
        }
      }
    }

    res.json({ success: true, usernames: Array.from(usernames).sort() });
  } catch (err) {
    res.json({ success: false, error: err.message, usernames: [] });
  }
});

// GET /api/scheduled-videos
router.get('/scheduled-videos', async (req, res) => {
  try {
    const rows = await allQuery(`
      SELECT name, path, size, ctime, description, shared, updated_at, fixed_text, publish_time 
      FROM notes 
      WHERE (publish_time IS NOT NULL AND publish_time != '') OR shared = 1
    `);

    const videosList = rows.map(row => {
      let publishTime = row.publish_time || '';
      if (!publishTime && row.shared && row.updated_at) {
        try {
          publishTime = new Date(row.updated_at).toISOString();
        } catch {}
      }

      return {
        name: row.name,
        path: row.path,
        size: row.size,
        ctime: row.ctime,
        description: row.description || '',
        shared: Boolean(row.shared),
        updated_at: row.updated_at || 0,
        fixed_text: row.fixed_text || '',
        publish_time: publishTime
      };
    });

    res.json({ success: true, videos: videosList });
  } catch (err) {
    res.json({ success: false, error: err.message, videos: [] });
  }
});

export default router;
