const { app, BrowserWindow, ipcMain, globalShortcut, dialog, shell, Menu, session } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');

// Ensure app name is 'Concha' so userData path is consistently %APPDATA%\Concha across dev and prod
app.name = 'Concha';

// Enforce single instance lock to avoid port collision and multiple windows
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[RPGSA Electron] Another instance of Concha is already running. Quitting.');
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
let mainWindow = null;
let localServer = null;
let wasMaximizedBeforeLauncher = false;

// Fixed deterministic production port to guarantee persistent origin (localStorage & IndexedDB) across app updates
const PRODUCTION_PORT = 32188;

// Automatically migrate existing IndexedDB data from previous ephemeral ports to the new fixed port
function migrateIndexedDBIfNeeded(targetPort) {
  try {
    const idbDir = path.join(app.getPath('userData'), 'IndexedDB');
    if (!fs.existsSync(idbDir)) return;

    const targetFolder = `http_127.0.0.1_${targetPort}.indexeddb.leveldb`;
    const targetPath = path.join(idbDir, targetFolder);

    // If target directory already exists and has populated files (more than just LOCK), no migration needed
    if (fs.existsSync(targetPath)) {
      const files = fs.readdirSync(targetPath);
      if (files.filter(f => f !== 'LOCK').length > 0) {
        console.log(`[RPGSA Electron] Target IndexedDB folder ${targetFolder} already populated.`);
        return;
      }
    }

    // Find all old http_127.0.0.1_<port>.indexeddb.leveldb folders
    const entries = fs.readdirSync(idbDir, { withFileTypes: true });
    const oldFolders = entries
      .filter(d => d.isDirectory() && d.name.startsWith('http_127.0.0.1_') && d.name.endsWith('.indexeddb.leveldb') && d.name !== targetFolder)
      .map(d => {
        const fullPath = path.join(idbDir, d.name);
        const stats = fs.statSync(fullPath);
        return { name: d.name, path: fullPath, mtime: stats.mtime.getTime() };
      })
      .sort((a, b) => b.mtime - a.mtime); // newest first

    if (oldFolders.length === 0) {
      console.log('[RPGSA Electron] No previous IndexedDB folder found to migrate.');
      return;
    }

    const sourceFolder = oldFolders[0];
    console.log(`[RPGSA Electron] Migrating IndexedDB from ${sourceFolder.name} to ${targetFolder}...`);

    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }

    const sourceFiles = fs.readdirSync(sourceFolder.path);
    for (const file of sourceFiles) {
      if (file === 'LOCK') continue; // Don't copy stale lock
      const src = path.join(sourceFolder.path, file);
      const dst = path.join(targetPath, file);
      try {
        fs.copyFileSync(src, dst);
      } catch (copyErr) {
        console.warn(`[RPGSA Electron] Failed copying IDB file ${file}:`, copyErr);
      }
    }
    console.log(`[RPGSA Electron] IndexedDB migration to ${targetFolder} completed successfully.`);
  } catch (err) {
    console.error('[RPGSA Electron] Error during IndexedDB migration:', err);
  }
}

