const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

let mainWindow;

function normalizeServerBaseUrl(rawAddress) {
  const trimmed = String(rawAddress || '').trim();
  if (!trimmed) {
    throw new Error('Server address is empty');
  }

  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed);
  const withScheme = hasScheme ? trimmed : `http://${trimmed}`;

  const url = new URL(withScheme);
  // Ensure we don't accidentally keep a trailing slash or extra path.
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url;
}

function buildApiUrl(serverAddress, path) {
  const baseUrl = normalizeServerBaseUrl(serverAddress);
  return new URL(path, baseUrl).toString();
}

function decodeAxiosErrorData(data) {
  if (!data) return null;
  try {
    if (Buffer.isBuffer(data)) {
      return data.toString('utf8');
    }
    if (data instanceof ArrayBuffer) {
      return Buffer.from(data).toString('utf8');
    }
    if (ArrayBuffer.isView(data)) {
      return Buffer.from(data.buffer).toString('utf8');
    }
    if (typeof data === 'string') {
      return data;
    }
    if (typeof data === 'object') {
      return JSON.stringify(data);
    }
  } catch {
    return null;
  }
  return null;
}

function formatAxiosError(error, endpointUrl) {
  const status = error?.response?.status;
  const statusText = error?.response?.statusText;
  const raw = decodeAxiosErrorData(error?.response?.data);

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.detail) {
        return `HTTP ${status} ${statusText || ''} - ${parsed.detail}`.trim();
      }
    } catch {
      // Not JSON, fall through.
    }
  }

  if (status) {
    return `HTTP ${status} ${statusText || ''} calling ${endpointUrl}`.trim();
  }

  return error?.message || `Request failed calling ${endpointUrl}`;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'TTS Discord',
    resizable: true,
    autoHideMenuBar: true
  });

  mainWindow.loadFile('index.html');
  
  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
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

// IPC handlers
ipcMain.handle('get-voice-samples', async (event, dirPath) => {
  try {
    if (!dirPath || !fs.existsSync(dirPath)) {
      return [];
    }
    
    const files = fs.readdirSync(dirPath);
    const audioFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.wav', '.mp3', '.ogg', '.flac'].includes(ext);
    });
    
    return audioFiles;
  } catch (error) {
    console.error('Error reading voice samples:', error);
    return [];
  }
});

ipcMain.handle('select-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  } catch (error) {
    console.error('Error selecting directory:', error);
    return null;
  }
});

ipcMain.handle('get-server-voices', async (event, serverAddress) => {
  try {
    const listUrl = buildApiUrl(serverAddress, '/list-voices');
    const response = await axios.get(listUrl, { timeout: 10000 });
    const voices = response?.data?.voices;

    if (!Array.isArray(voices)) {
      return [];
    }

    // Prefer valid voices, but fall back to any filenames if validity isn't provided.
    const valid = voices.filter(v => v && v.valid === true && typeof v.filename === 'string');
    if (valid.length > 0) {
      return valid.map(v => v.filename);
    }

    return voices
      .filter(v => v && typeof v.filename === 'string')
      .map(v => v.filename);
  } catch (error) {
    const listUrl = buildApiUrl(serverAddress, '/list-voices');
    console.error('Fetching server voices failed:', error);
    throw new Error(formatAxiosError(error, listUrl));
  }
});

ipcMain.handle('send-tts-request', async (event, data) => {
  const { text, voice, serverAddress } = data;
  
  try {
    const endpointUrl = buildApiUrl(serverAddress, '/api/tts');
    const response = await axios.post(endpointUrl, {
      text: text,
      voice: voice
    }, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    // Save audio to temporary file
    const outputDir = path.join(__dirname, 'audio_output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    const outputPath = path.join(outputDir, `tts_${Date.now()}.wav`);
    fs.writeFileSync(outputPath, Buffer.from(response.data));
    
    return { success: true, audioPath: outputPath };
  } catch (error) {
    const endpointUrl = buildApiUrl(serverAddress, '/api/tts');
    console.error('TTS request failed:', error);
    return { 
      success: false, 
      error: formatAxiosError(error, endpointUrl)
    };
  }
});
