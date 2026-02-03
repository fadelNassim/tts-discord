# Contributing to TTS Discord

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Desktop App Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/fadelNassim/tts-discord.git
   cd tts-discord
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run in development mode:**
   ```bash
   npm run dev
   ```
   This opens the app with DevTools for debugging.

### Server Development

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Setup authentication (first time only):**
   ```bash
   ./setup.sh <your-hf-token>
   ```

3. **Run the server:**
   ```bash
   python3 server_chatterbox_turbo_enhanced.py
   ```

4. **Test the server:**
   ```bash
   python3 demo_server.py
   ```

## Code Style

### JavaScript/Node.js
- Use ES6+ features
- Use meaningful variable names
- Add comments for complex logic
- Follow existing code style

### Python
- Follow PEP 8 style guide
- Use type hints where appropriate
- Add docstrings to functions
- Keep functions focused and small

## Testing

### Testing the Desktop App
1. Run the app: `npm start`
2. Test with a local server
3. Verify all UI interactions work
4. Check error handling

### Testing the Server
1. Run structure validation: `python3 test_server_structure.py`
2. Run demo script: `python3 demo_server.py`
3. Test each endpoint manually
4. Verify error handling

### Manual Testing Checklist
- [ ] Server starts without errors
- [ ] Health endpoint returns correct status
- [ ] Voice samples are detected correctly
- [ ] TTS generation works with valid voices
- [ ] Error messages are clear and helpful
- [ ] Desktop app connects to server
- [ ] Generated audio plays correctly
- [ ] Files are saved to correct locations

## Making Changes

1. **Create a new branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   - Keep changes focused and atomic
   - Test thoroughly
   - Update documentation as needed

3. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Description of your changes"
   ```

4. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request:**
   - Provide a clear description
   - Reference any related issues
   - Include screenshots for UI changes

## Areas for Contribution

### Desktop App
- [ ] Improve UI/UX
- [ ] Add more configuration options
- [ ] Better error handling
- [ ] Audio playback preview
- [ ] Keyboard shortcuts
- [ ] Dark/light theme toggle

### Server
- [ ] Additional TTS model support
- [ ] Voice mixing/blending
- [ ] Batch processing
- [ ] WebSocket support for streaming
- [ ] Docker containerization
- [ ] Performance optimizations
- [ ] API rate limiting
- [ ] Authentication/authorization

### Documentation
- [ ] Video tutorials
- [ ] More examples
- [ ] API documentation improvements
- [ ] Troubleshooting guides
- [ ] Deployment guides

### Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance tests
- [ ] CI/CD pipeline

## Bug Reports

When reporting bugs, please include:

1. **Environment:**
   - OS (Windows/macOS/Linux)
   - Node.js version
   - Python version (if server-related)
   - GPU/CPU info

2. **Steps to reproduce:**
   - Detailed steps
   - Expected behavior
   - Actual behavior

3. **Logs:**
   - Console output
   - Error messages
   - Screenshots if applicable

4. **Additional context:**
   - When did it start?
   - Does it happen consistently?
   - Any recent changes?

## Feature Requests

For feature requests, please provide:

1. **Use case:** Why is this feature needed?
2. **Proposed solution:** How should it work?
3. **Alternatives:** What alternatives have you considered?
4. **Additional context:** Any other relevant information

## Questions?

- Open an issue for questions
- Check existing issues first
- Provide context and examples

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Focus on what is best for the community

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Thank You!

Your contributions make this project better for everyone. Thank you for taking the time to contribute! 🎉
