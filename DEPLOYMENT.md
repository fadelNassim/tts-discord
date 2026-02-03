# Deployment Guide

This guide covers deploying the TTS server in various environments.

## Local Development

### Quick Start
```bash
# Install dependencies
pip install -r requirements.txt

# Setup authentication
./setup.sh <your-hf-token>

# Add voice samples
mkdir -p references
cp your_voice.wav references/

# Run server
python3 server_chatterbox_turbo_enhanced.py
```

Server runs on `http://localhost:5002`

## Production Deployment

### Prerequisites
- Python 3.8+
- CUDA GPU (recommended) or powerful CPU
- Minimum 8GB RAM (16GB+ recommended)
- 10GB+ disk space for models

### Ubuntu/Debian Server

1. **Install system dependencies:**
   ```bash
   sudo apt update
   sudo apt install -y python3 python3-pip python3-venv git
   ```

2. **Create application directory:**
   ```bash
   sudo mkdir -p /opt/tts-discord
   sudo chown $USER:$USER /opt/tts-discord
   cd /opt/tts-discord
   ```

3. **Clone repository:**
   ```bash
   git clone https://github.com/fadelNassim/tts-discord.git .
   ```

4. **Create virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

5. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

6. **Setup authentication:**
   ```bash
   ./setup.sh <your-hf-token>
   ```

7. **Add voice samples:**
   ```bash
   mkdir -p references
   # Copy your voice samples here
   ```

8. **Create systemd service:**
   ```bash
   sudo cp tts-server.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable tts-server
   sudo systemctl start tts-server
   ```

9. **Check status:**
   ```bash
   sudo systemctl status tts-server
   ```

10. **View logs:**
    ```bash
    sudo journalctl -u tts-server -f
    ```

### Nginx Reverse Proxy

To expose the server securely:

1. **Install Nginx:**
   ```bash
   sudo apt install nginx
   ```

2. **Create Nginx configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/tts-server
   ```

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://127.0.0.1:5002;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           
           # Increase timeout for TTS generation
           proxy_read_timeout 300s;
           proxy_connect_timeout 300s;
       }
   }
   ```

3. **Enable site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/tts-server /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Setup SSL with Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Firewall Configuration

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow direct access (optional)
sudo ufw allow 5002/tcp

sudo ufw enable
```

## Docker Deployment (Optional)

Create `Dockerfile`:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy application files
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create references directory
RUN mkdir -p references

# Expose port
EXPOSE 5002

# Run server
CMD ["python3", "server_chatterbox_turbo_enhanced.py"]
```

Build and run:
```bash
docker build -t tts-server .
docker run -p 5002:5002 -v $(pwd)/references:/app/references tts-server
```

## Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
nano .env
```

## Monitoring

### Health Check
```bash
curl http://localhost:5002/health
```

### List Voices
```bash
curl http://localhost:5002/list-voices
```

### Server Logs
```bash
# For systemd service
sudo journalctl -u tts-server -f

# For direct run
tail -f server.log
```

## Performance Tuning

### GPU Optimization
- Ensure CUDA is properly installed
- Monitor GPU memory usage
- Adjust batch sizes if needed

### CPU Optimization
- Use multi-core CPU
- Increase worker count in configuration
- Consider using gunicorn with multiple workers

### Memory Management
- Monitor memory usage
- Clear cache periodically
- Use swap space for large models

## Scaling

### Vertical Scaling
- Upgrade to more powerful GPU
- Add more RAM
- Use faster CPU

### Horizontal Scaling
- Run multiple instances
- Use load balancer (nginx, HAProxy)
- Share references directory via NFS

## Security Best Practices

1. **Use HTTPS** in production
2. **Limit API access** to trusted clients
3. **Set up authentication** if exposing publicly
4. **Regular updates** of dependencies
5. **Monitor logs** for suspicious activity
6. **Use firewall** to restrict access
7. **Backup voice samples** regularly

## Backup

### Important Files
- `references/` - Voice samples
- `.env` - Configuration
- Model cache (usually in `~/.cache/huggingface/`)

### Backup Script
```bash
#!/bin/bash
tar -czf backup-$(date +%Y%m%d).tar.gz \
    references/ \
    .env \
    ~/.cache/huggingface/
```

## Troubleshooting Production Issues

### Server won't start
- Check logs: `sudo journalctl -u tts-server -n 100`
- Verify Python version: `python3 --version`
- Check dependencies: `pip list`
- Test permissions on directories

### High memory usage
- Check model cache size
- Monitor with `htop` or `free -h`
- Restart service periodically

### Slow responses
- Check GPU utilization
- Monitor CPU usage
- Review network latency
- Optimize voice sample size

### Connection refused
- Verify server is running
- Check firewall rules
- Test with `curl localhost:5002/health`
- Review nginx configuration

## Support

For production deployment assistance:
- Open an issue on GitHub
- Check existing documentation
- Review server logs

## License

MIT
