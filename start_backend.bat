@echo off
echo Starting Predictive Maintenance Backend...
call venv\Scripts\activate.bat
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
