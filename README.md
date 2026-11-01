# MindCare AI – Cognitive Activities & Memory Care Assistant

**MindCare AI** is a supportive cognitive activity and memory assistance platform designed for Alzheimer's patients and their caregivers. 

> [!NOTE]
> **Medical Disclaimer:** MindCare AI is a supportive cognitive activity and memory assistance platform. It does **not** diagnose, treat, or replace professional medical advice. The Random Forest machine-learning model evaluates **activity performance only**, not disease severity.

---

## 🌟 Tech Stack & Key Features

* **Frontend**: React 18, Bootstrap 5, React Router DOM 6, Chart.js (`react-chartjs-2`), Web Speech API (Voice Assistance).
* **Backend**: Python 3, Flask, Flask-CORS, REST APIs.
* **Machine Learning**: Python, Scikit-learn, Random Forest Classifier (`model.pkl`), Pandas, NumPy, Joblib.
* **Database**: MySQL (`mindcare_ai` schema) with automatic **SQLite zero-config fallback mode** for instant zero-friction local execution.

### Key Capabilities
1. **Patient Interface**:
   - Large readable fonts (>=18px), high contrast buttons, calming color palette.
   - **8 Playable Cognitive Activities**:
     - Activity 1: Memory Matching (Card flipping 4, 6, 8 pairs)
     - Activity 2: Picture Recall (Timed observation & recall test)
     - Activity 3: Sequence Memory (Light-up repetition pattern)
     - Activity 4: Object Recognition (Familiar item identification)
     - Activity 5: Word Memory (Short word list memorization)
     - Activity 6: Name & Face Recognition (Avatar & name association)
     - Activity 7: Daily Event Sequencing (Routine chronological ordering)
     - Activity 8: Simple Puzzles (Odd-one-out and number pattern completion)
   - Prominent **"I Need Help"** emergency assistance button.
   - **Voice Assistance** (Browser Web Speech API Text-to-Speech & Speech Recognition).
   - Memory Cards & Daily Reminders view.

2. **Machine Learning & Adaptive Difficulty**:
   - **Random Forest Classifier** trained on synthetic activity performance data (accuracy, score, completion time, mistakes, attempts, difficulty).
   - Real-time classification into: `Needs Support`, `Normal Progress`, `Good Progress`.
   - Adaptive difficulty transitions (`Easy` ↔ `Medium` ↔ `Hard`) with supportive patient feedback.

3. **Caregiver Dashboard**:
   - Patient overview, performance summary cards, and activity history table.
   - Interactive **Chart.js trajectory charts** (Accuracy & Mistakes over time).
   - Reminders creation & management.
   - Emergency assistance alert resolution center.
   - Memory care cards management (family names, notes, routines).

---

## 🔑 Demo Login Credentials

You can test the application immediately using these pre-seeded demo accounts:

| User Type | Email | Password | Role / Account Details |
| :--- | :--- | :--- | :--- |
| **Patient** | `patient@mindcare.ai` | `password123` | Ramesh Patel (Age 74) |
| **Caregiver** | `caregiver@mindcare.ai` | `password123` | Dr. Priya Sharma |

*(You can also use the one-click demo login buttons on the Login page).*

---

## 🚀 Setup & Execution Guide (VS Code)

### Prerequisites
- **Node.js**: v16+ or v18+
- **Python**: v3.8+ or v3.10+
- **MySQL**: (Optional) MySQL Server 8.0+. *Note: If MySQL is not running, the application automatically initializes an embedded SQLite database with zero setup required.*

---

### Step 1: Database Setup (MySQL Optional)

If using MySQL Server:
1. Open MySQL Workbench or Command Line.
2. Run the provided schema file located at `database/schema.sql`:
   ```bash
   mysql -u root -p < database/schema.sql
   ```

---

### Step 2: Backend Setup (Flask & Machine Learning)

1. Open a terminal in VS Code and navigate to `backend/`:
   ```bash
   cd backend
   ```

2. Create a Python Virtual Environment:
   * **Windows**:
     ```cmd
     python -m venv venv
     venv\Scripts\activate
     ```
   * **macOS / Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Train the Random Forest Machine Learning Model:
   ```bash
   python ml/train_model.py
   ```
   *(This generates synthetic performance data, trains the Scikit-Learn `RandomForestClassifier`, and outputs `ml/model.pkl`).*

5. Start the Flask REST API Server:
   ```bash
   python app.py
   ```
   The Flask server will start running at: `http://127.0.0.1:5000`

---

### Step 3: Frontend Setup (React & Bootstrap 5)

1. Open a **second terminal** in VS Code and navigate to `frontend/`:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Start the Vite React development server:
   ```bash
   npm run dev
   ```

4. Open your browser and go to:
   ```
   http://localhost:5173
   ```

---

## 📁 Project Structure

