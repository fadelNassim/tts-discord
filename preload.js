const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendTTSRequest: (data) => ipcRenderer.invoke('send-tts-request', data),
  getServerVoices: (serverAddress) => ipcRenderer.invoke('get-server-voices', serverAddress),
  discordAudioSetup: (options) => ipcRenderer.invoke('discord-audio-setup', options),
  discordAudioTeardown: () => ipcRenderer.invoke('discord-audio-teardown'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  readAudioFileBase64: (audioPath) => ipcRenderer.invoke('read-audio-file-base64', audioPath)
});