async function startProductionServer() {
  const next = require('next');
  const appDir = path.join(__dirname, '..');
  const nextApp = next({ dev: false, dir: appDir });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  // Try using preferred production port (32188) to guarantee persistent origin across updates
  let portToUse = PRODUCTION_PORT;
  try {
    const portFilePath = path.join(app.getPath('userData'), 'server_port.json');
    if (fs.existsSync(portFilePath)) {
      const saved = JSON.parse(fs.readFileSync(portFilePath, 'utf-8'));
      if (saved && typeof saved.port === 'number') {
        portToUse = saved.port;
      }
    }
  } catch (e) {
    console.warn('[RPGSA Electron] Failed reading saved port:', e);
  }

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      handle(req, res);
    });

    const tryListen = (port) => {
      server.listen(port, '127.0.0.1', () => {
        const address = server.address();
        const finalPort = typeof address === 'string' ? port : address.port;
        console.log(`[RPGSA Electron] Production Next.js server running on port ${finalPort}`);
        try {
          fs.writeFileSync(
            path.join(app.getPath('userData'), 'server_port.json'),
            JSON.stringify({ port: finalPort }, null, 2),
            'utf-8'
          );
        } catch {}
        migrateIndexedDBIfNeeded(finalPort);
        resolve({ server, port: finalPort });
      });
    };

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[RPGSA Electron] Port ${portToUse} in use, trying dynamic port fallback...`);
        server.listen(0, '127.0.0.1', () => {
          const address = server.address();
          const finalPort = typeof address === 'string' ? 3000 : address.port;
          console.log(`[RPGSA Electron] Fallback server running on port ${finalPort}`);
          try {
            fs.writeFileSync(
              path.join(app.getPath('userData'), 'server_port.json'),
              JSON.stringify({ port: finalPort }, null, 2),
              'utf-8'
            );
          } catch {}
          migrateIndexedDBIfNeeded(finalPort);
          resolve({ server, port: finalPort });
        });
      } else {
        reject(err);
      }
    });

    tryListen(portToUse);
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hidden' } : {}),
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0a',
    title: 'Concha',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    icon: fs.existsSync(path.join(__dirname, '../public/favicon.ico'))
      ? path.join(__dirname, '../public/favicon.ico')
      : path.join(__dirname, '../public/favicon.png')
  });

  Menu.setApplicationMenu(null);
  if (typeof mainWindow.removeMenu === 'function') {
    mainWindow.removeMenu();
  }

  mainWindow.on('maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-maximized-change', true);
    }
  });

  mainWindow.on('unmaximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-maximized-change', false);
    }
  });

  if (isDev) {
    const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
    await mainWindow.loadURL(devUrl);
    // mainWindow.webContents.openDevTools();
  } else {
    try {
      const { server, port } = await startProductionServer();
      localServer = server;
      await mainWindow.loadURL(`http://127.0.0.1:${port}`);
    } catch (err) {
      console.error('[RPGSA Electron] Failed to start local Next server:', err);
      // Fallback
      await mainWindow.loadURL('http://localhost:3000');
    }
  }

  // Register Global Hotkeys for Soundboard
  registerGlobalShortcuts();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerGlobalShortcuts() {
  // Ctrl+Shift+Space or Cmd+Shift+Space -> Mute/Pause all
  try {
    globalShortcut.register('CommandOrControl+Shift+Space', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('soundboard-mute-all');
      }
    });

    // Slots 1-9 -> Trigger Soundboard items 1-9
    for (let i = 1; i <= 9; i++) {
      globalShortcut.register(`CommandOrControl+Shift+${i}`, () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('soundboard-trigger', i);
        }
      });
    }
    console.log('[RPGSA Electron] Global Soundboard shortcuts registered successfully.');
  } catch (err) {
    console.warn('[RPGSA Electron] Failed to register some shortcuts:', err);
  }
}

