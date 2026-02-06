// DOM elements
const serverAddressInput = document.getElementById('serverAddress');
const voiceSelect = document.getElementById('voiceSelect');
const refreshVoicesBtn = document.getElementById('refreshVoicesBtn');
const textInput = document.getElementById('textInput');
const generateBtn = document.getElementById('generateBtn');
const statusMessage = document.getElementById('statusMessage');
const playbackStatus = document.getElementById('playbackStatus');
const discordAutoPlayCheckbox = document.getElementById('discordAutoPlay');
const discordSinkNameInput = document.getElementById('discordSinkName');
const discordSetupBtn = document.getElementById('discordSetupBtn');
const discordTeardownBtn = document.getElementById('discordTeardownBtn');
const discordOsModeSelect = document.getElementById('discordOsMode');
const discordWindowsCableInput = document.getElementById('discordWindowsCable');
const languageSelect = document.getElementById('languageSelect');
const emotionSelect = document.getElementById('emotionSelect');
const voiceDescriptionInput = document.getElementById('voiceDescription');
const referenceUploadInput = document.getElementById('referenceUploadInput');
const uploadReferenceBtn = document.getElementById('uploadReferenceBtn');
const referenceUploadNameInput = document.getElementById('referenceUploadName');
const overwriteReferenceCheckbox = document.getElementById('overwriteReference');

// State
let voiceSamples = [];

let currentAudio = null;

function setPlaybackStatus(message, type) {
  if (!playbackStatus) return;
  const safeType = type || 'idle';
  playbackStatus.className = `playback-status ${safeType}`;
  playbackStatus.textContent = message || 'Playback: idle';
}

async function playInAppWavFile(audioPath) {
  const result = await window.electronAPI.readAudioFileBase64(audioPath);
  if (!result?.success) {
    throw new Error(result?.error || 'Failed to read audio file');
  }

  const binary = atob(result.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);

  if (currentAudio) {
    try { currentAudio.pause(); } catch {}
    currentAudio = null;
  }

  const audio = new Audio(url);
  currentAudio = audio;

  setPlaybackStatus('Playback: playing in app…', 'playing');
  audio.onended = () => {
    URL.revokeObjectURL(url);
    setPlaybackStatus('Playback: finished', 'sent');
  };
  audio.onerror = () => {
    URL.revokeObjectURL(url);
    setPlaybackStatus('Playback: error (failed to decode/play)', 'error');
  };
  await audio.play();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
  // Keyboard-first flow
  try { textInput?.focus(); } catch {}
});

function loadCachedVoices() {
  try {
    const raw = localStorage.getItem('cachedVoices');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : null;
  } catch {
    return null;
  }
}

function saveCachedVoices(voices) {
  try {
    if (Array.isArray(voices) && voices.length) {
      localStorage.setItem('cachedVoices', JSON.stringify(voices));
    }
  } catch {
    // ignore
  }
}

function populateVoiceSelect(voices, { placeholder } = {}) {
  voiceSelect.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = placeholder || `Select a voice (${voices.length} available)`;
  voiceSelect.appendChild(defaultOption);

  voices.forEach(sample => {
    const option = document.createElement('option');
    option.value = sample;
    option.textContent = sample;
    voiceSelect.appendChild(option);
  });

  voiceSelect.disabled = false;
}

// Load saved settings from localStorage
function loadSettings() {
  const savedServerAddress = localStorage.getItem('serverAddress');
  
  if (savedServerAddress) {
    serverAddressInput.value = savedServerAddress;
  }

  const savedDiscordAutoPlay = localStorage.getItem('discordAutoPlay');
  if (savedDiscordAutoPlay !== null) {
    discordAutoPlayCheckbox.checked = savedDiscordAutoPlay === 'true';
  }

  const savedDiscordSinkName = localStorage.getItem('discordSinkName');
  if (savedDiscordSinkName) {
    discordSinkNameInput.value = savedDiscordSinkName;
  }

  const savedDiscordOsMode = localStorage.getItem('discordOsMode');
  if (savedDiscordOsMode) {
    discordOsModeSelect.value = savedDiscordOsMode;
  }

  const savedDiscordWindowsCable = localStorage.getItem('discordWindowsCable');
  if (savedDiscordWindowsCable) {
    discordWindowsCableInput.value = savedDiscordWindowsCable;
  }

  const savedLanguage = localStorage.getItem('selectedLanguage');
  if (savedLanguage && languageSelect) {
    languageSelect.value = savedLanguage;
  }

  const savedEmotion = localStorage.getItem('selectedEmotion');
  if (savedEmotion && emotionSelect) {
    emotionSelect.value = savedEmotion;
  }

  const savedVoiceDescription = localStorage.getItem('voiceDescription');
  if (savedVoiceDescription !== null && voiceDescriptionInput) {
    voiceDescriptionInput.value = savedVoiceDescription;
  }

  const serverAddress = serverAddressInput.value.trim();
  if (serverAddress) {
    // Fast path: show cached voices instantly, then refresh from server.
    const cached = loadCachedVoices();
    const savedVoice = localStorage.getItem('selectedVoice');
    if (cached && cached.length) {
      populateVoiceSelect(cached, { placeholder: `Select a voice (cached: ${cached.length})` });
      if (savedVoice && cached.includes(savedVoice)) {
        voiceSelect.value = savedVoice;
      }
    }
    loadServerVoices(serverAddress);
  }
}

