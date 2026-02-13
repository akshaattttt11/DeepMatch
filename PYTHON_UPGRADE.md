# Python Upgrade Guide

## Problem
Your current Python version (3.7.0) is too old. The `resend` package requires Python 3.8+.

## Solution Options

### Option 1: Upgrade Python (Recommended for Local Development)

1. **Download Python 3.11** (latest stable):
   - Visit: https://www.python.org/downloads/
   - Download Python 3.11.x for Windows
   - **IMPORTANT**: Check "Add Python to PATH" during installation

2. **Verify Installation**:
   ```powershell
   python --version
   # Should show: Python 3.11.x
   ```

3. **Recreate Virtual Environment**:
   ```powershell
   cd C:\Users\Akshat\DeepMatch\backend
   
   # Remove old venv if exists
   Remove-Item -Recurse -Force venv -ErrorAction SilentlyContinue
   
   # Create new venv
   python -m venv venv
   
   # Activate venv
   .\venv\Scripts\Activate.ps1
   
   # Install dependencies
   pip install -r requirements.txt
   ```

4. **Run Backend**:
   ```powershell
   python app.py
   ```

### Option 2: Use Docker (Matches Production)

Since you're already using Docker on Render, you can run locally with Docker:

```powershell
cd C:\Users\Akshat\DeepMatch

# Build Docker image
docker build -t deepmatch-backend ./backend

# Run container
docker run -p 5000:5000 --env-file .env deepmatch-backend
```

### Option 3: Temporary Workaround (Development Only)

I've updated `email_service.py` to handle missing resend gracefully. The backend will start but emails won't work until you upgrade Python.

**Note**: For production (Render), Docker already uses Python 3.8+, so this is only a local development issue.

## Running Backend + Expo Go

1. **Terminal 1 - Start Backend**:
   ```powershell
   cd C:\Users\Akshat\DeepMatch\backend
   python app.py
   ```
   Backend runs on: `http://localhost:5000`

2. **Terminal 2 - Start Expo**:
   ```powershell
   cd C:\Users\Akshat\DeepMatch
   npx expo start
   ```

3. **Scan QR Code** with Expo Go app on your phone

## Important Notes

- `app.py` is the **backend server** (Flask API)
- Expo Go runs the **frontend** (React Native app)
- They communicate via `API_BASE_URL` in your app config
- For local testing, make sure `API_BASE_URL` points to `http://localhost:5000` or your local IP
