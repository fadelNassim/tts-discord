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
3. Set Input Device to "CABLE Output (VB-Audio Virtual Cable)"
4. Use a media player to play generated audio to "CABLE Input"

### macOS
1. Install [BlackHole](https://github.com/ExistentialAudio/BlackHole)
2. Create a Multi-Output Device in Audio MIDI Setup
3. Set Discord input to BlackHole
4. Play audio through the Multi-Output Device

### Linux
1. Create a virtual sink with PulseAudio:
   ```bash
   pactl load-module module-null-sink sink_name=virtual_speaker
   ```
2. Set Discord input to the virtual sink monitor
3. Play audio to the virtual sink

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
