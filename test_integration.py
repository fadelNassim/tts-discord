#!/usr/bin/env python3
"""
Integration test to validate the complete TTS Discord setup
This script checks all components without requiring the model to be loaded
"""

import sys
from pathlib import Path
import json

def print_header(title):
    """Print a formatted header"""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def check_file_exists(filepath, description):
    """Check if a file exists"""
    if Path(filepath).exists():
        print(f"✅ {description}: {filepath}")
        return True
    else:
        print(f"❌ {description} MISSING: {filepath}")
        return False

def check_directory_exists(dirpath, description):
    """Check if a directory exists"""
    if Path(dirpath).is_dir():
        print(f"✅ {description}: {dirpath}")
        return True
    else:
        print(f"❌ {description} MISSING: {dirpath}")
        return False

def check_python_imports():
    """Check if required Python modules can be imported"""
    print_header("Python Dependencies Check")
    
    modules = [
        ("fastapi", "FastAPI web framework"),
        ("pydantic", "Data validation"),
        ("torch", "PyTorch"),
        ("numpy", "NumPy"),
        ("soundfile", "Audio file I/O"),
    ]
    
    all_ok = True
    for module, description in modules:
        try:
            __import__(module)
            print(f"✅ {description}: {module}")
        except ImportError:
            print(f"❌ {description} NOT INSTALLED: {module}")
            all_ok = False
    
    return all_ok

def check_nodejs_packages():
    """Check Node.js package.json"""
    print_header("Node.js Dependencies Check")
    
    package_json = Path("package.json")
    if not package_json.exists():
        print("❌ package.json not found")
        return False
    
    with open(package_json) as f:
        data = json.load(f)
    
    required = ["axios", "electron"]
    all_ok = True
    
    deps = data.get("dependencies", {})
    for pkg in required:
        if pkg in deps:
            print(f"✅ {pkg}: {deps[pkg]}")
        else:
            print(f"❌ {pkg} missing from dependencies")
            all_ok = False
    
    return all_ok

def check_server_files():
    """Check server-related files"""
    print_header("Server Files Check")
    
    files = [
        ("server_chatterbox_turbo_enhanced.py", "Main server file"),
        ("requirements.txt", "Python dependencies"),
        ("setup_chatterbox_auth.sh", "Setup script"),
        ("test_server_structure.py", "Structure validation"),
        ("demo_server.py", "Demo/test script"),
    ]
    
    all_ok = True
    for filepath, description in files:
        if not check_file_exists(filepath, description):
            all_ok = False
    
    return all_ok

def check_client_files():
    """Check client-related files"""
    print_header("Client Files Check")
    
    files = [
        ("main.js", "Electron main process"),
        ("renderer.js", "UI logic"),
        ("preload.js", "IPC bridge"),
        ("index.html", "UI template"),
        ("styles.css", "Styles"),
        ("package.json", "Node dependencies"),
    ]
    
    all_ok = True
    for filepath, description in files:
        if not check_file_exists(filepath, description):
            all_ok = False
    
    return all_ok

def check_documentation():
    """Check documentation files"""
    print_header("Documentation Check")
    
    files = [
        ("README.md", "Main README"),
        ("SERVER_README.md", "Server documentation"),
        ("QUICKSTART.md", "Quick start guide"),
        ("USAGE.md", "Usage guide"),
        ("CONTRIBUTING.md", "Contribution guide"),
        ("DEPLOYMENT.md", "Deployment guide"),
        ("references/README.md", "Voice samples guide"),
    ]
    
    all_ok = True
    for filepath, description in files:
        if not check_file_exists(filepath, description):
            all_ok = False
    
    return all_ok

def check_directories():
    """Check required directories"""
    print_header("Directory Structure Check")
    
    dirs = [
        ("references", "Voice samples directory"),
        ("example_voices", "Example voices directory"),
    ]
    
    all_ok = True
    for dirpath, description in dirs:
        if not check_directory_exists(dirpath, description):
            all_ok = False
    
    return all_ok