// IPC Handlers
ipcMain.handle('select-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Selecione a pasta do Vault no Windows'
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('open-folder-in-explorer', async (event, folderPath) => {
  if (folderPath) {
    await shell.openPath(folderPath);
    return true;
  }
  return false;
});

ipcMain.handle('open-external', async (event, url) => {
  if (url && typeof url === 'string') {
    try {
      await shell.openExternal(url);
      return true;
    } catch (err) {
      console.error('[RPGSA Electron] Failed to open external URL:', err);
      return false;
    }
  }
  return false;
});

ipcMain.handle('trash-item', async (event, targetPath) => {
  if (!targetPath) {
    return { success: false, error: 'Caminho não fornecido' };
  }
  try {
    if (!fs.existsSync(targetPath)) {
      console.warn(`[RPGSA Electron] File not found to move to trash: ${targetPath}`);
      return { success: false, error: 'Arquivo não encontrado' };
    }
    await shell.trashItem(targetPath);
    console.log(`[RPGSA Electron] Successfully moved to Windows Recycle Bin: ${targetPath}`);
    return { success: true };
  } catch (err) {
    console.error('[RPGSA Electron] Error moving item to trash:', err);
    return { success: false, error: err ? err.message : 'Falha ao mover para a lixeira' };
  }
});

ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('is-maximized', () => {
  if (!mainWindow) return false;
  return mainWindow.isMaximized();
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('set-window-size', (event, width, height) => {
  if (!mainWindow) return false;
  try {
    const w = Math.round(Number(width));
    const h = Math.round(Number(height));
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    }
    mainWindow.setMinimumSize(Math.min(460, w), Math.min(580, h));
    mainWindow.setSize(w, h);
    mainWindow.center();
    return true;
  } catch (err) {
    console.error('[RPGSA Electron] Failed to set window size:', err);
    return false;
  }
});

ipcMain.handle('set-window-mode', (event, mode) => {
  if (!mainWindow) return false;
  try {
    if (mode === 'launcher') {
      // Preserva a janela ampla para o dashboard sem encolher para 500x680
      return true;
    } else if (mode === 'workspace') {
      mainWindow.setMinimumSize(1024, 700);
      if (wasMaximizedBeforeLauncher) {
        mainWindow.maximize();
        wasMaximizedBeforeLauncher = false;
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('[RPGSA Electron] Failed to set window mode:', err);
    return false;
  }
});

// ===================================================
// Vaults Registry Persistence & Old Version Recovery
// ===================================================
const VAULTS_FILE_NAME = 'vaults-registry.json';

function getVaultsFilePath() {
  return path.join(app.getPath('userData'), VAULTS_FILE_NAME);
}

// Helper to resolve or verify physical paths for local vaults
function resolveVaultPhysicalPath(vault) {
  if (vault.storageType === 'idb' || vault.id === 'default-vault') return undefined;
  if (vault.path && fs.existsSync(vault.path)) return vault.path;

  const namesToTry = [];
  if (vault.folderName) namesToTry.push(vault.folderName);
  if (vault.name && vault.name !== 'Vault' && vault.name !== 'Meu Vault Local') namesToTry.push(vault.name);
  if (vault.id === 'fsa-ad34920d' || vault.id === 'fsa-main') namesToTry.push('boncanotes');

  const userProfile = process.env.USERPROFILE || '';
  const baseDirs = [
    'G:\\My Drive',
    path.join(userProfile, 'Desktop'),
    path.join(userProfile, 'Documents'),
    path.join(userProfile, 'OneDrive'),
    'D:\\',
    'D:\\Projetos'
  ].filter(Boolean);

  for (const base of baseDirs) {
    for (const name of namesToTry) {
      try {
        const candidate = path.join(base, name);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
          return candidate;
        }
      } catch {}
    }
  }
  return vault.path || undefined;
}

// Scans LevelDB logs across all possible app data folders (current and legacy) to recover any vaults registered in earlier versions
function recoverVaultsFromLevelDB() {
  try {
    const vaultMap = new Map();
    const appData = app.getPath('appData');
    const candidateUserDataDirs = [
      app.getPath('userData'),
      path.join(appData, 'Concha'),
      path.join(appData, 'rpg-sound-util'),
      path.join(appData, 'supercanvas')
    ].filter((dir, idx, self) => fs.existsSync(dir) && self.indexOf(dir) === idx);

    for (const userDir of candidateUserDataDirs) {
      const leveldbDir = path.join(userDir, 'Local Storage', 'leveldb');
      if (!fs.existsSync(leveldbDir)) continue;

      const files = fs.readdirSync(leveldbDir).filter(f => f.endsWith('.log') || f.endsWith('.ldb'));
      for (const f of files) {
        try {
          const filePath = path.join(leveldbDir, f);
          const content = fs.readFileSync(filePath, 'latin1');

          // 1. Try standard JSON array matches
          const arrayRegex = /\[\s*\{[^{}]*"id"[^{}]*\}\s*(?:,\s*\{[^{}]*"id"[^{}]*\}\s*)*\]/g;
          let arrMatch;
          while ((arrMatch = arrayRegex.exec(content)) !== null) {
            try {
              const list = JSON.parse(arrMatch[0]);
              if (Array.isArray(list)) {
                for (const v of list) {
                  if (!v || !v.id) continue;
                  const existing = vaultMap.get(v.id);
                  if (!existing || (v.updatedAt || 0) >= (existing.updatedAt || 0)) {
                    vaultMap.set(v.id, v);
                  }
                }
              }
            } catch {}
          }

          // 2. Resilient object-level extractor (bypasses binary control character corruption in LevelDB sstables)
          const objRegex = /\{[^{}]*"(?:id|name|storageType)"[^{}]*\}/g;
          let objMatch;
          while ((objMatch = objRegex.exec(content)) !== null) {
            const rawObj = objMatch[0];
            const idMatch = rawObj.match(/"id"\s*:\s*"([^"]+)"/);
            if (!idMatch) continue;
            const id = idMatch[1];
            if (!id.startsWith('fsa-') && id !== 'default-vault') continue;

            const nameMatch = rawObj.match(/"name"\s*:\s*"([^"]+)"/);
            const storageTypeMatch = rawObj.match(/"storageType"\s*:\s*"([^"]+)"/);
            const folderNameMatch = rawObj.match(/"folderName"\s*:\s*"([^"]+)"/);
            const pathMatch = rawObj.match(/"path"\s*:\s*"([^"]+)"/);
            const updatedAtMatch = rawObj.match(/"updatedAt"\s*:\s*(\d+)/);
            const isDefaultMatch = rawObj.match(/"isDefault"\s*:\s*(true|false)/);

            const existing = vaultMap.get(id);
            const updatedAt = updatedAtMatch ? Number(updatedAtMatch[1]) : (existing?.updatedAt || 0);

            if (!existing || updatedAt >= (existing.updatedAt || 0)) {
              vaultMap.set(id, {
                id,
                name: nameMatch ? nameMatch[1] : (existing?.name || (id === 'default-vault' ? 'Meu Vault Local' : 'Vault')),
                storageType: storageTypeMatch ? storageTypeMatch[1] : (existing?.storageType || (id.startsWith('fsa-') ? 'fsa' : 'idb')),
                folderName: folderNameMatch ? folderNameMatch[1] : existing?.folderName,
                path: pathMatch ? pathMatch[1] : existing?.path,
                updatedAt,
                isDefault: isDefaultMatch ? isDefaultMatch[1] === 'true' : (existing?.isDefault ?? (id === 'default-vault')),
              });
            }
          }
        } catch {}
      }
    }

    // Resolve physical paths for all recovered vaults
    for (const [id, v] of vaultMap.entries()) {
      v.path = resolveVaultPhysicalPath(v);
    }

    const recoveredList = Array.from(vaultMap.values());
    if (recoveredList.length > 0) {
      console.log(`[RPGSA Electron] Successfully recovered ${recoveredList.length} vault(s) from previous LevelDB logs:`, recoveredList.map(v => `${v.name} (${v.id})`));
      return recoveredList;
    }
  } catch (err) {
    console.warn('[RPGSA Electron] Failed recovering vaults from LevelDB:', err);
  }
  return null;
}

