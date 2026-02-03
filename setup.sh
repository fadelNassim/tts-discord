#!/bin/bash

# Setup script for Qwen3-TTS authentication
# This script helps you authenticate with Hugging Face and download the model

set -e

if [ -z "$1" ]; then
    echo "Usage: ./setup.sh <your-huggingface-token> [model-id]"
    echo ""
    echo "To get a Hugging Face token:"
    echo "1. Go to https://huggingface.co/settings/tokens"
    echo "2. Create a new token with 'read' permission"
    echo "3. Run this script with your token"
    echo ""
    echo "Optional model-id (default: Qwen/Qwen3-TTS-12Hz-1.7B-Base)"
    exit 1
fi

HF_TOKEN="$1"
MODEL_ID="${2:-Qwen/Qwen3-TTS-12Hz-1.7B-Base}"

echo "[SETUP] Setting up Qwen3-TTS..."
echo "[SETUP] Logging into Hugging Face..."

# Login to Hugging Face
huggingface-cli login --token "$HF_TOKEN"

echo "[SETUP] Downloading model (this may take a few minutes)..."

# Download the model by running a test import
python3 << EOF
import os
os.environ['HF_TOKEN'] = '$HF_TOKEN'

from qwen_tts import Qwen3TTSModel
print("[SETUP] Loading model for the first time...")
model = Qwen3TTSModel.from_pretrained('$MODEL_ID')
print("[SETUP] Model downloaded successfully!")
print("[SETUP] Model files are now cached locally.")
del model
EOF

echo ""
echo "[SETUP] ✅ Setup complete!"
echo "[SETUP] You can now run the server in offline mode:"
echo "        python3 server_chatterbox_turbo_enhanced.py"
