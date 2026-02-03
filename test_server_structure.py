#!/usr/bin/env python3
"""
Test script to validate server endpoints without actually running TTS
"""

import sys
import json
from pathlib import Path

def test_server_structure():
    """Test that the server file is properly structured"""
    server_file = Path(__file__).parent / "server_chatterbox_turbo_enhanced.py"
    
    if not server_file.exists():
        print("❌ Server file not found")
        return False
    
    print("✅ Server file exists")
    
    # Check for required imports
    content = server_file.read_text()
    required_imports = [
        "from fastapi import FastAPI",
        "from pydantic import BaseModel",
        "import torch",
        "import torchaudio",
        "import soundfile",
    ]
    
    for imp in required_imports:
        if imp in content:
            print(f"✅ Found: {imp}")
        else:
            print(f"❌ Missing: {imp}")
            return False
    
    # Check for required endpoints
    required_endpoints = [
        '@app.post("/api/tts")',
        '@app.post("/tts")',
        '@app.get("/health")',
        '@app.get("/info")',
        '@app.get("/validate-references")',
        '@app.get("/list-voices")',
    ]
    
    for endpoint in required_endpoints:
        if endpoint in content:
            print(f"✅ Found endpoint: {endpoint}")
        else:
            print(f"❌ Missing endpoint: {endpoint}")
            return False
    
    # Check for references directory creation
    if 'REF_DIR.mkdir(exist_ok=True)' in content:
        print("✅ References directory creation found")
    else:
        print("❌ References directory creation missing")
        return False
    
    return True

def test_requirements():
    """Test that requirements.txt exists and has required packages"""
    req_file = Path(__file__).parent / "requirements.txt"
    
    if not req_file.exists():
        print("❌ requirements.txt not found")
        return False
    
    print("✅ requirements.txt exists")
    
    content = req_file.read_text()
    required_packages = [
        "fastapi",
        "uvicorn",
        "torch",
        "torchaudio",
        "soundfile",
        "numpy",
        "pydantic",
        "qwen-tts",
    ]
    
    for pkg in required_packages:
        if pkg in content:
            print(f"✅ Found package: {pkg}")
        else:
            print(f"❌ Missing package: {pkg}")
            return False
    
    return True

def test_setup_script():
    """Test that setup script exists and is executable"""
    setup_file = Path(__file__).parent / "setup.sh"
    
    if not setup_file.exists():
        print("❌ setup.sh not found")
        return False
    
    print("✅ setup.sh exists")
    
    # Check if executable
    import os
    if os.access(setup_file, os.X_OK):
        print("✅ Setup script is executable")
    else:
        print("⚠️  Setup script is not executable (run: chmod +x setup.sh)")
    
    return True

def main():
    print("=" * 60)
    print("TTS Server Structure Validation")
    print("=" * 60)
    print()
    
    tests = [
        ("Server Structure", test_server_structure),
        ("Requirements", test_requirements),
        ("Setup Script", test_setup_script),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n--- Testing: {test_name} ---")
        result = test_func()
        results.append((test_name, result))
        print()
    
    print("=" * 60)
    print("Summary:")
    print("=" * 60)
    
    all_passed = True
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
        if not result:
            all_passed = False
    
    print()
    if all_passed:
        print("🎉 All tests passed!")
        print()
        print("Next steps:")
        print("1. Install dependencies: pip install -r requirements.txt")
        print("2. Setup authentication: ./setup.sh <your-hf-token>")
        print("3. Add voice samples to references/ directory")
        print("4. Run server: python3 server_chatterbox_turbo_enhanced.py")
        return 0
    else:
        print("⚠️  Some tests failed. Please fix the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