function loadVaultsFromDisk() {
  const filePath = getVaultsFilePath();
  let diskData = null;
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.vaults) && parsed.vaults.length > 0) {
        diskData = parsed;
      }
    }
  } catch (err) {
    console.error('[RPGSA Electron] Error reading vaults-registry.json:', err);
  }

  // Always attempt recovery from old LevelDB logs to ensure no vaults are omitted
  const recovered = recoverVaultsFromLevelDB();

  if (diskData && diskData.vaults) {
    // If recovered vaults exist, merge them into diskData without losing any vault
    if (recovered && recovered.length > 0) {
      const vaultMap = new Map();
      // First add recovered vaults
      for (const v of recovered) {
        if (v && v.id) vaultMap.set(v.id, v);
      }
      // Then merge disk vaults (keeping disk updates if newer or existing)
      for (const v of diskData.vaults) {
        if (!v || !v.id) continue;
        const existing = vaultMap.get(v.id);
        if (!existing) {
          vaultMap.set(v.id, v);
        } else {
          vaultMap.set(v.id, {
            ...existing,
            ...v,
            path: v.path || existing.path || resolveVaultPhysicalPath(v),
            folderName: v.folderName || existing.folderName,
            updatedAt: Math.max(v.updatedAt || 0, existing.updatedAt || 0),
          });
        }
      }

      const mergedList = Array.from(vaultMap.values());
      const activeId = diskData.activeVaultId || mergedList.find(v => !v.isDefault)?.id || 'default-vault';
      const mergedData = {
        vaults: mergedList,
        activeVaultId: activeId
      };
      // If new vaults were merged in, save back to disk
      if (mergedList.length !== diskData.vaults.length) {
        saveVaultsToDisk(mergedData);
      }
      return mergedData;
    }
    return diskData;
  }

  // Fallback: Recover from old LevelDB logs if diskData was empty
  if (recovered && recovered.length > 0) {
    const activeVault = recovered.find(v => !v.isDefault) || recovered[0];
    const data = {
      vaults: recovered,
      activeVaultId: activeVault?.id || 'default-vault'
    };
    saveVaultsToDisk(data);
    return data;
  }

  return null;
}

function saveVaultsToDisk(data) {
  const filePath = getVaultsFilePath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (err) {
    console.error('[RPGSA Electron] Error saving vaults-registry.json:', err);
    return false;
  }
}

ipcMain.handle('load-vaults-registry', async () => {
  return loadVaultsFromDisk();
});

