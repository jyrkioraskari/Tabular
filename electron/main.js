import { app, BrowserWindow, dialog, shell } from 'electron';
import { startTabularRdmServer } from '../server.js';

let mainWindow;
let localServer;
let applicationUrl;

async function createWindow() {
  if (!applicationUrl) {
    const { server, url } = await startTabularRdmServer({ port: 0, host: '127.0.0.1' });
    localServer = server;
    applicationUrl = url;
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'TabularRDM',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (targetUrl.startsWith('https://') || targetUrl.startsWith('http://')) {
      shell.openExternal(targetUrl);
    }

    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (!targetUrl.startsWith(applicationUrl)) {
      event.preventDefault();
      if (targetUrl.startsWith('https://') || targetUrl.startsWith('http://')) {
        shell.openExternal(targetUrl);
      }
    }
  });

  await mainWindow.loadURL(applicationUrl);
}

app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (error) {
    dialog.showErrorBox(
      'TabularRDM could not start',
      error?.message || 'The local application service could not be started.',
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  localServer?.close();
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});
