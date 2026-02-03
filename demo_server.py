#!/usr/bin/env python3
"""
Demo script to test the TTS server API endpoints
This script demonstrates how to interact with the server
"""

import requests
import sys
from pathlib import Path

SERVER_URL = "http://localhost:5002"

def test_health():
    """Test the health endpoint"""
    print("Testing /health endpoint...")
    try:
        response = requests.get(f"{SERVER_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed!")
            print(f"   Status: {data.get('status')}")
            print(f"   Device: {data.get('device')}")
            print(f"   Model: {data.get('model')}")
            print(f"   Available voices: {data.get('available_voices')}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error connecting to server: {e}")
        print(f"   Make sure the server is running on {SERVER_URL}")
        return False

def test_info():
    """Test the info endpoint"""
    print("\nTesting /info endpoint...")
    try:
        response = requests.get(f"{SERVER_URL}/info")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Info endpoint working!")
            print(f"   Model: {data.get('model')}")
            print(f"   Version: {data.get('version')}")
            print(f"   Sample rate: {data.get('sample_rate')}")
            return True
        else:
            print(f"❌ Info endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_list_voices():
    """Test the list-voices endpoint"""
    print("\nTesting /list-voices endpoint...")
    try:
        response = requests.get(f"{SERVER_URL}/list-voices")
        if response.status_code == 200:
            data = response.json()
            voices = data.get('voices', [])
            print(f"✅ Found {len(voices)} voice(s) in references directory")
            for voice in voices:
                status = "✓" if voice['valid'] else "✗"
                print(f"   [{status}] {voice['filename']} ({voice['duration']:.1f}s)")
            return voices
        else:
            print(f"❌ List voices failed: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ Error: {e}")
        return []

def test_validate_references():
    """Test the validate-references endpoint"""
    print("\nTesting /validate-references endpoint...")
    try:
        response = requests.get(f"{SERVER_URL}/validate-references")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Validation complete!")
            print(f"   Total files: {data.get('total_files')}")
            print(f"   Valid files: {data.get('valid_files')}")
            return True
        else:
            print(f"❌ Validation failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_tts_generation(voice_filename):
    """Test TTS generation with a voice file"""
    print(f"\nTesting /api/tts endpoint with voice: {voice_filename}...")
    try:
        payload = {
            "text": "Hello! This is a test of the text to speech system.",
            "voice": voice_filename
        }
        
        response = requests.post(
            f"{SERVER_URL}/api/tts",
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            # Save the audio file
            output_dir = Path(__file__).parent / "demo_output"
            output_dir.mkdir(exist_ok=True)
            output_file = output_dir / f"demo_{Path(voice_filename).stem}.wav"
            
            output_file.write_bytes(response.content)
            print(f"✅ TTS generation successful!")
            print(f"   Audio saved to: {output_file}")
            print(f"   File size: {len(response.content)} bytes")
            return True
        else:
            print(f"❌ TTS generation failed: {response.status_code}")
            if response.content:
                try:
                    error = response.json()
                    print(f"   Error: {error.get('detail')}")
                except:
                    pass
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("=" * 60)
    print("TTS Server Demo & Test Script")
    print("=" * 60)
    print()
    
    # Test basic endpoints
    if not test_health():
        print("\n❌ Server is not responding. Please start the server first:")
        print("   python3 server_chatterbox_turbo_enhanced.py")
        return 1
    
    test_info()
    voices = test_list_voices()
    test_validate_references()
    
    # Test TTS generation if we have valid voices
    if voices:
        valid_voices = [v for v in voices if v['valid']]
        if valid_voices:
            print("\n" + "=" * 60)
            print("TTS Generation Test")
            print("=" * 60)
            
            # Test with the first valid voice
            voice = valid_voices[0]
            test_tts_generation(voice['filename'])
        else:
            print("\n⚠️  No valid voices found for TTS generation test")
            print("   Add voice samples (5+ seconds) to the references/ directory")
    else:
        print("\n⚠️  No voices found in references directory")
        print("   Add .wav, .mp3, .ogg, or .flac files to references/")
    
    print("\n" + "=" * 60)
    print("Demo complete!")
    print("=" * 60)
    return 0

if __name__ == "__main__":
    sys.exit(main())
