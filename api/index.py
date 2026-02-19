"""
Vercel serverless entry point.
Vercel looks for `app` in api/index.py and routes all /api/* requests here.
"""
from main import app  # re-export the FastAPI app

# Vercel picks up the `app` object automatically.