// Save settings to localStorage
function saveSettings() {
  // Normalize common user input: trailing slashes can lead to //api/tts
  if (serverAddressInput.value) {
    serverAddressInput.value = serverAddressInput.value.trim().replace(/\/+$/, '');
  }
  localStorage.setItem('serverAddress', serverAddressInput.value);
  if (voiceSelect.value) {
    localStorage.setItem('selectedVoice', voiceSelect.value);
  }

  localStorage.setItem('discordAutoPlay', String(!!discordAutoPlayCheckbox.checked));
  if (discordSinkNameInput.value) {
    localStorage.setItem('discordSinkName', discordSinkNameInput.value.trim());
  }

  if (discordOsModeSelect.value) {
    localStorage.setItem('discordOsMode', discordOsModeSelect.value);
  }

  if (discordWindowsCableInput.value) {
    localStorage.setItem('discordWindowsCable', discordWindowsCableInput.value.trim());
  }

  if (languageSelect && languageSelect.value) {
    localStorage.setItem('selectedLanguage', languageSelect.value);
  }

  if (emotionSelect && emotionSelect.value) {
    localStorage.setItem('selectedEmotion', emotionSelect.value);
  }

  if (voiceDescriptionInput) {
    localStorage.setItem('voiceDescription', String(voiceDescriptionInput.value || ''));
  }
}

// Setup event listeners
function setupEventListeners() {
  refreshVoicesBtn.addEventListener('click', handleRefreshVoices);
  generateBtn.addEventListener('click', handleGenerateSpeech);
  discordSetupBtn.addEventListener('click', handleDiscordSetup);
  discordTeardownBtn.addEventListener('click', handleDiscordTeardown);
  if (uploadReferenceBtn) {
    uploadReferenceBtn.addEventListener('click', handleUploadReference);
  }

  // Enter to generate, Shift+Enter for newline (textarea).
  textInput.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (e.key !== 'Enter') return;
    if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
    // Avoid double-trigger while generating.
    if (generateBtn.disabled) return;
    e.preventDefault();
    handleGenerateSpeech();
  });

  // Global shortcuts (chosen to avoid common browser/Electron conflicts)
  document.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (!(e.ctrlKey && e.altKey)) return;
    const key = String(e.key || '').toLowerCase();

    if (key === 't') {
      e.preventDefault();
      try { textInput.focus(); } catch {}
      return;
    }
    if (key === 'v') {
      e.preventDefault();
      try { voiceSelect.focus(); } catch {}
      return;
    }
    if (key === 's') {
      e.preventDefault();
      try { serverAddressInput.focus(); } catch {}
      return;
    }
    if (key === 'g') {
      e.preventDefault();
      if (!generateBtn.disabled) handleGenerateSpeech();
    }
  });
  
  serverAddressInput.addEventListener('change', () => {
    saveSettings();
    const serverAddress = serverAddressInput.value.trim();
    if (serverAddress) {
      loadServerVoices(serverAddress);
    }
  });
  voiceSelect.addEventListener('change', saveSettings);
  discordAutoPlayCheckbox.addEventListener('change', saveSettings);
  discordSinkNameInput.addEventListener('change', saveSettings);
  discordOsModeSelect.addEventListener('change', saveSettings);
  discordWindowsCableInput.addEventListener('change', saveSettings);
  if (languageSelect) {
    languageSelect.addEventListener('change', saveSettings);
  }
  if (emotionSelect) {
    emotionSelect.addEventListener('change', saveSettings);
  }
  if (voiceDescriptionInput) {
    voiceDescriptionInput.addEventListener('change', saveSettings);
  }
}

