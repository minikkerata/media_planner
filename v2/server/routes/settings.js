import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDbDir } from '../core/database.js';

const router = express.Router();

function getSettingsPath() {
  return path.join(getDbDir(), 'settings.json');
}

export function loadSettings() {
  const settingsPath = getSettingsPath();
  if (fs.existsSync(settingsPath)) {
    try {
      const raw = fs.readFileSync(settingsPath, 'utf-8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        const cleaned = {};
        for (const [k, v] of Object.entries(data)) {
          cleaned[k] = typeof v === 'string' ? v.trim() : v;
        }
        return cleaned;
      }
    } catch {}
  }
  return {
    buffer_api_key: '',
    buffer_channel_id: '',
    buffer_post_interval: 24,
    cloudinary_cloud_name: '',
    cloudinary_api_key: '',
    cloudinary_api_secret: '',
    fixed_text: 'Daha fazla yamaç paraşütü videosu görmek için takip etmeyi unutmayın'
  };
}

// GET /api/settings
router.get('/settings', (req, res) => {
  res.json(loadSettings());
});

// POST /api/settings
router.post('/settings', (req, res) => {
  try {
    const settingsPath = getSettingsPath();
    const data = req.body || {};
    const settingsDict = {};
    for (const [k, v] of Object.entries(data)) {
      settingsDict[k] = typeof v === 'string' ? v.trim() : v;
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settingsDict, null, 4), 'utf-8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ detail: `Ayarlar kaydedilemedi: ${err.message}` });
  }
});

// POST /api/settings/test-buffer
router.post('/settings/test-buffer', async (req, res) => {
  const apiKey = (req.body.buffer_api_key || '').trim();
  if (!apiKey) {
    return res.json({ success: false, message: 'API Key is required.' });
  }

  // GraphQL first
  try {
    const graphRes = await fetch('https://api.buffer.com', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: 'query { account { id } }' })
    });
    if (graphRes.ok) {
      const json = await graphRes.json();
      if (!json.errors) {
        return res.json({ success: true, message: 'Buffer API key is valid.' });
      }
    }
  } catch {}

  // Fallback REST
  try {
    const restRes = await fetch(`https://api.bufferapp.com/1/user.json?access_token=${encodeURIComponent(apiKey)}`);
    if (restRes.ok) {
      return res.json({ success: true, message: 'Buffer API key is valid (Legacy REST).' });
    } else {
      const errJson = await restRes.json().catch(() => ({}));
      const detail = errJson.message || 'Validation failed.';
      return res.json({ success: false, message: `Buffer API error: ${detail}` });
    }
  } catch (err) {
    res.json({ success: false, message: `Connection error: ${err.message}` });
  }
});

// GET /api/buffer-profile
router.get('/buffer-profile', async (req, res) => {
  const settings = loadSettings();
  const apiKey = (settings.buffer_api_key || '').trim();
  const channelId = (settings.buffer_channel_id || '').trim();

  if (!apiKey || !channelId) {
    return res.json({ success: false, name: null, avatar: null, followers: null });
  }

  // GraphQL queries
  const queries = [
    `query GetChannels { channels { id name avatar service statistics { followers } } }`,
    `query GetChannels { channels { id name avatar service type } }`
  ];

  for (const query of queries) {
    try {
      const resp = await fetch('https://api.buffer.com', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });
      if (resp.ok) {
        const body = await resp.json();
        if (body.errors) continue;

        const channels = body.data?.channels || [];
        let match = channels.find(c => c.id === channelId);
        if (!match) {
          match = channels.find(c => (c.service || '').toLowerCase() === 'instagram');
        }
        if (match) {
          const stats = match.statistics || {};
          return res.json({
            success: true,
            name: match.name,
            avatar: match.avatar,
            service: match.service || match.type,
            followers: stats.followers || null
          });
        }
        break;
      }
    } catch {}
  }

  // Fallback REST
  try {
    const resp = await fetch(`https://api.bufferapp.com/1/profiles.json?access_token=${encodeURIComponent(apiKey)}`);
    if (resp.ok) {
      const profiles = await resp.json();
      const match = profiles.find(p => p.id === channelId);
      if (match) {
        const stats = match.statistics || {};
        const followers = stats.followers || match.followers_count || null;
        return res.json({
          success: true,
          name: match.formatted_username || match.username,
          avatar: match.avatar_https || match.avatar,
          service: match.service,
          followers
        });
      }
    }
  } catch {}

  res.json({ success: false, name: null, avatar: null, followers: null });
});

// POST /api/settings/test-cloudinary
router.post('/settings/test-cloudinary', async (req, res) => {
  const cloudName = (req.body.cloudinary_cloud_name || '').trim();
  const apiKey = (req.body.cloudinary_api_key || '').trim();
  const apiSecret = (req.body.cloudinary_api_secret || '').trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return res.json({ success: false, message: 'All Cloudinary fields are required.' });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(toSign).digest('hex');

  const tinyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const formData = new URLSearchParams();
  formData.append('file', tinyImage);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);

  try {
    const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });
    const json = await resp.json();
    if (resp.ok && json.secure_url) {
      return res.json({
        success: true,
        message: 'Cloudinary configuration is valid.',
        url: json.secure_url
      });
    } else {
      const errorMsg = json.error?.message || 'Upload failed.';
      return res.json({ success: false, message: `Cloudinary error: ${errorMsg}` });
    }
  } catch (err) {
    res.json({ success: false, message: `Connection error: ${err.message}` });
  }
});

export default router;
