const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getVoiceSamples: (dirPath) => ipcRenderer.invoke('get-voice-samples', dirPath),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  sendTTSRequest: (data) => ipcRenderer.invoke('send-tts-request', data)
});
