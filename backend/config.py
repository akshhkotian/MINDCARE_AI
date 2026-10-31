import os
from urllib.parse import urlparse, unquote

# Try loading python-dotenv if installed, otherwise proceed gracefully
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Check for unified database connection string (e.g. from TiDB Cloud, Aiven, Railway, Render)
DATABASE_URL = os.getenv('DATABASE_URL') or os.getenv('MYSQL_URL') or ''

db_host = os.getenv('DB_HOST', 'localhost')
db_port = int(os.getenv('DB_PORT', 3306))
db_user = os.getenv('DB_USER', 'root')
db_password = os.getenv('DB_PASSWORD', '')
db_name = os.getenv('DB_NAME', 'mindcare_ai')
db_ssl = os.getenv('DB_SSL', '').lower() in ['1', 'true', 'yes', 'required']

if DATABASE_URL and (DATABASE_URL.startswith('mysql://') or DATABASE_URL.startswith('mysql+pymysql://')):
    clean_url = DATABASE_URL.replace('mysql+pymysql://', 'mysql://')
    parsed = urlparse(clean_url)
    if parsed.hostname:
        db_host = parsed.hostname
    if parsed.port:
        db_port = parsed.port
    if parsed.username:
        db_user = unquote(parsed.username)
    if parsed.password:
        db_password = unquote(parsed.password)
    if parsed.path:
        db_name = parsed.path.lstrip('/')
    if 'ssl' in parsed.query.lower():
        db_ssl = True

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'default_mindcare_secret_key_2026')
    DB_HOST = db_host
    DB_PORT = db_port
    DB_USER = db_user
    DB_PASSWORD = db_password
    DB_NAME = db_name
    DB_SSL = db_ssl
    
    # Path for ML Trained Model
    MODEL_PATH = os.path.join(BASE_DIR, 'ml', 'model.pkl')
    
    # SQLite Fallback DB Path for zero-friction local execution if MySQL server is unavailable
    SQLITE_DB_PATH = os.getenv('SQLITE_DB_PATH', os.path.join(BASE_DIR, 'mindcare_ai_fallback.db'))
