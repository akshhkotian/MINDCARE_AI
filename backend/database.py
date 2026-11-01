import os
import sqlite3
import queue
import threading
import time
from werkzeug.security import generate_password_hash
from config import Config

# Global indicator for active DB engine
USE_SQLITE_FALLBACK = False

class MySQLConnectionPool:
    """
    High-performance thread-safe connection pool for cloud MySQL (TiDB Cloud).
    Reuses persistent SSL connections to eliminate 1.8s+ handshake overhead on every query.
    """
    def __init__(self, max_connections=10):
        self.max_connections = max_connections
        self.pool = queue.Queue(maxsize=max_connections)
        self.lock = threading.Lock()
        self.created_count = 0

    def _create_connection(self):
        import pymysql
        ssl_opts = None
        if getattr(Config, 'DB_SSL', False) or any(h in (Config.DB_HOST or '').lower() for h in ['tidb', 'aiven', 'planetscale', 'rds.amazonaws.com', 'clever-cloud']):
            import ssl
            ssl_opts = ssl.create_default_context()

        conn_kwargs = {
            'host': Config.DB_HOST,
            'port': Config.DB_PORT,
            'user': Config.DB_USER,
            'password': Config.DB_PASSWORD,
            'database': Config.DB_NAME,
            'cursorclass': pymysql.cursors.DictCursor,
            'autocommit': True,
            'connect_timeout': 10 if (Config.DB_HOST not in ['localhost', '127.0.0.1']) else 2
        }
        if ssl_opts is not None:
            conn_kwargs['ssl'] = ssl_opts

        return pymysql.connect(**conn_kwargs)

    def get_connection(self):
        # 1. Grab an idle connection from the pool if available
        while not self.pool.empty():
            try:
                conn, last_used = self.pool.get_nowait()
                now = time.time()
                # If used within 45s, reuse without ping for instant 0ms latency
                if now - last_used < 45:
                    return conn
                # If idle for >45s, verify it is still alive
                try:
                    conn.ping()
                    return conn
                except Exception:
                    try:
                        conn.close()
                    except Exception:
                        pass
                    with self.lock:
                        self.created_count = max(0, self.created_count - 1)
            except queue.Empty:
                break

        # 2. If under limit, create a new connection
        with self.lock:
            if self.created_count < self.max_connections:
                self.created_count += 1
                try:
                    return self._create_connection()
                except Exception as e:
                    self.created_count -= 1
                    raise e

        # 3. Wait up to 3s for an existing connection to be released back
        try:
            conn, _ = self.pool.get(timeout=3)
            return conn
        except queue.Empty:
            return self._create_connection()

    def release_connection(self, conn, is_healthy=True):
        if conn is None:
            return
        if not is_healthy:
            try:
                conn.close()
            except Exception:
                pass
            with self.lock:
                self.created_count = max(0, self.created_count - 1)
            return

        try:
            self.pool.put_nowait((conn, time.time()))
        except queue.Full:
            try:
                conn.close()
            except Exception:
                pass
            with self.lock:
                self.created_count = max(0, self.created_count - 1)

    def warm_up(self, count=2):
        """Pre-warms connections in the background so the very first queries respond instantly."""
        def _warm():
            for _ in range(count):
                try:
                    conn = self._create_connection()
                    with self.lock:
                        self.created_count += 1
                    self.release_connection(conn, is_healthy=True)
                except Exception as e:
                    print(f"[Pool Warm-up] Warning: {e}")
                    break
        t = threading.Thread(target=_warm, daemon=True)
        t.start()

mysql_pool = MySQLConnectionPool(max_connections=10)

