# Architecture Overview

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    TTS Discord System                            │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  Desktop Client  │         │   TTS Server     │         │     Discord      │
│   (Electron)     │◄───────►│   (FastAPI)      │         │  Voice Channel   │
└──────────────────┘         └──────────────────┘         └──────────────────┘
        │                            │                            ▲
        │                            │                            │
        ▼                            ▼                            │
┌──────────────────┐         ┌──────────────────┐               │
│  User Interface  │         │  Chatterbox      │               │
│  - Text Input    │         │  Turbo Model     │               │
│  - Voice Select  │         │  - Voice Clone   │               │
│  - GenerateBtn  │         │  - TTS Generate  │               │
└──────────────────┘         └──────────────────┘               │
        │                            │                            │
        ▼                            ▼                            │
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  audio_output/   │         │   references/    │         │  Virtual Audio   │
│  - tts_*.wav     │─────────────────────────────────────►│     Cable        │
└──────────────────┘         │  - voice1.wav    │         └──────────────────┘
                             │  - voice2.mp3    │
                             │  - voice3.flac   │
                             └──────────────────┘
```

## Data Flow

### 1. TTS Generation Request

```
User Input
    │
    ├─ Text: "Hello world"
    ├─ Voice: "my_voice.wav"
    └─ Parameters: temperature, min_p, etc.
    │
    ▼
Electron Client (renderer.js)
    │
    ├─ Validate inputs
    ├─ Show "Generating..." status
    └─ Send IPC message
    │
    ▼
Main Process (main.js)
    │
    ├─ Receive IPC message
    ├─ Prepare HTTP request
    └─ POST /api/tts
    │
    ▼
FastAPI Server (server_chatterbox_turbo_enhanced.py)
    │
    ├─ Validate request
    ├─ Get reference path: references/my_voice.wav
    ├─ Check audio duration (>5s)
    ├─ Convert if needed (MP3→WAV)
    └─ Call Chatterbox Turbo
    │
    ▼
Chatterbox Turbo TTS
    │
    ├─ Load voice reference
    ├─ Generate speech from text
    ├─ Apply parameters
    └─ Return audio tensor
    │
    ▼
Server Post-Processing
    │
    ├─ Save to temp WAV file
    ├─ Apply peak limiting
    ├─ Read file bytes
    └─ Return HTTP response
    │
    ▼
Client Response Handler
    │
    ├─ Receive audio data
    ├─ Save to audio_output/tts_TIMESTAMP.wav
    ├─ Show success message
    └─ Update UI
    │
    ▼
User
    │
    └─ Play audio through virtual cable → Discord
```

## Component Details

### Desktop Client (Electron)

**Files:**
- `main.js` - Main process, IPC handlers, HTTP requests
- `renderer.js` - UI logic, event handling, user interaction
- `preload.js` - Secure IPC bridge between main and renderer
- `index.html` - User interface template
- `styles.css` - Application styling

**Responsibilities:**
- User interface and interaction
- Voice sample directory browsing
- HTTP communication with server
- Audio file management
- Settings persistence

### TTS Server (FastAPI/Python)

**Files:**
- `server_chatterbox_turbo_enhanced.py` - Main server application
- `requirements.txt` - Python dependencies
- `setup_chatterbox_auth.sh` - Initial authentication

**Responsibilities:**
- HTTP API endpoints
- Voice file validation
- Format conversion (MP3/OGG/FLAC → WAV)
- TTS generation via Chatterbox Turbo
- Audio post-processing
- Model management
- Error handling

**Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tts` | POST | Generate TTS audio (client endpoint) |
| `/tts` | POST | Generate TTS audio (alternative) |
| `/health` | GET | Server health check |
| `/info` | GET | Model information |
| `/list-voices` | GET | Available voice samples |
| `/validate-references` | GET | Validate audio files |

### Voice References

**Directory:** `references/`

**Supported Formats:**
- WAV (preferred)
- MP3 (auto-converted)
- OGG (auto-converted)
- FLAC (auto-converted)

**Requirements:**
- Minimum duration: 5 seconds
- Clear audio, minimal background noise
- Natural speech

