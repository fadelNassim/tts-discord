# TTS Discord 🎙️

A desktop application for Text-to-Speech with voice cloning capabilities, designed to work seamlessly with Discord using virtual audio cables.

## Features

- 🎵 **Text-to-Speech Generation** - Convert text to speech using a local Chatterbox TTS server
- 🎭 **Voice Cloning** - Import and use voice samples for voice duplication
- 📁 **Voice Sample Management** - Easy dropdown to select from local voice samples
- 🌐 **Configurable TTS Server** - Connect to your local or remote Chatterbox TTS server
- 🎮 **Discord Integration** - Use generated audio as input in Discord via virtual audio cable
- 🖥️ **User-Friendly UI** - Clean, Discord-themed interface that's easy to use

## Prerequisites

1. **Node.js** (v16 or higher)
2. **Chatterbox TTS Server** running locally (default: http://localhost:5002)
3. **Virtual Audio Cable** (for Discord integration):
   - Windows: [VB-Audio Virtual Cable](https://vb-audio.com/Cable/)
   - macOS: [BlackHole](https://github.com/ExistentialAudio/BlackHole)
   - Linux: PulseAudio virtual sink

## Installation

1. Clone this repository:
```bash
git clone https://github.com/fadelNassim/tts-discord.git
cd tts-discord
```

2. Install dependencies:
```bash
npm install
```

## Usage

1. **Start the application:**
```bash
npm start
```

2. **Configure the TTS Server:**
   - Enter your Chatterbox TTS server address (default: http://localhost:5002)

3. **Select Voice Samples:**
   - Click "Browse" to select a directory containing voice sample files
   - Supported formats: .wav, .mp3, .ogg, .flac
   - Select a voice from the dropdown

4. **Generate Speech:**
   - Type the text you want to convert to speech
   - Click "Generate Speech"
   - Audio files are saved in the `audio_output` folder

## Discord Integration

To use the generated audio with Discord:

1. **Install a Virtual Audio Cable** (see Prerequisites)

2. **Configure Discord:**
   - Open Discord Settings → Voice & Video
   - Set your Input Device to the virtual audio cable

3. **Play Generated Audio:**
   - Use any audio player to play the generated audio file
   - Route the audio player's output to the virtual audio cable input
   - Your voice will be heard in Discord voice channels

## Project Structure

```
tts-discord/
├── main.js           # Electron main process
├── preload.js        # Preload script for IPC
├── index.html        # Main UI
├── styles.css        # Application styles
├── renderer.js       # UI logic and event handlers
├── package.json      # Project dependencies
├── audio_output/     # Generated audio files (auto-created)
└── README.md         # This file
```

## API Integration

The application communicates with a Chatterbox TTS server using the following API endpoint:

```
POST {serverAddress}/api/tts
Content-Type: application/json

{
  "text": "Text to convert to speech",
  "voice": "voice_sample_filename.wav"
}
```

The server should return audio data in WAV format.

## Development

Run in development mode with DevTools:
```bash
npm run dev
```

## Troubleshooting

**No voice samples appearing:**
- Ensure the directory contains supported audio files (.wav, .mp3, .ogg, .flac)
- Check file permissions

**TTS generation fails:**
- Verify the Chatterbox TTS server is running
- Check the server address is correct
- Ensure the server can access the voice sample files

**Discord not receiving audio:**
- Confirm virtual audio cable is installed and configured
- Set Discord input device to the virtual cable
- Check audio player is routing to the virtual cable

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.