import { app, BrowserWindow, Tray, Menu, shell, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let mainWindow = null;
let tray = null;
let serverProcess = null;
const API_PORT = 8085;
const API_URL = `http://127.0.0.1:${API_PORT}`;
const DEV_FRONTEND_URL = 'http://localhost:5173';

// Expose native folder picker to global scope for Express API route
global.electronPickFolder = async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Video Klasörünü Seçin',
    properties: ['openDirectory', 'createDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
};

async function isServerRunning() {
  try {
    const res = await fetch(`${API_URL}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function startServer() {
  if (await isServerRunning()) {
    console.log('Backend server is already running.');
    return;
  }

  const serverScript = path.join(rootDir, 'server', 'index.js');
  if (fs.existsSync(serverScript)) {
    serverProcess = spawn(process.execPath, [serverScript], {
      cwd: rootDir,
      env: { ...process.env, NODE_ENV: app.isPackaged ? 'production' : 'development' },
      stdio: 'inherit'
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start backend server process:', err);
    });
  }
}

function createWindow() {
  const iconPath = path.join(rootDir, 'logo.ico');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Media Planner',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false, // Prevents white screen flash
    backgroundColor: '#0F172A', // Dark theme matching background
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  const isDev = !app.isPackaged && process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL(DEV_FRONTEND_URL).catch(() => {
      setTimeout(() => mainWindow.loadURL(DEV_FRONTEND_URL), 1000);
    });
  } else {
    mainWindow.loadURL(API_URL).catch(() => {
      setTimeout(() => mainWindow.loadURL(API_URL), 1000);
    });
  }

  // Handle external links (Instagram, YouTube, etc.) in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', () => {
    app.isQuitting = true;
    if (serverProcess) serverProcess.kill();
    app.quit();
  });
}

function createTray() {
  const iconPath = path.join(rootDir, 'logo.ico');
  if (!fs.existsSync(iconPath)) return;

  tray = new Tray(iconPath);
  tray.setToolTip('Media Planner v2');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Media Planner\'i Göster / Gizle',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Çıkış',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function setupAutoUpdater() {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = false;
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) {
      mainWindow.webContents.executeJavaScript(`
        if (confirm("Yeni bir güncelleme mevcut (v${info.version}). İndirip yüklemek ister misiniz?")) {
          window.location.href = "http://127.0.0.1:${API_PORT}/api/start-update";
        }
      `);
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall();
  });
}

app.whenReady().then(async () => {
  await startServer();
  createWindow();
  createTray();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (serverProcess) {
    serverProcess.kill();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