ipcMain.handle('save-vaults-registry', async (event, data) => {
  if (!data || !Array.isArray(data.vaults)) {
    return false;
  }
  return saveVaultsToDisk(data);
});

// ==========================================
// Auto-Updater Configuration & Handlers
// ==========================================
function sendUpdateStatus(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', payload);
  }
}

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = true;
autoUpdater.allowDowngrade = false;

let isDownloadingUpdate = false;

// Helper to check if an update error is due to absence of releases on GitHub
function isReleaseNotFoundError(err) {
  const errMsg = err ? (err.message || String(err)) : '';
  return (
    errMsg.includes('Unable to find latest version on GitHub') ||
    errMsg.includes('please ensure a production release exists') ||
    errMsg.includes('Cannot parse releases feed') ||
    errMsg.includes('HttpError: 404') ||
    errMsg.includes('HttpError: 406') ||
    errMsg.includes('No published versions on GitHub')
  );
}

autoUpdater.on('checking-for-update', () => {
  isDownloadingUpdate = false;
  console.log('[RPGSA Updater] Checking for update...');
  sendUpdateStatus({ status: 'checking' });
});

autoUpdater.on('update-available', (info) => {
  isDownloadingUpdate = false;
  console.log('[RPGSA Updater] Update available:', info && info.version);
  sendUpdateStatus({
    status: 'available',
    version: info && info.version,
    releaseName: (info && info.releaseName) || `Versão ${info && info.version}`,
    releaseNotes: typeof (info && info.releaseNotes) === 'string' ? info.releaseNotes : undefined
  });
});

autoUpdater.on('update-not-available', (info) => {
  isDownloadingUpdate = false;
  console.log('[RPGSA Updater] Update not available. Current version is latest:', info && info.version);
  sendUpdateStatus({ status: 'not-available', version: (info && info.version) || app.getVersion() });
});

autoUpdater.on('download-progress', (progressObj) => {
  isDownloadingUpdate = true;
  sendUpdateStatus({
    status: 'downloading',
    percent: Math.round(progressObj.percent),
    speed: Math.round(progressObj.bytesPerSecond || 0)
  });
});

autoUpdater.on('update-downloaded', (info) => {
  isDownloadingUpdate = false;
  console.log('[RPGSA Updater] Update downloaded:', info && info.version);
  sendUpdateStatus({ status: 'downloaded', version: info && info.version });
});

autoUpdater.on('error', (err) => {
  console.error('[RPGSA Updater] Update error:', err);
  const errMsg = err ? (err.message || String(err)) : '';

  // If error occurred during download, NEVER classify it as not-available
  if (isDownloadingUpdate) {
    isDownloadingUpdate = false;
    let friendlyMsg = 'Falha ao baixar o arquivo da atualização.';
    if (errMsg.includes('404')) {
      friendlyMsg = 'O arquivo da atualização não foi encontrado no GitHub (Erro 404). Você pode baixá-lo diretamente pelo navegador.';
    } else if (errMsg.includes('net::ERR_') || errMsg.includes('timeout') || errMsg.includes('ENOTFOUND')) {
      friendlyMsg = 'Falha de conexão com a internet durante o download da atualização.';
    } else if (errMsg) {
      friendlyMsg = `Erro no download: ${errMsg}`;
    }
    sendUpdateStatus({ status: 'error', message: friendlyMsg });
    return;
  }

  if (isReleaseNotFoundError(err)) {
    console.log('[RPGSA Updater] No newer release feed found on GitHub. App is currently up to date.');
    sendUpdateStatus({ status: 'not-available', version: app.getVersion() });
    return;
  }
  sendUpdateStatus({ status: 'error', message: err ? err.message : 'Falha na verificação de atualização' });
});

