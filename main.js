const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

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

ipcMain.handle('send-tts-request', async (event, data) => {
  const axios = require('axios');
  const { text, voice, serverAddress } = data;
  
  try {
    const response = await axios.post(`${serverAddress}/api/tts`, {
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
    console.error('TTS request failed:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to generate speech' 
    };
  }
});
