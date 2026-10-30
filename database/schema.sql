-- MindCare AI Database Schema (MySQL Compatible)
-- Database Name: mindcare_ai

CREATE DATABASE IF NOT EXISTS mindcare_ai;
USE mindcare_ai;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'patient', -- 'patient' or 'caregiver'
    age INT NULL,
    caregiver_id INT NULL,
    caregiver_code VARCHAR(50) NULL UNIQUE, -- e.g. MC-CG-1001 for caregivers
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (caregiver_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 1b. Caregiver Requests Table
CREATE TABLE IF NOT EXISTS caregiver_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    caregiver_id INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME NULL,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (caregiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Activities Table
CREATE TABLE IF NOT EXISTS activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Activity Sessions Table
CREATE TABLE IF NOT EXISTS activity_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    activity_id INT NOT NULL,
    score INT NOT NULL DEFAULT 0,
    accuracy FLOAT NOT NULL DEFAULT 0.0,
    completion_time INT NOT NULL DEFAULT 0, -- in seconds
    mistakes INT NOT NULL DEFAULT 0,
    attempts INT NOT NULL DEFAULT 1,
    difficulty VARCHAR(20) NOT NULL DEFAULT 'Easy', -- 'Easy', 'Medium', 'Hard'
    performance_category VARCHAR(50) NOT NULL DEFAULT 'Normal Progress', -- 'Needs Support', 'Normal Progress', 'Good Progress'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

-- 4. Recommendations Table
CREATE TABLE IF NOT EXISTS recommendations (
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
);

-- 5. Reminders Table
CREATE TABLE IF NOT EXISTS reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    caregiver_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    reminder_date VARCHAR(20) NOT NULL,
    reminder_time VARCHAR(20) NOT NULL,
    repeat_option VARCHAR(20) DEFAULT 'None', -- 'None', 'Daily', 'Weekly'
    status VARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Completed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (caregiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Assistance Requests Table
CREATE TABLE IF NOT EXISTS assistance_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    caregiver_id INT NULL,
    message TEXT,
    status VARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Resolved'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Memory Items Table
CREATE TABLE IF NOT EXISTS memory_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'Family', 'Routine', 'Place', 'Note'
    description TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Familiar People Table (Caregiver Uploaded Photos & Descriptions)
CREATE TABLE IF NOT EXISTS familiar_people (
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
);

-- =========================================================
-- SEED DATA
-- Default Passwords: "password123" (hashed via pbkdf2:sha256 in production or standard hash)
-- =========================================================

-- Insert Caregiver (ID: 1)
INSERT INTO users (id, name, email, password, role, age, caregiver_id, caregiver_code) VALUES
(1, 'Dr. Sarah Jenkins', 'caregiver@mindcare.ai', 'pbkdf2:sha256:260000$saltsalt$164748981f9b360a5ceefc434914c6e1189d28eeef97e59c25608df930cfa261', 'caregiver', 42, NULL, 'MC-CG-1001')
ON DUPLICATE KEY UPDATE id=id, caregiver_code=VALUES(caregiver_code);

-- Insert Patient (ID: 2) associated with Caregiver 1
INSERT INTO users (id, name, email, password, role, age, caregiver_id) VALUES
(2, 'Robert Miller', 'patient@mindcare.ai', 'pbkdf2:sha256:260000$saltsalt$164748981f9b360a5ceefc434914c6e1189d28eeef97e59c25608df930cfa261', 'patient', 74, 1)
ON DUPLICATE KEY UPDATE id=id;

-- Insert Seed Accepted Caregiver Request
INSERT INTO caregiver_requests (id, patient_id, caregiver_id, status, requested_at, responded_at) VALUES
(1, 2, 1, 'accepted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE id=id;

-- Insert Sample Familiar People for Robert Miller
INSERT INTO familiar_people (id, patient_id, caregiver_id, name, relationship, photo_path, description) VALUES
(1, 2, 1, 'Anitha Miller', 'Daughter', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400', 'Calls every evening at 6:00 PM. Lives in Chicago.'),
(2, 2, 1, 'David Miller', 'Son', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400', 'Visits every Sunday morning. Loves playing chess with you.'),
(3, 2, 1, 'Sarah Miller', 'Granddaughter', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400', 'Loves gardening and baking cookies with you on weekends.')
ON DUPLICATE KEY UPDATE id=id;

-- Insert 8 Standard Cognitive Activities
INSERT INTO activities (id, name, description) VALUES
(1, 'Memory Matching', 'Match hidden pairs of cards to exercise visual memory.'),
(2, 'Picture Recall', 'Observe objects briefly and recall what was shown.'),
(3, 'Sequence Memory', 'Remember and repeat a numbered light-up sequence.'),
(4, 'Object Recognition', 'Identify everyday household objects from clear pictures.'),
(5, 'Word Memory', 'Memorize a short word list and identify them from options.'),
(6, 'Name & Face Recognition', 'Associate friendly faces with their correct names.'),
(7, 'Daily Event Sequencing', 'Arrange daily routine activities into correct chronological order.'),
(8, 'Simple Puzzles', 'Solve odd-one-out and basic pattern completion challenges.')
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);

-- Insert Sample Reminders for Robert
INSERT INTO reminders (id, patient_id, caregiver_id, title, description, reminder_date, reminder_time, repeat_option, status) VALUES
(1, 2, 1, 'Morning Hydration', 'Drink a large glass of warm water after waking up.', '2026-09-10', '08:00 AM', 'Daily', 'Pending'),
(2, 2, 1, 'Cognitive Activity', 'Complete 15 minutes of Memory Matching on MindCare AI.', '2026-09-10', '10:30 AM', 'Daily', 'Pending'),
(3, 2, 1, 'Afternoon Walk', 'Take a 20-minute gentle walk in the garden with family.', '2026-09-10', '04:00 PM', 'Daily', 'Pending')
ON DUPLICATE KEY UPDATE id=id;

-- Insert Sample Memory Assistance Items
INSERT INTO memory_items (id, patient_id, title, category, description) VALUES
(1, 2, 'Anitha Miller', 'Family', 'Daughter — Calls every evening at 6:00 PM. Lives in Chicago.'),
(2, 2, 'David Miller', 'Family', 'Son — Visits every Sunday morning. Loves playing chess with you.'),
(3, 2, 'Evening Herbal Tea', 'Routine', 'Enjoy a warm chamomile tea at 7:30 PM before bed.'),
(4, 2, 'Home Address', 'Place', '142 Maplewood Drive, Apartment 4B.')
ON DUPLICATE KEY UPDATE id=id;

-- Insert Initial Activity Session History
INSERT INTO activity_sessions (patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty, performance_category) VALUES
(2, 1, 80, 85.0, 42, 2, 1, 'Easy', 'Good Progress'),
(2, 2, 70, 75.0, 55, 3, 1, 'Easy', 'Normal Progress'),
(2, 4, 90, 90.0, 30, 1, 1, 'Easy', 'Good Progress'),
(2, 3, 60, 60.0, 75, 5, 2, 'Medium', 'Needs Support')
ON DUPLICATE KEY UPDATE id=id;

-- Insert Sample Recommendations
INSERT INTO recommendations (patient_id, activity_id, performance_category, recommended_difficulty, recommendation_reason, caregiver_reason, score, stage) VALUES
(2, 3, 'Needs Support', 'Easy', "Let's practice remembering sequences today to strengthen your pattern recall.", "Sequence Memory accuracy is 60.0% with 5 mistakes. Recommended Easy level for targeted pattern recall reinforcement.", 92.5, 'Personalized Stage'),
(2, 1, 'Good Progress', 'Medium', "Great job on Memory Matching! Let's try the Medium challenge today.", "Memory Matching accuracy is 85.0% with low mistakes. Recommended Medium level for gradual cognitive progression.", 78.0, 'Personalized Stage')
ON DUPLICATE KEY UPDATE id=id;
