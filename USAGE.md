# TTS Discord - Usage Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Application**
   ```bash
   npm start
   ```

3. **Configure Settings**
   - Enter your TTS server address (e.g., `http://localhost:5002`)
   - Click "Browse" to select a directory with voice samples
   - Choose a voice from the dropdown

4. **Generate Speech**
   - Type your text in the text area
   - Click "Generate Speech"
   - Audio files are saved in `audio_output/` folder

## Chatterbox TTS Server Setup

The application requires a running Chatterbox TTS server. The server should expose an API endpoint:

```
POST /api/tts
Content-Type: application/json

{
  "text": "Your text here",
  "voice": "voice_sample.wav"
}
```

Response: Audio data in WAV format

## Voice Samples

Place your voice sample files in a directory. Supported formats:
- `.wav`
- `.mp3`
- `.ogg`
- `.flac`

The application will automatically detect and list these files in the dropdown.

## Discord Integration

### Windows
1. Download and install [VB-Audio Virtual Cable](https://vb-audio.com/Cable/)
2. Open Discord → Settings → Voice & Video
3. Set Input Device to "CABLE Output (VB-Audio Virtual Cable)" (or set Input Device to **Default** and make CABLE Output your Windows default input)
4. Make sure this app plays audio to "CABLE Input" (set per-app output device in Windows Volume Mixer)
5. Enable **Auto-play generated audio to Discord mic** in the app

### macOS
1. Install [BlackHole](https://github.com/ExistentialAudio/BlackHole)
2. Create a Multi-Output Device in Audio MIDI Setup
3. Set Discord input to BlackHole
4. Play audio through the Multi-Output Device

### Linux
This repo includes an automated PipeWire/PulseAudio setup that creates a virtual mic and makes Discord pick it up with no manual routing per-clip.

**Recommended (in-app):**
1. Click **Setup** under **Discord Mic Routing (Linux)**
2. In Discord → Settings → Voice & Video, set **Input Device** to **Default** (do this once)
3. Enable **Auto-play generated audio to Discord mic**
4. Generate speech — it will be injected into Discord automatically

**Terminal alternative:**
```bash
npm run discord:setup
npm run discord:teardown
```

Notes:
- The setup script creates a virtual sink and then exposes it as a *microphone source* (preferred: `tts_discord_sink_mic`; fallback: `tts_discord_sink.monitor`).
- Discord can either use **Input Device = Default** (recommended) or you can select **TTS Discord Mic** directly if it appears.
- Use **Restore** (or `npm run discord:teardown`) to switch your default input back.

Limitations:
- Windows/macOS cannot create new audio devices in software without installing a virtual audio driver (VB-Cable / BlackHole). This repo automates routing on Linux; on Windows/macOS, install the virtual device and then select it in Discord.

## Settings Persistence

The application automatically saves:
- TTS server address
- Voice samples directory path
- Selected voice sample

These settings are restored when you restart the application.

## Troubleshooting

### "No voice samples found"
- Check that your directory contains supported audio files
- Verify file permissions allow reading

### "Failed to generate speech"
- Ensure TTS server is running and accessible
- Check server address is correct
- Verify network connectivity

### Audio not playing in Discord
- Confirm virtual audio cable is installed
- Check Discord input device settings
- Test virtual cable with other audio sources

## Development

Run in development mode with DevTools open:
```bash
npm run dev
```

## File Structure

```
tts-discord/
├── main.js              # Electron main process
├── preload.js           # Secure IPC bridge
├── renderer.js          # UI logic
├── index.html           # Main interface
├── styles.css           # Styling
├── package.json         # Dependencies
├── audio_output/        # Generated audio (auto-created)
└── example_voices/      # Example voice samples directory
```

## API Reference

### electronAPI.selectDirectory()
Opens a directory picker dialog.

**Returns:** `Promise<string|null>` - Selected directory path or null

### electronAPI.getVoiceSamples(dirPath)
Reads audio files from a directory.

**Parameters:**
- `dirPath` (string) - Directory path

**Returns:** `Promise<string[]>` - Array of audio filenames

### electronAPI.sendTTSRequest(data)
Sends a TTS generation request.

**Parameters:**
- `data.text` (string) - Text to convert
- `data.voice` (string) - Voice sample filename
- `data.serverAddress` (string) - TTS server URL

**Returns:** `Promise<{success: boolean, audioPath?: string, error?: string}>`