async function handleUploadReference() {
  const serverAddress = serverAddressInput.value.trim();
  if (!serverAddress) {
    showStatus('Please enter a server address first', 'error');
    return;
  }

  const file = referenceUploadInput?.files?.[0];
  if (!file) {
    showStatus('Please choose an audio file to upload', 'error');
    return;
  }

  const desiredName = (referenceUploadNameInput?.value || '').trim();
  const overwrite = !!overwriteReferenceCheckbox?.checked;

  uploadReferenceBtn.disabled = true;
  const oldLabel = uploadReferenceBtn.textContent;
  uploadReferenceBtn.textContent = '⏳ Uploading...';

  try {
    showStatus('Uploading reference audio to server...', 'loading');
    saveSettings();

    const payload = {
      serverAddress,
      fileName: file.name,
      name: desiredName,
      overwrite
    };

    // Electron usually exposes file.path for <input type="file">.
    if (file.path) {
      payload.filePath = file.path;
    } else if (typeof file.arrayBuffer === 'function') {
      payload.bytes = await file.arrayBuffer();
    } else {
      throw new Error('Unable to read selected file');
    }

    const result = await window.electronAPI.uploadReferenceAudio(payload);
    if (!result?.success) {
      showStatus(`❌ Upload failed: ${result?.error || 'unknown error'}`, 'error');
      return;
    }

    // Refresh the voice list so the new reference appears.
    await loadServerVoices(serverAddress);

    if (result.filename && voiceSamples && voiceSamples.includes(result.filename)) {
      voiceSelect.value = result.filename;
      localStorage.setItem('selectedVoice', result.filename);
    }

    const duration = typeof result.duration === 'number' ? ` (${result.duration.toFixed(1)}s)` : '';
    showStatus(`✅ Uploaded reference: ${result.filename || 'unknown'}${duration}`, 'success');

    // Reset the chooser for quick re-uploads.
    if (referenceUploadInput) referenceUploadInput.value = '';
  } catch (e) {
    showStatus(`❌ Upload error: ${e.message}`, 'error');
  } finally {
    uploadReferenceBtn.disabled = false;
    uploadReferenceBtn.textContent = oldLabel || 'Upload';
  }
}

async function handleDiscordSetup() {
  const sinkName = (discordSinkNameInput.value || '').trim() || 'tts_discord_sink';
  const osMode = (discordOsModeSelect.value || 'auto').trim();
  const windowsCableHint = (discordWindowsCableInput.value || '').trim();
  showStatus('Setting up Discord virtual mic...', 'loading');
  discordSetupBtn.disabled = true;
  try {
    const result = await window.electronAPI.discordAudioSetup({
      os: osMode,
      sinkName,
      windowsCableHint,
      monitorToSpeakers: false
    });
    if (result?.success) {
      const prefix = result?.requiresUserAction ? 'ℹ️' : '✅';
      showStatus(`${prefix} Discord audio setup.\n${result.output || ''}`.trim(), 'success');
    } else {
      showStatus(`❌ Discord setup failed.\n${result?.output || ''}`.trim(), 'error');
    }
  } catch (e) {
    showStatus(`❌ Discord setup error: ${e.message}`, 'error');
  } finally {
    discordSetupBtn.disabled = false;
  }
}

async function handleDiscordTeardown() {
  showStatus('Restoring audio defaults...', 'loading');
  discordTeardownBtn.disabled = true;
  try {
    const result = await window.electronAPI.discordAudioTeardown();
    if (result?.success) {
      showStatus(`✅ Audio defaults restored.\n${result.output || ''}`.trim(), 'success');
    } else {
      showStatus(`❌ Restore failed.\n${result?.output || ''}`.trim(), 'error');
    }
  } catch (e) {
    showStatus(`❌ Restore error: ${e.message}`, 'error');
  } finally {
    discordTeardownBtn.disabled = false;
  }
}

async function handleRefreshVoices() {
  const serverAddress = serverAddressInput.value.trim();
  if (!serverAddress) {
    showStatus('Please enter a server address first', 'error');
    return;
  }

  saveSettings();
  await loadServerVoices(serverAddress);
}

async function loadServerVoices(serverAddress) {
  try {
    showStatus('Loading voices from server...', 'loading');
    const samples = await window.electronAPI.getServerVoices(serverAddress);
    voiceSamples = samples;

    voiceSelect.innerHTML = '';
    if (!samples || samples.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No voices found on server';
      voiceSelect.appendChild(option);
      voiceSelect.disabled = true;
      showStatus('No valid voices found on server. Add 5s+ audio files to the server references/ directory.', 'error');
      return;
    }

    populateVoiceSelect(samples, { placeholder: `Select a voice (${samples.length} available on server)` });
    saveCachedVoices(samples);
    showStatus(`Loaded ${samples.length} server voice(s)`, 'success');

    const savedVoice = localStorage.getItem('selectedVoice');
    if (savedVoice && samples.includes(savedVoice)) {
      voiceSelect.value = savedVoice;
    }
  } catch (error) {
    const cached = loadCachedVoices();
    if (cached && cached.length) {
      populateVoiceSelect(cached, { placeholder: `Select a voice (cached: ${cached.length})` });
      const savedVoice = localStorage.getItem('selectedVoice');
      if (savedVoice && cached.includes(savedVoice)) {
        voiceSelect.value = savedVoice;
      }
      showStatus(`⚠️ Server unreachable; using cached voices. (${error.message})`, 'error');
    } else {
      showStatus('Error loading server voices: ' + error.message, 'error');
      voiceSelect.disabled = true;
    }
  }
}

