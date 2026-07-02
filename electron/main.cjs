const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('node:path');

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL);
const appIconPath = path.join(__dirname, '..', 'assets', 'icon.png');

if (process.platform === 'win32') {
  app.setAppUserModelId('pro.imon.desktop');
}

function normalizeRequestUrl(url, baseUrl) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (url.startsWith('/')) {
    return new URL(url, baseUrl).toString();
  }

  return `http://${url}`;
}

function hasHeader(headers, headerName) {
  return Object.keys(headers).some((key) => key.toLowerCase() === headerName.toLowerCase());
}

function createRequestBody(data, headers) {
  if (data == null) {
    return undefined;
  }

  if (typeof data === 'string' || data instanceof Buffer) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }

  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }

  if (!hasHeader(headers, 'content-type')) {
    headers['Content-Type'] = 'application/json';
  }

  return JSON.stringify(data);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#ffffff',
    icon: appIconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

ipcMain.handle('http:request', async (event, request) => {
  const { url, method = 'GET', headers, data, responseType, timeout } = request;
  const requestHeaders = { ...(headers || {}) };
  const body = createRequestBody(data, requestHeaders);
  const senderUrl = event.senderFrame?.url || event.sender.getURL();
  const baseUrl = /^https?:\/\//i.test(senderUrl) ? senderUrl : 'http://127.0.0.1';
  const controller = timeout ? new AbortController() : undefined;
  const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : undefined;

  try {
    const response = await fetch(normalizeRequestUrl(url, baseUrl), {
      method,
      headers: requestHeaders,
      body,
      signal: controller?.signal
    });

    const responseHeaders = Object.fromEntries(response.headers.entries());
    const contentType = response.headers.get('content-type') || '';
    const expectsBinary = responseType === 'blob' || responseType === 'arraybuffer';
    let payload;

    if (expectsBinary) {
      const buffer = Buffer.from(await response.arrayBuffer());
      payload = {
        __electronBinary: true,
        base64: buffer.toString('base64'),
        type: contentType
      };
    } else {
      const text = await response.text();
      if (text && contentType.includes('application/json')) {
        payload = JSON.parse(text);
      } else {
        try {
          payload = text ? JSON.parse(text) : null;
        } catch {
          payload = text;
        }
      }
    }

    return {
      data: payload,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      ok: response.ok
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
