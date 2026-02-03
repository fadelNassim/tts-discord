const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { spawn, spawnSync } = require('child_process');

let mainWindow;

function runCommandCapture(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('error', (err) => {
      resolve({ ok: false, code: null, stdout, stderr: (stderr + String(err)).trim() });
    });

    child.on('close', (code) => {
      resolve({ ok: code === 0, code, stdout, stderr });
    });
  });
}

function hasCommand(cmd) {
  const result = spawnSync('sh', ['-c', `command -v ${cmd} >/dev/null 2>&1`], {
    stdio: 'ignore'
  });
  return result.status === 0;
}

function pulseSinkExists(sinkName) {
  if (!sinkName) return false;
  if (!hasCommand('pactl')) return null; // unknown
  const result = spawnSync('pactl', ['list', 'short', 'sinks'], { encoding: 'utf8' });
  if (result.status !== 0) return null;
  const out = String(result.stdout || '');
  return out.split(/\r?\n/).some(line => line.split(/\s+/)[1] === sinkName);
}

function getLinuxInstallHint() {
  if (hasCommand('apt-get') || hasCommand('apt')) {
    return "sudo apt-get update && sudo apt-get install -y pulseaudio-utils pipewire-pulse";
  }
  if (hasCommand('dnf')) {
    return "sudo dnf install -y pulseaudio-utils pipewire-pulseaudio";
  }
  if (hasCommand('pacman')) {
    return "sudo pacman -S --needed pulseaudio-utils pipewire-pulse";
  }
  if (hasCommand('zypper')) {
    return "sudo zypper install -y pulseaudio-utils pipewire-pulseaudio";
  }
  return "Install packages providing 'pactl' (pulseaudio-utils) and 'pipewire-pulse'";
}

async function runDiscordPulseScript(scriptName, { sinkName, monitorToSpeakers } = {}) {
  const scriptPath = path.join(__dirname, 'scripts', scriptName);
  if (!fs.existsSync(scriptPath)) {
    return { success: false, output: `Missing script: ${scriptPath}` };
  }

  const env = { ...process.env };
  if (sinkName) env.TTS_DISCORD_SINK = String(sinkName);
  if (monitorToSpeakers) env.TTS_DISCORD_MONITOR_TO_SPEAKERS = '1';

  const result = await runCommandCapture('bash', [scriptPath, sinkName ? String(sinkName) : ''], { env });
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
  return { success: result.ok, output: output || (result.ok ? 'OK' : 'Failed') };
}

