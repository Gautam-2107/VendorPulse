"""Pytest configuration and global fixtures for VendorPulse tests."""

import sys
from pathlib import Path

# Automatically add 'backend' directory to sys.path so tests run seamlessly from repo root without setting PYTHONPATH
backend_dir = Path(__file__).resolve().parents[2]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
