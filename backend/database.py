import os
import sqlite3
from werkzeug.security import generate_password_hash
from config import Config

# Global indicator for active DB engine
USE_SQLITE_FALLBACK = False

def get_db_connection():
    """
    Attempts to connect to MySQL database as specified in config.
    If MySQL server connection fails, falls back to SQLite for robust local execution.
    """
    global USE_SQLITE_FALLBACK
    if not USE_SQLITE_FALLBACK:
        try:
            import pymysql
            connection = pymysql.connect(
                host=Config.DB_HOST,
                port=Config.DB_PORT,
                user=Config.DB_USER,
                password=Config.DB_PASSWORD,
                database=Config.DB_NAME,
                cursorclass=pymysql.cursors.DictCursor,
                autocommit=True,
                connect_timeout=3
            )
            return connection
        except Exception as e:
            print(f"[Database Warning] MySQL Connection failed ({e}). Falling back to SQLite database at {Config.SQLITE_DB_PATH}")
            USE_SQLITE_FALLBACK = True

    # SQLite fallback connection
    conn = sqlite3.connect(Config.SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """
    Initializes database tables and seeds demo records if database is empty.
    """
    conn = get_db_connection()
    if USE_SQLITE_FALLBACK:
        cursor = conn.cursor()
        # Create Tables in SQLite
        cursor.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'patient',
            age INTEGER NULL,
            caregiver_id INTEGER NULL,
            caregiver_code TEXT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (caregiver_id) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS caregiver_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            caregiver_id INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            responded_at DATETIME NULL,
            FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (caregiver_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS familiar_people (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            caregiver_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            relationship TEXT NOT NULL,
            photo_path TEXT NOT NULL,
            description TEXT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (caregiver_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS activity_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            activity_id INTEGER NOT NULL,
            score INTEGER NOT NULL DEFAULT 0,
            accuracy REAL NOT NULL DEFAULT 0.0,
            completion_time INTEGER NOT NULL DEFAULT 0,
            mistakes INTEGER NOT NULL DEFAULT 0,
            attempts INTEGER NOT NULL DEFAULT 1,
            difficulty TEXT NOT NULL DEFAULT 'Easy',
            performance_category TEXT NOT NULL DEFAULT 'Normal Progress',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            activity_id INTEGER NOT NULL,
            performance_category TEXT NOT NULL,
            recommended_difficulty TEXT NOT NULL,
            recommendation_reason TEXT NULL,
            caregiver_reason TEXT NULL,
            score REAL DEFAULT 0.0,
            stage TEXT DEFAULT 'Personalized Stage',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            caregiver_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            reminder_date TEXT NOT NULL,
            reminder_time TEXT NOT NULL,
            repeat_option TEXT DEFAULT 'None',
            status TEXT DEFAULT 'Pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (caregiver_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS assistance_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            caregiver_id INTEGER NULL,
            message TEXT,
            status TEXT DEFAULT 'Pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS memory_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
        );
        ''')
        
        # Seed initial data if users table is empty
        cursor.execute("SELECT COUNT(*) as cnt FROM users")
        if cursor.fetchone()['cnt'] == 0:
            demo_password = generate_password_hash("password123")
            
            # Insert Caregiver
            cursor.execute('''
                INSERT INTO users (id, name, email, password, role, age, caregiver_id, caregiver_code)
                VALUES (1, 'Dr. Sarah Jenkins', 'caregiver@mindcare.ai', ?, 'caregiver', 42, NULL, 'MC-CG-1001')
            ''', (demo_password,))
            
            # Insert Patient
            cursor.execute('''
                INSERT INTO users (id, name, email, password, role, age, caregiver_id)
                VALUES (2, 'Robert Miller', 'patient@mindcare.ai', ?, 'patient', 74, 1)
            ''', (demo_password,))
            
            # Insert Seed Accepted Caregiver Request
            cursor.execute('''
                INSERT INTO caregiver_requests (id, patient_id, caregiver_id, status)
                VALUES (1, 2, 1, 'accepted')
            ''')
            
            # Insert Seed Familiar People
            fam_people = [
                (1, 2, 1, 'Anitha Miller', 'Daughter', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400', 'Calls every evening at 6:00 PM. Lives in Chicago.'),
                (2, 2, 1, 'David Miller', 'Son', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400', 'Visits every Sunday morning. Loves playing chess with you.'),
                (3, 2, 1, 'Sarah Miller', 'Granddaughter', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400', 'Loves gardening and baking cookies with you on weekends.')
            ]
            cursor.executemany("INSERT INTO familiar_people (id, patient_id, caregiver_id, name, relationship, photo_path, description) VALUES (?, ?, ?, ?, ?, ?, ?)", fam_people)

            # Insert 8 Standard Cognitive Activities
            activities = [
                (1, 'Memory Matching', 'Match hidden pairs of cards to exercise visual memory.'),
                (2, 'Picture Recall', 'Observe objects briefly and recall what was shown.'),
                (3, 'Sequence Memory', 'Remember and repeat a numbered light-up sequence.'),
                (4, 'Object Recognition', 'Identify everyday household objects from clear pictures.'),
                (5, 'Word Memory', 'Memorize a short word list and identify them from options.'),
                (6, 'Name & Face Recognition', 'Associate friendly faces with their correct names.'),
                (7, 'Daily Event Sequencing', 'Arrange daily routine activities into correct chronological order.'),
                (8, 'Simple Puzzles', 'Solve odd-one-out and basic pattern completion challenges.')
            ]
            cursor.executemany("INSERT INTO activities (id, name, description) VALUES (?, ?, ?)", activities)
            
            # Insert Reminders
            reminders = [
                (1, 2, 1, 'Morning Hydration', 'Drink a large glass of warm water after waking up.', '2026-09-10', '08:00 AM', 'Daily', 'Pending'),
                (2, 2, 1, 'Cognitive Activity', 'Complete 15 minutes of Memory Matching on MindCare AI.', '2026-09-10', '10:30 AM', 'Daily', 'Pending'),
                (3, 2, 1, 'Afternoon Walk', 'Take a 20-minute gentle walk in the garden with family.', '2026-09-10', '04:00 PM', 'Daily', 'Pending')
            ]
            cursor.executemany("INSERT INTO reminders (id, patient_id, caregiver_id, title, description, reminder_date, reminder_time, repeat_option, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", reminders)
            
            # Insert Memory Items
            mem_items = [
                (1, 2, 'Anitha Miller', 'Family', 'Daughter — Calls every evening at 6:00 PM. Lives in Chicago.'),
                (2, 2, 'David Miller', 'Family', 'Son — Visits every Sunday morning. Loves playing chess with you.'),
                (3, 2, 'Evening Herbal Tea', 'Routine', 'Enjoy a warm chamomile tea at 7:30 PM before bed.'),
                (4, 2, 'Home Address', 'Place', '142 Maplewood Drive, Apartment 4B.')
            ]
            cursor.executemany("INSERT INTO memory_items (id, patient_id, title, category, description) VALUES (?, ?, ?, ?, ?)", mem_items)
            
            # Insert Initial Sessions
            sessions = [
                (2, 1, 80, 85.0, 42, 2, 1, 'Easy', 'Good Progress'),
                (2, 2, 70, 75.0, 55, 3, 1, 'Easy', 'Normal Progress'),
                (2, 4, 90, 90.0, 30, 1, 1, 'Easy', 'Good Progress'),
                (2, 3, 60, 60.0, 75, 5, 2, 'Medium', 'Needs Support')
            ]
            cursor.executemany("INSERT INTO activity_sessions (patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty, performance_category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", sessions)
            
            # Insert Initial Recommendations
            recs = [
                (2, 3, 'Needs Support', 'Easy', "Let's practice remembering sequences today to strengthen your pattern recall.", "Sequence Memory accuracy is 60.0% with 5 mistakes. Recommended Easy level for targeted pattern recall reinforcement.", 92.5, 'Personalized Stage'),
                (2, 1, 'Good Progress', 'Medium', "Great job on Memory Matching! Let's try the Medium challenge today.", "Memory Matching accuracy is 85.0% with low mistakes. Recommended Medium level for gradual cognitive progression.", 78.0, 'Personalized Stage')
            ]
            cursor.executemany("INSERT INTO recommendations (patient_id, activity_id, performance_category, recommended_difficulty, recommendation_reason, caregiver_reason, score, stage) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", recs)

        # Migration helpers for existing SQLite databases
        cursor.execute("PRAGMA table_info(users)")
        user_cols = [c[1] for c in cursor.fetchall()]
        if 'caregiver_code' not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN caregiver_code TEXT NULL")
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_caregiver_code ON users(caregiver_code)")
            cursor.execute("UPDATE users SET caregiver_code = 'MC-CG-1001' WHERE id = 1 AND role = 'caregiver'")

        cursor.execute("PRAGMA table_info(recommendations)")
        rec_cols = [c[1] for c in cursor.fetchall()]
        if 'recommendation_reason' not in rec_cols:
            cursor.execute("ALTER TABLE recommendations ADD COLUMN recommendation_reason TEXT NULL")
        if 'caregiver_reason' not in rec_cols:
            cursor.execute("ALTER TABLE recommendations ADD COLUMN caregiver_reason TEXT NULL")
        if 'score' not in rec_cols:
            cursor.execute("ALTER TABLE recommendations ADD COLUMN score REAL DEFAULT 0.0")
        if 'stage' not in rec_cols:
            cursor.execute("ALTER TABLE recommendations ADD COLUMN stage TEXT DEFAULT 'Personalized Stage'")

        conn.commit()
        conn.close()
        print("[Database] SQLite database initialized with seed data.")
    else:
        # MySQL Initialization
        try:
            with conn.cursor() as cursor:
                # Read schema script or execute table checks
                pass
            conn.close()
            print("[Database] Connected to MySQL database.")
        except Exception as e:
            print(f"[Database Error] Failed to initialize MySQL: {e}")

def execute_query(query, params=(), fetchone=False, fetchall=False, commit=False):
    """
    Unified helper to execute SQL queries across MySQL or SQLite.
    Returns standard Python dictionaries for rows.
    """
    conn = get_db_connection()
    result = None
    try:
        if USE_SQLITE_FALLBACK:
            # Convert MySQL %s placeholder to SQLite ? placeholder if needed
            query_sqlite = query.replace('%s', '?')
            cursor = conn.cursor()
            cursor.execute(query_sqlite, params)
            
            if commit:
                conn.commit()
                result = cursor.lastrowid
            elif fetchone:
                row = cursor.fetchone()
                result = dict(row) if row else None
            elif fetchall:
                rows = cursor.fetchall()
                result = [dict(row) for row in rows]
            conn.close()
        else:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                if commit:
                    conn.commit()
                    result = cursor.lastrowid
                elif fetchone:
                    result = cursor.fetchone()
                elif fetchall:
                    result = cursor.fetchall()
            conn.close()
    except Exception as e:
        print(f"[Query Error] Query failed: {query} Error: {e}")
        if conn:
            conn.close()
        raise e
    return result