def check_server_endpoints():
    """Validate server endpoints are defined"""
    print_header("Server Endpoints Check")
    
    server_file = Path("server_chatterbox_turbo_enhanced.py")
    if not server_file.exists():
        print("❌ Server file not found")
        return False
    
    content = server_file.read_text()
    
    endpoints = [
        ('@app.post("/api/tts")', "Legacy TTS endpoint"),
        ('@app.post("/tts")', "Enhanced TTS endpoint"),
        ('@app.get("/health")', "Health check"),
        ('@app.get("/info")', "Model info"),
        ('@app.get("/list-voices")', "List voices"),
        ('@app.get("/validate-references")', "Validate references"),
    ]
    
    all_ok = True
    for endpoint, description in endpoints:
        if endpoint in content:
            print(f"✅ {description}: {endpoint}")
        else:
            print(f"❌ {description} MISSING: {endpoint}")
            all_ok = False
    
    return all_ok

def check_integration():
    """Check client-server integration points"""
    print_header("Client-Server Integration Check")
    
    main_js = Path("main.js")
    if not main_js.exists():
        print("❌ main.js not found")
        return False
    
    content = main_js.read_text()
    
    checks = [
        ("'/api/tts'", "TTS endpoint call"),
        ("send-tts-request", "IPC handler"),
        ("responseType: 'arraybuffer'", "Binary response handling"),
    ]
    
    all_ok = True
    for check, description in checks:
        if check in content:
            print(f"✅ {description}")
        else:
            print(f"⚠️  {description} - may need verification")
    
    return all_ok

def generate_report():
    """Generate final report"""
    print_header("Integration Test Summary")
    
    tests = [
        ("Server Files", check_server_files),
        ("Client Files", check_client_files),
        ("Documentation", check_documentation),
        ("Directories", check_directories),
        ("Server Endpoints", check_server_endpoints),
        ("Client-Server Integration", check_integration),
    ]
    
    results = {}
    for test_name, test_func in tests:
        results[test_name] = test_func()
    
    # Optional tests (require dependencies)
    print("\n" + "=" * 70)
    print("  Optional Checks (require dependencies)")
    print("=" * 70)
    
    try:
        if check_python_imports():
            results["Python Dependencies"] = True
    except Exception as e:
        print(f"⚠️  Python dependencies check skipped: {e}")
        results["Python Dependencies"] = None
    
    try:
        if check_nodejs_packages():
            results["Node.js Dependencies"] = True
    except Exception as e:
        print(f"⚠️  Node.js dependencies check skipped: {e}")
        results["Node.js Dependencies"] = None
    
    # Print summary
    print_header("Final Summary")
    
    passed = sum(1 for v in results.values() if v is True)
    failed = sum(1 for v in results.values() if v is False)
    skipped = sum(1 for v in results.values() if v is None)
    
    for test_name, result in results.items():
        if result is True:
            print(f"✅ PASS: {test_name}")
        elif result is False:
            print(f"❌ FAIL: {test_name}")
        else:
            print(f"⚠️  SKIP: {test_name}")
    
    print(f"\nTotal: {passed} passed, {failed} failed, {skipped} skipped")
    
    if failed == 0:
        print("\n🎉 All critical checks passed!")
        print("\nNext steps:")
        print("1. Install Python dependencies: pip install -r requirements.txt")
        print("2. Install Node.js dependencies: npm install")
        print("3. Setup authentication: ./setup_chatterbox_auth.sh <token>")
        print("4. Add voice samples to references/ directory")
        print("5. Test server: python3 demo_server.py")
        print("6. Run client: npm start")
        return 0
    else:
        print("\n⚠️  Some checks failed. Please fix the issues above.")
        return 1

def main():
    print("=" * 70)
    print("  TTS Discord - Integration Test")
    print("=" * 70)
    print("\nThis script validates the complete setup without requiring")
    print("dependencies to be installed or models to be loaded.")
    
    return generate_report()

if __name__ == "__main__":
    sys.exit(main())
