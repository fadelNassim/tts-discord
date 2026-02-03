// DOM elements
const serverAddressInput = document.getElementById('serverAddress');
const voiceDirInput = document.getElementById('voiceDir');
const browseDirBtn = document.getElementById('browseDirBtn');
const voiceSelect = document.getElementById('voiceSelect');
const textInput = document.getElementById('textInput');
const generateBtn = document.getElementById('generateBtn');
const statusMessage = document.getElementById('statusMessage');

// State
let currentVoiceDir = '';
let voiceSamples = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
});

// Load saved settings from localStorage
function loadSettings() {
  const savedServerAddress = localStorage.getItem('serverAddress');
  const savedVoiceDir = localStorage.getItem('voiceDir');
  
  if (savedServerAddress) {
    serverAddressInput.value = savedServerAddress;
  }
  
  if (savedVoiceDir) {
    voiceDirInput.value = savedVoiceDir;
    currentVoiceDir = savedVoiceDir;
    loadVoiceSamples(savedVoiceDir);
  }
}

// Save settings to localStorage
function saveSettings() {
  localStorage.setItem('serverAddress', serverAddressInput.value);
  localStorage.setItem('voiceDir', currentVoiceDir);
}

// Setup event listeners
function setupEventListeners() {
  browseDirBtn.addEventListener('click', handleBrowseDirectory);
  generateBtn.addEventListener('click', handleGenerateSpeech);
  
  serverAddressInput.addEventListener('change', saveSettings);
  voiceSelect.addEventListener('change', saveSettings);
}

// Handle directory browsing
async function handleBrowseDirectory() {
  try {
    const dirPath = await window.electronAPI.selectDirectory();
    
    if (dirPath) {
      currentVoiceDir = dirPath;
      voiceDirInput.value = dirPath;
      saveSettings();
      await loadVoiceSamples(dirPath);
    }
  } catch (error) {
    showStatus('Error selecting directory: ' + error.message, 'error');
  }
}

// Load voice samples from directory
async function loadVoiceSamples(dirPath) {
  try {
    showStatus('Loading voice samples...', 'loading');
    
    const samples = await window.electronAPI.getVoiceSamples(dirPath);
    voiceSamples = samples;
    
    // Clear and populate dropdown
    voiceSelect.innerHTML = '';
    
    if (samples.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No voice samples found in directory';
      voiceSelect.appendChild(option);
      voiceSelect.disabled = true;
      showStatus('No voice samples found. Add .wav, .mp3, .ogg, or .flac files to the directory.', 'error');
    } else {
      // Add default option
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = `Select a voice (${samples.length} available)`;
      voiceSelect.appendChild(defaultOption);
      
      // Add voice samples
      samples.forEach(sample => {
        const option = document.createElement('option');
        option.value = sample;
        option.textContent = sample;
        voiceSelect.appendChild(option);
      });
      
      voiceSelect.disabled = false;
      showStatus(`Loaded ${samples.length} voice sample(s)`, 'success');
      
      // Auto-select first voice if available
      if (samples.length > 0) {
        const savedVoice = localStorage.getItem('selectedVoice');
        if (savedVoice && samples.includes(savedVoice)) {
          voiceSelect.value = savedVoice;
        }
      }
    }
  } catch (error) {
    showStatus('Error loading voice samples: ' + error.message, 'error');
    voiceSelect.disabled = true;
  }
}

// Handle speech generation
async function handleGenerateSpeech() {
  // Validate inputs
  const text = textInput.value.trim();
  const voice = voiceSelect.value;
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
  
  try {
    // Send TTS request
    const result = await window.electronAPI.sendTTSRequest({
      text: text,
      voice: voice,
      serverAddress: serverAddress
    });
    
    if (result.success) {
      showStatus(`✅ Speech generated successfully! Audio saved to: ${result.audioPath}`, 'success');
      localStorage.setItem('selectedVoice', voice);
    } else {
      showStatus(`❌ Failed to generate speech: ${result.error}`, 'error');
    }
  } catch (error) {
    showStatus(`❌ Error: ${error.message}`, 'error');
  } finally {
    // Re-enable button
    generateBtn.disabled = false;
    generateBtn.textContent = '🔊 Generate Speech';
  }
}

// Show status message
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = 'status-message ' + type;
  
  // Auto-hide success messages after 5 seconds
  if (type === 'success') {
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 5000);
  }
}
