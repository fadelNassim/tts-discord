# TTS Discord 🎙️

A desktop application for Text-to-Speech with voice cloning capabilities, designed to work seamlessly with Discord using virtual audio cables. Includes a powerful FastAPI-based TTS server using Qwen3-TTS for zero-shot voice cloning.

## Features

### Desktop App
- 🎵 **Text-to-Speech Generation** - Convert text to speech using a local Qwen3-TTS server
- 🎭 **Voice Cloning** - Import and use voice samples for voice duplication
- 📁 **Voice Sample Management** - Easy dropdown to select from local voice samples
- 🌐 **Configurable TTS Server** - Connect to your local or remote Qwen3-TTS server
- 🎮 **Discord Integration** - Use generated audio as input in Discord via virtual audio cable
- 🖥️ **User-Friendly UI** - Clean, Discord-themed interface that's easy to use

### TTS Server (Included)
- 🚀 **Qwen3-TTS** - State-of-the-art zero-shot voice cloning
- 🎛️ **Advanced Controls** - Temperature, sampling, and more
- 📦 **Multiple Formats** - Supports WAV, MP3, OGG, and FLAC input
- ✅ **Audio Validation** - Ensures voice samples meet quality requirements
- 🔌 **RESTful API** - Easy integration with any client
- 🌐 **Offline Mode** - Works without internet after initial setup

## Prerequisites

### Desktop App
1. **Node.js** (v16 or higher)
2. **Virtual Audio Cable** (for Discord integration):
   - Windows: [VB-Audio Virtual Cable](https://vb-audio.com/Cable/)
   - macOS: [BlackHole](https://github.com/ExistentialAudio/BlackHole)
   - Linux: PulseAudio virtual sink

### TTS Server (Optional - Included)
1. **Python 3.8+**
2. **Hugging Face account** (for Qwen3-TTS access)
3. **CUDA GPU** (recommended) or CPU

## Installation

1. Clone this repository:
```bash
git clone https://github.com/fadelNassim/tts-discord.git
cd tts-discord
```

2. Install desktop app dependencies:
```bash
npm install
```

3. (Optional) Setup the included TTS server:
```bash
# Install Python dependencies
pip install -r requirements.txt

# Authenticate with Hugging Face and download Qwen3-TTS
./setup.sh <your-huggingface-token>

# Create references directory and add voice samples
mkdir -p references
```

Get your Hugging Face token from: https://huggingface.co/settings/tokens

## Quick Start

### Using the Included Server

1. **Start the TTS server:**
```bash
python3 server_chatterbox_turbo_enhanced.py
```
Server will run on `http://localhost:5002`

2. **Start the desktop app:**
```bash
npm start
```

3. **Configure the app:**
   - Server address: `http://localhost:5002`
   - Browse to select the `references/` directory
   - Choose a voice sample from the dropdown
   - Choose a language (or Auto)

4. **Generate speech:**
   - Enter your text
   - Click "Generate Speech"
   - Audio saved to `audio_output/` folder

### Using an External Server

1. **Start the application:**
```bash
npm start
```

2. **Configure your external server address**

3. **Select voice samples and generate speech**

## Discord Integration

### Linux (Automated, recommended)

This app can automatically inject each generated TTS clip into Discord by creating a virtual mic via PipeWire/PulseAudio.

1. In the app, click **Setup** under **Discord Mic Routing (Linux)**
2. In Discord → Settings → Voice & Video, set **Input Device** to **Default** (do this once)
3. Enable **Auto-play generated audio to Discord mic** in the app

Alternative (terminal):
- `npm run discord:setup`
- `npm run discord:teardown`

### Windows / macOS

Use a virtual audio cable device and set it as Discord’s input:
- Windows: VB-Audio Virtual Cable
- macOS: BlackHole

Then route this app’s audio output into that virtual cable:
- Windows: set Discord input to **CABLE Output**, and set this app’s output device to **CABLE Input** (Windows per-app output device settings)
- macOS: set Discord input to BlackHole and route this app’s output to it (or a Multi-Output device)

Note: on Windows/macOS the OS does not let apps create new “sink devices” in software without installing a driver (VB-Cable / BlackHole). This repo can automate sink creation only on Linux.

## Project Structure

```
tts-discord/
├── main.js                              # Electron main process
├── preload.js                           # Preload script for IPC
├── renderer.js                          # UI logic and event handlers
├── index.html                           # Main UI
├── styles.css                           # Application styles
├── package.json                         # Node.js dependencies
├── server_chatterbox_turbo_enhanced.py  # TTS server
├── requirements.txt                     # Python dependencies
├── setup.sh                            # Server setup script
├── test_server_structure.py            # Server validation
├── references/                          # Voice samples directory
├── audio_output/                        # Generated audio (auto-created)
├── README.md                            # This file
├── SERVER_README.md                     # Server documentation
├── QUICKSTART.md                        # Quick start guide
└── USAGE.md                             # Detailed usage guide
```

## API Documentation

The included server exposes multiple endpoints:

### Client Endpoint (Used by Desktop App)
```http
POST /api/tts
Content-Type: application/json

{
  "text": "Text to convert to speech",
  "voice": "voice_sample_filename.wav",
  "language": "Auto"
}
```
Returns: WAV audio file

### Enhanced Endpoint (Advanced)
```http
POST /tts
Content-Type: application/json

{
  "text": "Custom text",
  "voice": "voice_sample_filename.wav",
  "temperature": 1.7,
  "top_p": 0.9,
  "language": "English"
}
```

### Other Endpoints
- `GET /health` - Server health check
- `GET /info` - Model information (includes supported languages)
- `GET /list-voices` - List available voices
- `GET /validate-references` - Validate voice samples

See `SERVER_README.md` for complete API documentation.

## Development

Run in development mode with DevTools:
```bash
npm run dev
```

## Documentation

- 📖 **[Quick Start Guide](QUICKSTART.md)** - Get up and running quickly
- 📖 **[Server Documentation](SERVER_README.md)** - Detailed server setup and API docs
- 📖 **[Usage Guide](USAGE.md)** - Desktop app usage instructions

## Troubleshooting

**Server Issues:**
- **Server won't start**: Check Python dependencies are installed
- **Authentication failed**: Run `./setup.sh <token>`
- **Voice file not found**: Ensure files are in `references/` directory
- **Out of memory**: Server will automatically use CPU if GPU unavailable

**Desktop App Issues:**
- **No voice samples appearing**: Browse to the correct directory containing audio files
- **Can't connect to server**: Verify server is running on correct port (5002)
- **TTS generation fails**: Check server logs for errors

**Discord Integration:**
- **Audio not playing**: Verify virtual audio cable is configured correctly
- **Poor audio quality**: Use higher quality voice samples (5+ seconds)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
