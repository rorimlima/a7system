"""
Vercel Serverless Function entrypoint for A7SYSTEM FastAPI backend.
"""
import os
import sys

# Ensure backend folder is in sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from main import app

# Vercel's @vercel/python automatically uses `app`
