# Quick Start Guide

## For Users (Desktop App)

### 1. Install the Desktop App
```bash
npm install
npm start
```

### 2. Setup the TTS Server

#### Option A: Use the included Python server
```bash
# Install Python dependencies
pip install -r requirements.txt

# Setup authentication (first time only)
./setup_chatterbox_auth.sh <your-huggingface-token>

# Add voice samples
mkdir -p references
cp your_voice.wav references/

# Start the server
python3 server_chatterbox_turbo_enhanced.py
```

#### Option B: Use external TTS server
Configure your own TTS server address in the app.

### 3. Use the App
1. Set server address to `http://localhost:5002` (if using included server)
2. Browse to select your `references/` directory
3. Choose a voice sample
4. Enter text and generate speech!

## For Developers

### Testing the Server
```bash
# Validate server structure
python3 test_server_structure.py

# Test API endpoints
curl http://localhost:5002/health
curl http://localhost:5002/list-voices
```

### API Integration

#### Basic TTS Request
```bash
curl -X POST http://localhost:5002/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "voice": "my_voice.wav"}' \
  --output speech.wav
```

#### Advanced TTS Request
```bash
curl -X POST http://localhost:5002/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello with custom parameters",
    "persona": "default",
    "temperature": 1.7,
    "top_p": 0.9
  }' \
  --output speech.wav
```

## Directory Structure

```
tts-discord/
├── main.js                              # Desktop app main process
├── renderer.js                          # Desktop app UI logic
├── index.html                           # Desktop app interface
├── server_chatterbox_turbo_enhanced.py  # TTS server
├── requirements.txt                     # Python dependencies
├── setup_chatterbox_auth.sh            # Server setup script
├── test_server_structure.py            # Server validation
├── references/                          # Voice samples (create this)
│   ├── my_voice.wav
│   ├── default.wav
│   └── ...
└── audio_output/                        # Generated audio (auto-created)
```

## Common Issues

### Server won't start
- Install dependencies: `pip install -r requirements.txt`
- Run setup: `./setup_chatterbox_auth.sh <token>`
- Check port 5002 is available

### Desktop app can't connect
- Verify server is running on port 5002
- Check server address in app settings
- Look for firewall blocking

### No voices available
- Add .wav, .mp3, .ogg, or .flac files to `references/`
- Files must be at least 5 seconds long
- Check file permissions

### Out of memory
- Use CPU mode (automatic if no GPU)
- Close other applications
- Use shorter voice samples

## Support

- See `SERVER_README.md` for detailed server documentation
- See `USAGE.md` for desktop app usage
- See `README.md` for project overview