```
c:/Alzheimer/
│
├── database/
│   └── schema.sql              # MySQL DDL schema + pre-seeded data
│
├── backend/
│   ├── app.py                  # Flask entrypoint & CORS setup
│   ├── config.py               # Environment configuration
│   ├── database.py             # Database connector (MySQL + SQLite fallback)
│   ├── requirements.txt        # Python backend dependencies
│   ├── .env                    # Environment credentials
│   ├── routes/
│   │   ├── auth.py             # Authentication endpoints (Password hashing)
│   │   ├── activities.py       # Cognitive activity listing APIs
│   │   ├── sessions.py         # Session recording + ML integration
│   │   ├── ml.py               # ML prediction API endpoint
│   │   ├── recommendations.py  # Patient recommendations API
│   │   ├── reminders.py        # Reminders APIs
│   │   ├── assistance.py       # Emergency help request APIs
│   │   └── memory.py           # Memory card management APIs
│   └── ml/
│       ├── train_model.py      # Random Forest training script
│       ├── predict.py          # Real-time inference & adaptive difficulty
│       └── model.pkl           # Trained Scikit-Learn model binary
│
├── frontend/
│   ├── index.html              # Main HTML entrypoint with Bootstrap 5
│   ├── package.json            # Node dependencies (React 18, React Router, Chart.js)
│   └── src/
│       ├── index.css           # Elderly-friendly custom design system
│       ├── App.jsx             # React Router route definitions
│       ├── main.jsx            # React root renderer
│       ├── services/api.js     # Axios REST client
│       ├── context/
│       │   ├── AuthContext.jsx  # User session & role state
│       │   └── VoiceContext.jsx # Web Speech API Text-to-Speech & Speech Recognition
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── Footer.jsx
│       │   ├── HelpButton.jsx       # Emergency "I Need Help" button
│       │   ├── VoiceAssistant.jsx   # Floating voice control widget
│       │   ├── ProtectedRoute.jsx   # Role-based route guard
│       │   └── MedicalDisclaimer.jsx
│       ├── pages/
│       │   ├── auth/           # Login & Register
│       │   ├── patient/        # Patient Dashboard, Reminders, Memory, Progress, Help
│       │   └── caregiver/      # Caregiver Dashboard, Analytics, Reminders, Help alerts
│       └── activities/         # 8 Cognitive Activity Components
│           ├── MemoryMatching.jsx
│           ├── PictureRecall.jsx
│           ├── SequenceMemory.jsx
│           ├── ObjectRecognition.jsx
│           ├── WordMemory.jsx
│           ├── NameFaceRecognition.jsx
│           ├── DailyEventSequencing.jsx
│           └── SimplePuzzles.jsx
│
└── README.md                   # Full documentation & setup guide
```

---

## 🌐 Cloud Deployment & Cross-Device Synchronization

MindCare AI is production-ready for free cloud hosting with real-time **cross-device data synchronization**. When you log in with the same account on a laptop, mobile phone, or tablet, all completed activities, reminders, caregiver connections, and memory cards immediately sync across all devices.

### Option 1: Unified Full-Stack Deployment on Render (Recommended - Free)

1. **Push your code to GitHub** (already configured at `https://github.com/akshhkotian/MINDCARE_AI.git`).
2. Go to **[Render.com](https://render.com)** and sign in with GitHub.
3. Click **New +** → **Web Service**.
4. Connect the repository `MINDCARE_AI`.
5. Render will automatically detect the settings from `render.yaml` or fill in:
   - **Environment**: `Python`
   - **Build Command**: 
     ```bash
     pip install --upgrade pip && pip install -r backend/requirements.txt
     ```
   - **Start Command**:
     ```bash
     gunicorn --chdir backend "app:create_app()"
     ```
6. Click **Deploy Web Service**.
7. Once deployed, Render gives you a public URL (e.g. `https://mindcare-ai-xxxx.onrender.com`).
   - Open this URL on your **laptop** and log in.
   - Open the **same URL on your phone or tablet** and log in with the same credentials.
   - Any game played, reminder added, or note created on one device will instantly reflect on the other!

### Option 2: Connecting a Cloud Database (For Permanent Data Persistence)

For 100% permanent cloud persistence across container reboots, connect a free managed MySQL database (e.g., from [TiDB Cloud](https://tidbcloud.com) or [Aiven](https://aiven.io) or [Railway](https://railway.app)):

In Render/Railway Environment Variables, add:
- `DATABASE_URL` = `mysql://user:password@gateway.tidbcloud.com:4000/mindcare_ai?ssl-mode=REQUIRED`
*(The backend automatically creates all tables, seeds demo data, and enables SSL encryption).*

---

## 📜 License & Academic Notes

Developed as an academic prototype for supportive cognitive care and memory assistance. All machine learning classifications reflect activity performance metrics and do not diagnose medical conditions.
