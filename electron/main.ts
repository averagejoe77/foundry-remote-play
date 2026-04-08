import { app, BrowserWindow, ipcMain, net } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import Store from 'electron-store';

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Initialize the local JSON storage
const store = new Store();

process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    autoHideMenuBar: true,
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      webviewTag: true
    }
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// ------------------------------------------------------------------
// IPC Handlers for Local Database (electron-store)
// ------------------------------------------------------------------
app.whenReady().then(() => {
  // Block heavy media assets from being downloaded by the webview to save bandwidth
  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() === 'webview') {
      contents.session.webRequest.onBeforeRequest(
        { urls: ['*://*/*.webm*', '*://*/*.mp4*', '*://*/*.m4v*', '*://*/*.mp3*', '*://*/*.ogg*', '*://*/*.wav*', '*://*/*.flac*', '*://*/*.m4a*'] },
        (details, callback) => {
          console.log(`[Media Blocker] Blocked heavy asset download: ${details.url}`);
          callback({ cancel: true });
        }
      );
    }
  });

  // Save a value to the store
  ipcMain.handle('store-set', async (_event, key: string, val: any) => {
    store.set(key, val);
    return true;
  });

  // Get a value from the store
  ipcMain.handle('store-get', async (_event, key: string) => {
    return store.get(key);
  });

  // Delete a value from the store
  ipcMain.handle('store-delete', async (_event, key: string) => {
    store.delete(key);
    return true;
  });

  // Get entire store (useful for grabbing all characters at once if stored in a dict)
  ipcMain.handle('store-get-all', async (_event) => {
    return store.store;
  });

  // Fetch wrapper to bypass CORS in the renderer
  ipcMain.handle('fetch', async (_event, url: string, options?: RequestInit) => {
    try {
      console.log(`[IPC Fetch] Request initiated to: ${url}`);
      console.log(`[IPC Fetch] Options stringified: ${JSON.stringify(options)}`);

      // Add a timeout controller 
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

      const fetchOptions = {
        ...options,
        signal: controller.signal
      };

      const response = await net.fetch(url, fetchOptions as any);
      clearTimeout(timeoutId);

      console.log(`[IPC Fetch] Response received with status: ${response.status}`);

      const data = await response.text();
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: data
      };
    } catch (e: any) {
      console.error(`[IPC Fetch] Error caught during request:`, e);
      if (e.name === 'AbortError') {
        throw new Error('Connection timed out after 2 minutes.');
      }
      throw new Error(`Fetch failed: ${e.message || String(e)}`);
    }
  });

  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