function playWavToDiscordSinkNonBlocking(wavPath, sinkName) {
  const resolvedSinkName = String(sinkName || '').trim();
  if (!resolvedSinkName) {
    return { started: false, error: 'No sink name provided' };
  }

  const exists = pulseSinkExists(resolvedSinkName);
  if (exists === false) {
    return { started: false, error: `Sink not found: ${resolvedSinkName}. Click Setup (Linux) or create it manually.` };
  }

  const candidates = [];
  if (hasCommand('paplay')) {
    candidates.push({
      name: 'paplay',
      command: 'paplay',
      args: ['--device', resolvedSinkName, String(wavPath)],
      env: null
    });
  }
  if (hasCommand('pw-play')) {
    candidates.push({
      name: 'pw-play',
      command: 'pw-play',
      args: ['--target', resolvedSinkName, String(wavPath)],
      env: null
    });
  }
  if (hasCommand('ffplay')) {
    // ffplay doesn't have a stable "pick this sink" flag, but often respects PULSE_SINK.
    candidates.push({
      name: 'ffplay',
      command: 'ffplay',
      args: ['-nodisp', '-autoexit', '-loglevel', 'error', String(wavPath)],
      env: { PULSE_SINK: resolvedSinkName }
    });
  }
  if (hasCommand('aplay')) {
    // Last resort: plays to the system default ALSA device (no sink targeting).
    candidates.push({
      name: 'aplay',
      command: 'aplay',
      args: [String(wavPath)],
      env: null
    });
  }

  if (candidates.length === 0) {
    return { started: false, error: 'No audio player found (need paplay, pw-play, ffplay, or aplay)' };
  }

  const chosen = candidates[0];
  const child = spawn(chosen.command, chosen.args, {
    detached: true,
    stdio: 'ignore',
    env: chosen.env ? { ...process.env, ...chosen.env } : process.env
  });
  child.on('error', (err) => {
    console.warn(`[Discord] ${chosen.name} failed:`, err?.message || err);
  });
  child.unref();
  return { started: true, player: chosen.name, sinkName: resolvedSinkName };
}

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
  const headers = error?.response?.headers || {};
  const serverHeader = headers?.server || headers?.Server;
  const viaHeader = headers?.via || headers?.Via;
  const cfRay = headers?.['cf-ray'] || headers?.['CF-RAY'];
  const requestId = headers?.['x-request-id'] || headers?.['X-Request-Id'];

  const extraParts = [];
  if (serverHeader) extraParts.push(`server=${serverHeader}`);
  if (viaHeader) extraParts.push(`via=${viaHeader}`);
  if (cfRay) extraParts.push(`cf-ray=${cfRay}`);
  if (requestId) extraParts.push(`x-request-id=${requestId}`);
  const extra = extraParts.length ? ` (${extraParts.join(', ')})` : '';

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.detail) {
        return `HTTP ${status} ${statusText || ''}${extra} - ${parsed.detail}`.trim();
      }
    } catch {
      // Not JSON, fall through.
    }
  }

  if (status) {
    const snippet = raw ? String(raw).replace(/\s+/g, ' ').trim().slice(0, 500) : '';
    if (snippet) {
      return `HTTP ${status} ${statusText || ''}${extra} calling ${endpointUrl} - ${snippet}`.trim();
    }
    return `HTTP ${status} ${statusText || ''}${extra} calling ${endpointUrl}`.trim();
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

ipcMain.handle('get-platform', async () => {
  return { platform: process.platform };
});

ipcMain.handle('read-audio-file-base64', async (_event, audioPath) => {
  try {
    const buf = fs.readFileSync(String(audioPath));
    return { success: true, base64: buf.toString('base64') };
  } catch (e) {
    return { success: false, error: e?.message || String(e) };
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

ipcMain.handle('discord-audio-setup', async (_event, options) => {
  const selected = String(options?.os || 'auto').trim().toLowerCase();
  const platform = process.platform;
  const osMode = selected === 'auto'
    ? (platform === 'win32' ? 'windows' : platform === 'darwin' ? 'macos' : 'linux')
    : selected;

  const sinkName = options?.sinkName;
  const monitorToSpeakers = options?.monitorToSpeakers;

  if (osMode === 'linux') {
    if (!hasCommand('pactl')) {
      const installCmd = getLinuxInstallHint();
      return {
        success: false,
        output: [
          "Linux setup requires 'pactl' (PulseAudio/pipewire-pulse client tools) to create a virtual sink and set Discord's input source.",
          `Install it, then retry Setup. Suggested command:`,
          installCmd
        ].join('\n')
      };
    }
    return runDiscordPulseScript('discord_pulse_setup.sh', { sinkName, monitorToSpeakers });
  }

  if (osMode === 'windows') {
    const hint = String(options?.windowsCableHint || 'CABLE').trim();
    return {
      success: true,
      requiresUserAction: true,
      output: [
        "Windows cannot create a new audio 'sink' device without installing a virtual audio driver.",
        "Install VB-Audio Virtual Cable (VB-Cable), then:",
        `- Discord → Settings → Voice & Video → Input Device = 'CABLE Output' (or set Input Device = Default and make CABLE Output the Windows default input)`,
        `- Ensure this app outputs audio to 'CABLE Input' (Windows Volume Mixer / per-app output)`,
        `- Then enable 'Auto-play generated audio to Discord mic' in this app`,
        hint ? `Tip: look for devices containing '${hint}' in Windows Sound settings.` : null
      ].filter(Boolean).join('\n')
    };
  }

  if (osMode === 'macos') {
    return {
      success: true,
      requiresUserAction: true,
      output: [
        "macOS requires a virtual audio driver to create a device Discord can use.",
        "Install BlackHole, then set Discord Input Device to BlackHole and route this app's output to it.",
        "(Automation for device creation isn't provided by the OS.)"
      ].join('\n')
    };
  }

  return { success: false, output: `Unsupported OS mode: ${osMode}` };
});

ipcMain.handle('discord-audio-teardown', async () => {
  if (process.platform === 'linux') {
    return runDiscordPulseScript('discord_pulse_teardown.sh');
  }
  return {
    success: true,
    requiresUserAction: false,
    output: 'Nothing to restore on this OS (Linux-only virtual sink teardown).' 
  };
});

ipcMain.handle('send-tts-request', async (event, data) => {
  const { text, voice, serverAddress, discord } = data;
  
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

    let discordPlayback = null;

    if (discord?.autoPlay === true) {
      try {
        const selected = String(discord?.os || 'auto').trim().toLowerCase();
        const platform = process.platform;
        const osMode = selected === 'auto'
          ? (platform === 'win32' ? 'windows' : platform === 'darwin' ? 'macos' : 'linux')
          : selected;

        // On Windows/macOS, prefer in-app playback (so the OS can route this app's output to VB-Cable/BlackHole).
        if (osMode === 'windows' || osMode === 'macos') {
          discordPlayback = {
            started: true,
            player: 'electron',
            playInApp: true,
            note: 'Playing in-app. Route this app output device to your virtual cable in OS settings.'
          };
        } else {
          discordPlayback = playWavToDiscordSinkNonBlocking(
            outputPath,
            discord?.sinkName || process.env.TTS_DISCORD_SINK || 'tts_discord_sink'
          );
        }
      } catch (e) {
        console.warn('[Discord] Auto-play failed:', e?.message || e);
        discordPlayback = { started: false, error: e?.message || String(e) };
      }
    }
    
    return { success: true, audioPath: outputPath, discordPlayback };
  } catch (error) {
    const endpointUrl = buildApiUrl(serverAddress, '/api/tts');
    console.error('TTS request failed:', error);
    return { 
      success: false, 
      error: formatAxiosError(error, endpointUrl)
    };
  }
});