**Auto-Conversion:**
```
references/
├── my_voice.mp3          ─┐
└── my_voice.wav (cached) ─┘  Created automatically on first use
```

## API Protocol

### Request Format

```http
POST /api/tts HTTP/1.1
Host: localhost:5002
Content-Type: application/json

{
  "text": "Text to convert to speech",
  "voice": "my_voice.wav",
  "temperature": 1.7,       // Optional
  "min_p": 0.1,             // Optional
  "top_p": 0.9,             // Optional
  "top_k": 50,              // Optional
  "repetition_penalty": 1.0,// Optional
  "norm_loudness": true     // Optional
}
```

### Response Format

```http
HTTP/1.1 200 OK
Content-Type: audio/wav
Content-Disposition: attachment; filename=out.wav
Content-Length: 123456

[WAV audio data]
```

### Error Response

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "detail": "Audio too short: 3.2s. Must be at least 5.0 seconds"
}
```

## Security Model

### Authentication
- Hugging Face token for model access (first-time only)
- Stored in local cache after initial setup
- Offline mode supported

### Data Privacy
- All processing happens locally
- Voice samples stored on user's machine
- No data sent to external services (except HF model hub initially)
- Generated audio saved locally only

### Network Security
- Server binds to 0.0.0.0:5002 by default
- Can be configured for localhost-only
- No authentication required (local use)
- CORS can be configured for production

## Performance Characteristics

### Resource Usage
- **GPU**: 2-4GB VRAM (if available)
- **CPU**: Fallback mode, slower generation
- **RAM**: 4-8GB recommended
- **Disk**: ~5GB for model cache

### Generation Speed
- **GPU**: 1-3 seconds for typical sentence
- **CPU**: 5-15 seconds for typical sentence
- Depends on text length and hardware

### Scalability
- Single request at a time (sequential)
- Can be enhanced with worker processes
- Stateless API (easy to scale horizontally)

## Deployment Options

### Development
```bash
python3 server_chatterbox_turbo_enhanced.py
npm start
```

### Production (Systemd)
```bash
systemctl start tts-server
systemctl enable tts-server
```

### Production (Docker)
```bash
docker build -t tts-server .
docker run -p 5002:5002 tts-server
```

### Behind Reverse Proxy
```
Internet → Nginx (SSL) → TTS Server (localhost:5002)
```

## Error Handling

### Client Errors
- Network connection failure → Show error, retry option
- Invalid server URL → Validate input, show helpful message
- No voice selected → Prevent submission, highlight required field

### Server Errors
- Voice file not found → HTTP 404, clear error message
- Audio too short → HTTP 400, minimum duration info
- TTS generation failure → HTTP 500, detailed error log
- Out of memory → HTTP 500, suggest CPU mode

### Recovery Strategies
- Automatic retry with exponential backoff
- Graceful degradation (CPU fallback)
- Clear error messages with actionable steps
- Detailed logging for debugging

## Testing Strategy

### Unit Tests
- Individual function validation
- Mock external dependencies
- Edge case coverage

### Integration Tests
- End-to-end workflow
- Client-server communication
- File system operations

### Validation Tests
- Structure validation (test_server_structure.py)
- Integration validation (test_integration.py)
- Live endpoint testing (demo_server.py)

## Monitoring

### Health Checks
```bash
curl http://localhost:5002/health
```

### Logs
```bash
# Server logs (stdout)
python3 server_chatterbox_turbo_enhanced.py

# Systemd logs
journalctl -u tts-server -f
```

### Metrics
- Request count
- Average response time
- Error rate
- GPU/CPU utilization
- Memory usage

## Future Enhancements

### Potential Features
- [ ] Batch processing support
- [ ] WebSocket streaming for real-time TTS
- [ ] Voice blending/mixing
- [ ] SSML support
- [ ] Multiple language support
- [ ] Rate limiting
- [ ] User authentication
- [ ] Cloud deployment options
- [ ] Mobile app support

### Performance Optimizations
- [ ] Model quantization
- [ ] Request queuing
- [ ] Worker pool for concurrent requests
- [ ] Redis caching for frequent requests
- [ ] CDN for static assets