// Handle speech generation
async function handleGenerateSpeech() {
  // Validate inputs
  const text = textInput.value.trim();
  const voice = voiceSelect.value;
  const language = (languageSelect ? languageSelect.value : 'Auto') || 'Auto';
  const emotion = (emotionSelect ? emotionSelect.value : 'Neutral') || 'Neutral';
  const voiceDescription = (voiceDescriptionInput ? voiceDescriptionInput.value : '') || '';
  const serverAddress = serverAddressInput.value.trim();
  
  if (!text) {
    showStatus('Please enter text to speak', 'error');
    return;
  }
  
  if (!voice) {
    showStatus('Please select a voice sample', 'error');
    return;
  }
  
  if (!serverAddress) {
    showStatus('Please enter a server address', 'error');
    return;
  }
  
  // Disable button and show loading
  generateBtn.disabled = true;
  generateBtn.textContent = '⏳ Generating...';
  showStatus('Connecting to TTS server...', 'loading');
  setPlaybackStatus('Playback: preparing…', 'idle');
  
  try {
    // Send TTS request
    saveSettings();
    const result = await window.electronAPI.sendTTSRequest({
      text: text,
      voice: voice,
      language: language,
      emotion: String(emotion || 'Neutral').trim() || 'Neutral',
      voiceDescription: String(voiceDescription || '').trim(),
      serverAddress: serverAddress,
      discord: {
        autoPlay: !!discordAutoPlayCheckbox.checked,
        os: (discordOsModeSelect.value || 'auto').trim(),
        sinkName: (discordSinkNameInput.value || '').trim() || 'tts_discord_sink'
      }
    });
    
    if (result.success) {
      const playback = result.discordPlayback;
      if (discordAutoPlayCheckbox.checked && playback && playback.started === false) {
        setPlaybackStatus(`Playback: error (${playback.error || 'unknown'})`, 'error');
        showStatus(
          `⚠️ Speech generated, but Discord auto-play failed: ${playback.error || 'unknown error'}\nAudio saved to: ${result.audioPath}`,
          'error'
        );
      } else if (discordAutoPlayCheckbox.checked && playback && playback.started === true) {
        if (playback.playInApp === true) {
          try {
            await playInAppWavFile(result.audioPath);
          } catch (e) {
            setPlaybackStatus(`Playback: error (${e.message})`, 'error');
            showStatus(
              `⚠️ Speech generated, but in-app playback failed: ${e.message}\nAudio saved to: ${result.audioPath}`,
              'error'
            );
            localStorage.setItem('selectedVoice', voice);
            return;
          }
        } else {
          setPlaybackStatus(`Playback: sent via ${playback.player || 'player'}`, 'sent');
        }
        showStatus(
          `✅ Speech generated and sent to Discord (${playback.player}). Audio saved to: ${result.audioPath}`,
          'success'
        );
      } else {
        setPlaybackStatus('Playback: not sent (auto-play off)', 'idle');
        showStatus(`✅ Speech generated successfully! Audio saved to: ${result.audioPath}`, 'success');
      }
      localStorage.setItem('selectedVoice', voice);
    } else {
      setPlaybackStatus('Playback: error (generation failed)', 'error');
      showStatus(`❌ Failed to generate speech: ${result.error}`, 'error');
    }
  } catch (error) {
    showStatus(`❌ Error: ${error.message}`, 'error');
  } finally {
    // Re-enable button
    generateBtn.disabled = false;
    generateBtn.textContent = '🔊 Generate';
  }
}

// Show status message
let statusHideTimer = null;
function showStatus(message, type) {
  if (statusHideTimer) {
    clearTimeout(statusHideTimer);
    statusHideTimer = null;
  }

  statusMessage.textContent = message;
  statusMessage.className = 'status-message ' + type;
  statusMessage.style.display = 'block';
  
  // Auto-hide success messages after 5 seconds
  // Keep Discord setup/restore confirmations visible.
  const shouldAutoHide = type === 'success' && /^✅\s*Speech generated/i.test(String(message || ''));
  if (shouldAutoHide) {
    statusHideTimer = setTimeout(() => {
      statusMessage.style.display = 'none';
      statusHideTimer = null;
    }, 5000);
  }
}
