import os

# Try loading python-dotenv if installed, otherwise proceed gracefully
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'default_mindcare_secret_key_2026')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 3306))
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('DB_NAME', 'mindcare_ai')
    
    # Path for ML Trained Model
    MODEL_PATH = os.path.join(BASE_DIR, 'ml', 'model.pkl')
    
    # SQLite Fallback DB Path for zero-friction local execution if MySQL server is unavailable
    SQLITE_DB_PATH = os.path.join(BASE_DIR, 'mindcare_ai_fallback.db')
