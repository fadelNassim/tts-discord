# Qwen3-TTS Server Setup

This is a FastAPI-based TTS server using Qwen3-TTS that integrates with the TTS Discord client.

## Features

- 🎵 **Zero-shot voice cloning** - Clone any voice with a 5+ second sample
- 🎭 **Multiple endpoints** - Legacy `/api/tts` for client compatibility, enhanced `/tts` with full control
- 📁 **Flexible voice management** - Supports WAV, MP3, OGG, and FLAC formats
- 🔧 **Advanced parameters** - Control temperature, sampling, and more
- 🌐 **RESTful API** - Easy integration with any client
- 🎮 **Audio validation** - Ensures voice samples meet quality requirements

## Prerequisites

1. **Python 3.8+**
2. **Hugging Face account** with access to Qwen3-TTS
3. **CUDA-capable GPU** (recommended) or CPU

## Installation

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Setup Hugging Face authentication:**
   ```bash
   ./setup.sh <your-huggingface-token>
   ```
   
   Get your token from: https://huggingface.co/settings/tokens

## Usage

### Starting the Server

```bash
python3 server_chatterbox_turbo_enhanced.py
```

The server will start on `http://localhost:5002` by default.

### Adding Voice Samples

1. Create the `references/` directory if it doesn't exist
2. Add voice sample files (minimum 5 seconds):
   - Supported formats: `.wav`, `.mp3`, `.ogg`, `.flac`
   - Higher quality samples produce better results

Example:
```bash
mkdir -p references
cp my_voice.wav references/
```

### API Endpoints

#### 1. Legacy TTS Endpoint (Client Compatible)
```bash
POST /api/tts
Content-Type: application/json

{
  "text": "Hello, this is a test",
   "voice": "my_voice.wav",
   "language": "Auto"
}
```

Response: WAV audio file

#### 2. Enhanced TTS Endpoint (with advanced parameters)
```bash
POST /tts
Content-Type: application/json

{
  "text": "Hello with custom parameters",
  "voice": "my_voice.wav",
  "temperature": 1.7,
  "min_p": 0.1,
  "top_p": 0.9,
  "top_k": 50,
   "repetition_penalty": 1.0,
   "norm_loudness": true,
   "language": "English"
}
```

Both endpoints work identically - use any voice file from your references/ directory.

#### 3. Health Check
```bash
GET /health
```

Returns server status and available voices.

#### 4. Model Info
```bash
GET /info
```

Returns model information and parameter ranges.

#### 5. Validate References
```bash
GET /validate-references
```

Checks all reference audio files for validity.

#### 6. List Voices
```bash
GET /list-voices
```

Lists all available voice samples in the references directory.

## Integration with TTS Discord Client

The server is designed to work seamlessly with the TTS Discord client:

1. Start the server on the default port (5002)
2. In the TTS Discord client, set the server address to `http://localhost:5002`
3. Place your voice samples in the `references/` directory
4. The client will automatically use the `/api/tts` endpoint and language selection

## Parameters

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| temperature | float | 0.05-5.0 | 1.7 | Controls randomness in generation |
| min_p | float | 0.0-1.0 | 0.1 | Minimum probability threshold |
| top_p | float | 0.0-1.0 | 0.9 | Nucleus sampling threshold |
| top_k | int | 1-100 | 50 | Top-k sampling parameter |
| repetition_penalty | float | 0.5-2.0 | 1.0 | Penalty for repetition |
| norm_loudness | bool | - | true | Normalize output loudness |
| language | string | - | Auto | Language selection |

## Troubleshooting

### Server won't start
- Check that all dependencies are installed: `pip install -r requirements.txt`
- Verify Hugging Face authentication: `./setup.sh <token>`
- Ensure port 5002 is not in use

### Voice file not found
- Check that the file exists in the `references/` directory
- Verify the filename matches exactly (case-sensitive)
- Ensure the file format is supported

### Audio too short error
- Voice samples must be at least 5 seconds long
- Use longer, high-quality recordings for best results

### Out of memory
- Reduce batch size or use CPU mode
- Close other applications to free up GPU memory

## Offline Mode

After initial setup, the server can run in offline mode:

1. Run setup script once with internet connection
2. Model files are cached locally
3. Server will use cached files on subsequent runs
4. No internet connection required after initial setup

## Development

### Running in debug mode
```bash
python3 server_chatterbox_turbo_enhanced.py
```

Logs are printed to console with `[DEBUG]` prefix.

### Testing the API
```bash
# Test health endpoint
curl http://localhost:5002/health

# Test TTS generation
curl -X POST http://localhost:5002/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "voice": "my_voice.wav", "language": "Auto"}' \
  --output test.wav
```

## License

MIT
