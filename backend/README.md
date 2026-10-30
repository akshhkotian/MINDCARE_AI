# MindCare AI - Backend (Flask REST API & ML Model)

## Features
- Flask RESTful APIs for Authentication, Activities, Session Tracking, ML Predictions, Reminders, Assistance, and Memory Care.
- **Random Forest Classifier** trained on synthetic performance data using Scikit-Learn.
- MySQL database integration with automatic SQLite zero-config fallback.

## Quick Setup
1. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
2. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```
3. Run Flask server:
   ```bash
   python app.py
   ```