def get_db_connection():
    """
    Attempts to connect to MySQL database as specified in config (supports cloud hosts & SSL).
    If MySQL server connection fails or is not configured, falls back to SQLite for robust local execution.
    """
    global USE_SQLITE_FALLBACK
    if not USE_SQLITE_FALLBACK:
        try:
            import pymysql
            ssl_opts = None
            if getattr(Config, 'DB_SSL', False) or any(h in (Config.DB_HOST or '').lower() for h in ['tidb', 'aiven', 'planetscale', 'rds.amazonaws.com', 'clever-cloud']):
                import ssl
                ssl_opts = ssl.create_default_context()

            conn_kwargs = {
                'host': Config.DB_HOST,
                'port': Config.DB_PORT,
                'user': Config.DB_USER,
                'password': Config.DB_PASSWORD,
                'database': Config.DB_NAME,
                'cursorclass': pymysql.cursors.DictCursor,
                'autocommit': True,
                'connect_timeout': 10 if (Config.DB_HOST not in ['localhost', '127.0.0.1']) else 2
            }
            if ssl_opts is not None:
                conn_kwargs['ssl'] = ssl_opts

            connection = pymysql.connect(**conn_kwargs)
            return connection
        except Exception as e:
            if Config.DB_HOST not in ['localhost', '127.0.0.1']:
                print(f"[Database Warning] Remote MySQL connection to {Config.DB_HOST} failed ({e}). Falling back to SQLite database at {Config.SQLITE_DB_PATH}")
            else:
                print(f"[Database Info] Local MySQL server not found. Using SQLite fallback database at {Config.SQLITE_DB_PATH}")
            USE_SQLITE_FALLBACK = True

    # SQLite fallback connection
    conn = sqlite3.connect(Config.SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """
    Initializes database tables and seeds demo records if database is empty.
    Supports both SQLite and MySQL seamlessly.
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
                VALUES (1, 'Dr. Priya Sharma', 'caregiver@mindcare.ai', ?, 'caregiver', 42, NULL, 'MC-CG-1001')
            ''', (demo_password,))
            
            # Insert Patient
            cursor.execute('''
                INSERT INTO users (id, name, email, password, role, age, caregiver_id)
                VALUES (2, 'Ramesh Patel', 'patient@mindcare.ai', ?, 'patient', 74, 1)
            ''', (demo_password,))
            
            # Insert Seed Accepted Caregiver Request
            cursor.execute('''
                INSERT INTO caregiver_requests (id, patient_id, caregiver_id, status)
                VALUES (1, 2, 1, 'accepted')
            ''')
            
            # Insert Seed Familiar People
            fam_people = [
                (1, 2, 1, 'Anitha Patel', 'Daughter', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400', 'Calls every evening at 6:00 PM. Lives in Bengaluru.'),
                (2, 2, 1, 'Rahul Patel', 'Son', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400', 'Visits every Sunday morning. Loves playing chess with you.'),
                (3, 2, 1, 'Pooja Patel', 'Granddaughter', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400', 'Loves gardening and baking cookies with you on weekends.')
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
                (1, 2, 'Anitha Patel', 'Family', 'Daughter — Calls every evening at 6:00 PM. Lives in Bengaluru.'),
                (2, 2, 'Rahul Patel', 'Family', 'Son — Visits every Sunday morning. Loves playing chess with you.'),
                (3, 2, 'Evening Herbal Tea', 'Routine', 'Enjoy a warm chamomile tea at 7:30 PM before bed.'),
                (4, 2, 'Home Address', 'Place', 'Flat 402, Shanti Niketan Apartments, Bengaluru.')
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
                mysql_tables = [
                    '''CREATE TABLE IF NOT EXISTS users (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        email VARCHAR(120) NOT NULL UNIQUE,
                        password VARCHAR(255) NOT NULL,
                        role VARCHAR(20) NOT NULL DEFAULT 'patient',
                        age INT NULL,
                        caregiver_id INT NULL,
                        caregiver_code VARCHAR(50) NULL UNIQUE,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (caregiver_id) REFERENCES users(id) ON DELETE SET NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4''',
                    
                    '''CREATE TABLE IF NOT EXISTS caregiver_requests (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        patient_id INT NOT NULL,
                        caregiver_id INT NOT NULL,
                        status VARCHAR(20) NOT NULL DEFAULT 'pending',
                        requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        responded_at DATETIME NULL,
                        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (caregiver_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4''',
                    
                    '''CREATE TABLE IF NOT EXISTS activities (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        description TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4''',
                    
                    '''CREATE TABLE IF NOT EXISTS activity_sessions (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        patient_id INT NOT NULL,
                        activity_id INT NOT NULL,
                        score INT NOT NULL DEFAULT 0,
                        accuracy FLOAT NOT NULL DEFAULT 0.0,
                        completion_time INT NOT NULL DEFAULT 0,
                        mistakes INT NOT NULL DEFAULT 0,
                        attempts INT NOT NULL DEFAULT 1,
                        difficulty VARCHAR(20) NOT NULL DEFAULT 'Easy',
                        performance_category VARCHAR(50) NOT NULL DEFAULT 'Normal Progress',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4''',
                    
                    '''CREATE TABLE IF NOT EXISTS recommendations (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        patient_id INT NOT NULL,
                        activity_id INT NOT NULL,
                        performance_category VARCHAR(50) NOT NULL,
                        recommended_difficulty VARCHAR(20) NOT NULL,
                        recommendation_reason TEXT NULL,
                        caregiver_reason TEXT NULL,
                        score FLOAT DEFAULT 0.0,
                        stage VARCHAR(50) DEFAULT 'Personalized Stage',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4''',
                    
                    '''CREATE TABLE IF NOT EXISTS reminders (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        patient_id INT NOT NULL,
                        caregiver_id INT NOT NULL,
                        title VARCHAR(150) NOT NULL,
                        description TEXT,
                        reminder_date VARCHAR(20) NOT NULL,
                        reminder_time VARCHAR(20) NOT NULL,
                        repeat_option VARCHAR(20) DEFAULT 'None',
                        status VARCHAR(20) DEFAULT 'Pending',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (caregiver_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4''',
                    
                    '''CREATE TABLE IF NOT EXISTS assistance_requests (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        patient_id INT NOT NULL,
                        caregiver_id INT NULL,
                        message TEXT,
                        status VARCHAR(20) DEFAULT 'Pending',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4''',
                    
                    '''CREATE TABLE IF NOT EXISTS memory_items (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        patient_id INT NOT NULL,
                        title VARCHAR(100) NOT NULL,
                        category VARCHAR(50) NOT NULL,
                        description TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4''',
                    
                    '''CREATE TABLE IF NOT EXISTS familiar_people (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        patient_id INT NOT NULL,
                        caregiver_id INT NOT NULL,
                        name VARCHAR(100) NOT NULL,
                        relationship VARCHAR(100) NOT NULL,
                        photo_path TEXT NOT NULL,
                        description TEXT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (caregiver_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'''
                ]

                for tbl_sql in mysql_tables:
                    cursor.execute(tbl_sql)

                # Seed initial data if users table is empty
                cursor.execute("SELECT COUNT(*) AS cnt FROM users")
                cnt_row = cursor.fetchone()
                if cnt_row and cnt_row['cnt'] == 0:
                    demo_password = generate_password_hash("password123")
                    cursor.execute('''
                        INSERT INTO users (id, name, email, password, role, age, caregiver_id, caregiver_code)
                        VALUES (1, 'Dr. Priya Sharma', 'caregiver@mindcare.ai', %s, 'caregiver', 42, NULL, 'MC-CG-1001')
                    ''', (demo_password,))
                    cursor.execute('''
                        INSERT INTO users (id, name, email, password, role, age, caregiver_id)
                        VALUES (2, 'Ramesh Patel', 'patient@mindcare.ai', %s, 'patient', 74, 1)
                    ''', (demo_password,))
                    cursor.execute('''
                        INSERT INTO caregiver_requests (id, patient_id, caregiver_id, status)
                        VALUES (1, 2, 1, 'accepted')
                    ''')
                    fam_people = [
                        (1, 2, 1, 'Anitha Patel', 'Daughter', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400', 'Calls every evening at 6:00 PM. Lives in Bengaluru.'),
                        (2, 2, 1, 'Rahul Patel', 'Son', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400', 'Visits every Sunday morning. Loves playing chess with you.'),
                        (3, 2, 1, 'Pooja Patel', 'Granddaughter', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400', 'Loves gardening and baking cookies with you on weekends.')
                    ]
                    cursor.executemany("INSERT INTO familiar_people (id, patient_id, caregiver_id, name, relationship, photo_path, description) VALUES (%s, %s, %s, %s, %s, %s, %s)", fam_people)

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
                    cursor.executemany("INSERT INTO activities (id, name, description) VALUES (%s, %s, %s)", activities)

                    reminders = [
                        (1, 2, 1, 'Morning Hydration', 'Drink a large glass of warm water after waking up.', '2026-09-10', '08:00 AM', 'Daily', 'Pending'),
                        (2, 2, 1, 'Cognitive Activity', 'Complete 15 minutes of Memory Matching on MindCare AI.', '2026-09-10', '10:30 AM', 'Daily', 'Pending'),
                        (3, 2, 1, 'Afternoon Walk', 'Take a 20-minute gentle walk in the garden with family.', '2026-09-10', '04:00 PM', 'Daily', 'Pending')
                    ]
                    cursor.executemany("INSERT INTO reminders (id, patient_id, caregiver_id, title, description, reminder_date, reminder_time, repeat_option, status) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)", reminders)

                    mem_items = [
                        (1, 2, 'Anitha Patel', 'Family', 'Daughter — Calls every evening at 6:00 PM. Lives in Bengaluru.'),
                        (2, 2, 'Rahul Patel', 'Family', 'Son — Visits every Sunday morning. Loves playing chess with you.'),
                        (3, 2, 'Evening Herbal Tea', 'Routine', 'Enjoy a warm chamomile tea at 7:30 PM before bed.'),
                        (4, 2, 'Home Address', 'Place', 'Flat 402, Shanti Niketan Apartments, Bengaluru.')
                    ]
                    cursor.executemany("INSERT INTO memory_items (id, patient_id, title, category, description) VALUES (%s, %s, %s, %s, %s)", mem_items)

                    sessions = [
                        (2, 1, 80, 85.0, 42, 2, 1, 'Easy', 'Good Progress'),
                        (2, 2, 70, 75.0, 55, 3, 1, 'Easy', 'Normal Progress'),
                        (2, 4, 90, 90.0, 30, 1, 1, 'Easy', 'Good Progress'),
                        (2, 3, 60, 60.0, 75, 5, 2, 'Medium', 'Needs Support')
                    ]
                    cursor.executemany("INSERT INTO activity_sessions (patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty, performance_category) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)", sessions)

                    recs = [
                        (2, 3, 'Needs Support', 'Easy', "Let's practice remembering sequences today to strengthen your pattern recall.", "Sequence Memory accuracy is 60.0% with 5 mistakes. Recommended Easy level for targeted pattern recall reinforcement.", 92.5, 'Personalized Stage'),
                        (2, 1, 'Good Progress', 'Medium', "Great job on Memory Matching! Let's try the Medium challenge today.", "Memory Matching accuracy is 85.0% with low mistakes. Recommended Medium level for gradual cognitive progression.", 78.0, 'Personalized Stage')
                    ]
                    cursor.executemany("INSERT INTO recommendations (patient_id, activity_id, performance_category, recommended_difficulty, recommendation_reason, caregiver_reason, score, stage) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)", recs)

            conn.close()
            print("[Database] Connected to MySQL database and verified schema tables.")
            mysql_pool.warm_up(count=2)
        except Exception as e:
            print(f"[Database Error] Failed to initialize MySQL schema: {e}")

def execute_query(query, params=(), fetchone=False, fetchall=False, commit=False):
    """
    Unified helper to execute SQL queries across MySQL or SQLite.
    Reuses pooled MySQL connections with auto-recovery for maximum responsiveness.
    """
    global USE_SQLITE_FALLBACK
    if USE_SQLITE_FALLBACK:
        conn = sqlite3.connect(Config.SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
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
            return result
        finally:
            conn.close()

    # MySQL Pooled Connection Execution
    conn = None
    is_healthy = True
    try:
        try:
            conn = mysql_pool.get_connection()
        except Exception as conn_err:
            print(f"[Database Pool Info] MySQL connection failed ({conn_err}). Switching to SQLite fallback.")
            USE_SQLITE_FALLBACK = True
            return execute_query(query, params, fetchone=fetchone, fetchall=fetchall, commit=commit)

        with conn.cursor() as cursor:
            cursor.execute(query, params)
            if commit:
                conn.commit()
                result = cursor.lastrowid
            elif fetchone:
                result = cursor.fetchone()
            elif fetchall:
                result = cursor.fetchall()
        return result
    except Exception as e:
        err_msg = str(e).lower()
        if any(term in err_msg for term in ['lost connection', 'gone away', 'broken pipe', 'interfaceerror', 'operationalerror', 'timed out']):
            is_healthy = False
            try:
                if conn:
                    conn.close()
            except Exception:
                pass
            conn = None
            # Retry once with a freshly established connection
            try:
                conn = mysql_pool._create_connection()
                with conn.cursor() as cursor:
                    cursor.execute(query, params)
                    if commit:
                        conn.commit()
                        result = cursor.lastrowid
                    elif fetchone:
                        result = cursor.fetchone()
                    elif fetchall:
                        result = cursor.fetchall()
                is_healthy = True
                return result
            except Exception as retry_err:
                is_healthy = False
                print(f"[Query Retry Error] Query: {query} Error: {retry_err}")
                raise retry_err
        else:
            is_healthy = False
            print(f"[Query Error] Query: {query} Error: {e}")
            raise e
    finally:
        if conn is not None:
            mysql_pool.release_connection(conn, is_healthy=is_healthy)