ipcMain.handle('check-for-updates', async () => {
  isDownloadingUpdate = false;
  if (!isDev) {
    try {
      return await autoUpdater.checkForUpdates();
    } catch (err) {
      console.error('[RPGSA Updater] Check failed:', err);
      if (isReleaseNotFoundError(err)) {
        sendUpdateStatus({ status: 'not-available', version: app.getVersion() });
        return null;
      }
      sendUpdateStatus({ status: 'error', message: err ? err.message : 'Falha na verificação de atualização' });
    }
  } else {
    // In development mode, check GitHub Releases API or fallback gracefully
    sendUpdateStatus({ status: 'checking' });

    const checkGitHubLatest = () => {
      return new Promise((resolve) => {
        const req = https.get(
          'https://api.github.com/repos/nilobonca/Concha/releases?per_page=5',
          {
            headers: {
              'User-Agent': 'Concha-Electron-App',
              Accept: 'application/vnd.github.v3+json'
            }
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => {
              try {
                if (res.statusCode === 200) {
                  const releases = JSON.parse(data);
                  if (Array.isArray(releases) && releases.length > 0) {
                    const release = releases.find((r) => !r.draft) || releases[0];
                    const latestVersion = (release.tag_name || '').replace(/^v/, '');
                    resolve({ success: true, release, latestVersion });
                    return;
                  }
                }
                resolve({ success: false, statusCode: res.statusCode });
              } catch {
                resolve({ success: false });
              }
            });
          }
        );

        req.on('error', () => resolve({ success: false }));
        req.setTimeout(4000, () => {
          req.destroy();
          resolve({ success: false });
        });
      });
    };

    try {
      const result = await checkGitHubLatest();
      const currentVer = app.getVersion();

      if (result.success && result.latestVersion && result.latestVersion !== currentVer) {
        console.log(`[RPGSA Updater Dev] Remote release detected: v${result.latestVersion} (installed: v${currentVer})`);
        sendUpdateStatus({
          status: 'available',
          version: result.latestVersion,
          releaseName: result.release.name || `Versão ${result.latestVersion}`,
          releaseNotes: typeof result.release.body === 'string' ? result.release.body : ''
        });
      } else {
        setTimeout(() => {
          sendUpdateStatus({ status: 'not-available', version: currentVer });
        }, 800);
      }
    } catch {
      setTimeout(() => {
        sendUpdateStatus({ status: 'not-available', version: app.getVersion() });
      }, 800);
    }
  }
  return null;
});

ipcMain.handle('start-download-update', async () => {
  isDownloadingUpdate = true;
  if (!isDev) {
    try {
      return await autoUpdater.downloadUpdate();
    } catch (err) {
      isDownloadingUpdate = false;
      console.error('[RPGSA Updater] Download error:', err);
      const errMsg = err ? (err.message || String(err)) : '';
      const friendlyMsg = errMsg.includes('404')
        ? 'Arquivo da atualização não encontrado no GitHub (404). Você pode baixá-lo diretamente pelo navegador.'
        : (errMsg || 'Falha ao baixar atualização');
      sendUpdateStatus({ status: 'error', message: friendlyMsg });
    }
  } else {
    // In dev mode, simulate realistic download progression for testing UI
    console.log('[RPGSA Updater Dev] Simulating download progression...');
    sendUpdateStatus({ status: 'downloading', percent: 15, speed: 1048576 });
    setTimeout(() => sendUpdateStatus({ status: 'downloading', percent: 45, speed: 2097152 }), 700);
    setTimeout(() => sendUpdateStatus({ status: 'downloading', percent: 80, speed: 3145728 }), 1400);
    setTimeout(() => sendUpdateStatus({ status: 'downloading', percent: 100, speed: 4194304 }), 2100);
    setTimeout(() => {
      sendUpdateStatus({ status: 'downloaded', version: '0.2.0' });
    }, 2600);
  }
  return null;
});

ipcMain.handle('quit-and-install', () => {
  if (!isDev) {
    autoUpdater.quitAndInstall(true, true);
  } else {
    console.log('[RPGSA Updater Dev] Quit and install triggered in dev mode.');
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Atualização do Concha',
        message: 'Ambiente de desenvolvimento: No aplicativo instalado final (.exe), o Concha será reiniciado e a nova versão aplicada automaticamente.'
      });
    }
  }
});

app.whenReady().then(async () => {
  // Grant permanent permissions for FSA (File System Access) and media in Electron
  try {
    if (session && session.defaultSession) {
      session.defaultSession.setPermissionCheckHandler(() => true);
      session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
        callback(true);
      });
      if (typeof session.defaultSession.setDevicePermissionHandler === 'function') {
        session.defaultSession.setDevicePermissionHandler(() => true);
      }
    }
  } catch (err) {
    console.warn('[RPGSA Electron] Failed setting session permission handlers:', err);
  }

  await createWindow();

  // Check for updates shortly after launch
  setTimeout(() => {
    if (!isDev) {
      autoUpdater.checkForUpdates().catch((err) => {
        console.log('[RPGSA Updater] Silent check error on launch:', err.message);
      });
    }
  }, 4000);
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (localServer) {
    localServer.close();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
