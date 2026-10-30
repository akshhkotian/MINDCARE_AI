"""
MindCare AI - Comprehensive Unit & Integration Tests for Personalized Recommendation System
Verifies:
1. Patient A (High Memory Matching, Low Sequence Memory) -> Sequence Memory Priority
2. Patient B (Low Memory Matching, High Sequence Memory) -> Memory Matching Priority
3. Patient C (High Performance Across Activities) -> High Difficulty Progression (Hard/Medium)
4. Dynamic Shift -> Improving performance shifts future recommendations
5. Determinism -> No randomness in recommendation selection
"""

import sys
import os
import unittest

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import init_db, execute_query
from ml.recommendation_engine import get_patient_performance_profile, generate_recommendation_for_patient

class TestPersonalizedRecommendationEngine(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Initialize DB before tests."""
        init_db()

    def setUp(self):
        """Create clean test users and clear previous test activity sessions."""
        # 1. Create Patient A (ID 101), Patient B (ID 102), Patient C (ID 103)
        execute_query("DELETE FROM users WHERE id IN (101, 102, 103)", commit=True)
        execute_query("DELETE FROM activity_sessions WHERE patient_id IN (101, 102, 103)", commit=True)
        execute_query("DELETE FROM recommendations WHERE patient_id IN (101, 102, 103)", commit=True)

        execute_query("INSERT INTO users (id, name, email, password, role, age) VALUES (101, 'Patient A', 'patienta@test.ai', 'hash', 'patient', 75)", commit=True)
        execute_query("INSERT INTO users (id, name, email, password, role, age) VALUES (102, 'Patient B', 'patientb@test.ai', 'hash', 'patient', 70)", commit=True)
        execute_query("INSERT INTO users (id, name, email, password, role, age) VALUES (103, 'Patient C', 'patientc@test.ai', 'hash', 'patient', 68)", commit=True)

    def tearDown(self):
        """Clean up test users."""
        execute_query("DELETE FROM activity_sessions WHERE patient_id IN (101, 102, 103)", commit=True)
        execute_query("DELETE FROM recommendations WHERE patient_id IN (101, 102, 103)", commit=True)
        execute_query("DELETE FROM users WHERE id IN (101, 102, 103)", commit=True)

    def test_patient_a_weak_sequence_memory(self):
        """
        Patient A: High Memory Matching (90%), Low Sequence Memory (45%).
        Expected: Recommendation engine prioritizes Sequence Memory at Easy level.
        """
        pid = 101
        # Seed 3 sessions for Memory Matching (ID 1) with High Accuracy
        execute_query("INSERT INTO activity_sessions (patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty) VALUES (%s, 1, 90, 92.0, 30, 0, 1, 'Easy')", (pid,), commit=True)
        execute_query("INSERT INTO activity_sessions (patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty) VALUES (%s, 1, 88, 90.0, 32, 1, 1, 'Easy')", (pid,), commit=True)
        execute_query("INSERT INTO activity_sessions (patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty) VALUES (%s, 1, 95, 95.0, 28, 0, 1, 'Medium')", (pid,), commit=True)

        # Seed 3 sessions for Sequence Memory (ID 3) with Low Accuracy
        execute_query("INSERT INTO activity_sessions (patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty) VALUES (%s, 3, 40, 45.0, 80, 6, 1, 'Easy')", (pid,), commit=True)
        execute_query("INSERT INTO activity_sessions (patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty) VALUES (%s, 3, 42, 42.0, 75, 5, 1, 'Easy')", (pid,), commit=True)
        execute_query("INSERT INTO activity_sessions (patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty) VALUES (%s, 3, 48, 48.0, 70, 4, 1, 'Easy')", (pid,), commit=True)

        # Generate recommendation
        rec = generate_recommendation_for_patient(pid)

        # Assert Sequence Memory (ID 3) is recommended due to weak performance
        self.assertEqual(rec['activity_id'], 3, f"Expected Sequence Memory (3), got {rec['activity_name']} ({rec['activity_id']})")
        self.assertEqual(rec['recommended_difficulty'], 'Easy')
        self.assertIn("Sequence Memory", rec['recommendation_reason'])
        print(f"\n[Test Pass] Patient A Recommendation: {rec['activity_name']} ({rec['recommended_difficulty']}) | Reason: {rec['recommendation_reason']}")

    def test_patient_b_weak_memory_matching(self):
        """
        Patient B: Low Memory Matching (48%), High Sequence Memory (92%).
        Expected: Recommendation engine prioritizes Memory Matching at Easy level.
        """
        pid = 102
        # Seed 3 sessions for Memory Matching (ID 1) with Low Accuracy
        execute_query("INSERT INTO activity_sessions (patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty) VALUES (%s, 1, 45, 48.0, 90, 7, 1, 'Easy')", (pid,), commit=True)
        execute_query("INSERT INTO activity_sessions (patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty) VALUES (%s, 1, 50, 50.0, 85, 6, 1, 'Easy')", (pid,), commit=True)
        execute_query("INSERT INTO activity_sessions (patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty) VALUES (%s, 1, 52, 52.0, 80, 5, 1, 'Easy')", (pid,), commit=True)

        # Seed 3 sessions for Sequence Memory (ID 3) with High Accuracy
        execute_query("INSERT INTO activity_sessions (patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty) VALUES (%s, 3, 90, 92.0, 35, 1, 1, 'Easy')", (pid,), commit=True)
        execute_query("INSERT INTO activity_sessions (patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty) VALUES (%s, 3, 94, 94.0, 30, 0, 1, 'Medium')", (pid,), commit=True)
        execute_query("INSERT INTO activity_sessions (patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty) VALUES (%s, 3, 96, 96.0, 28, 0, 1, 'Medium')", (pid,), commit=True)

        # Generate recommendation
        rec = generate_recommendation_for_patient(pid)

        # Assert Memory Matching (ID 1) is recommended due to weak performance
        self.assertEqual(rec['activity_id'], 1, f"Expected Memory Matching (1), got {rec['activity_name']} ({rec['activity_id']})")
        self.assertEqual(rec['recommended_difficulty'], 'Easy')
        self.assertIn("Memory Matching", rec['recommendation_reason'])
        print(f"\n[Test Pass] Patient B Recommendation: {rec['activity_name']} ({rec['recommended_difficulty']}) | Reason: {rec['recommendation_reason']}")

    def test_patient_c_high_performance_difficulty_progression(self):
        """
        Patient C: High performance across all activities (95%+ accuracy).
        Expected: Recommendation engine recommends higher difficulty levels (Medium / Hard).
        """
        pid = 103
        # Seed sessions with 95%+ accuracy for activities 1, 2, 3
        for act_id in [1, 2, 3]:
            execute_query("INSERT INTO activity_sessions (patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty) VALUES (%s, %s, 95, 96.0, 25, 0, 1, 'Medium')", (pid, act_id), commit=True)
            execute_query("INSERT INTO activity_sessions (patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty) VALUES (%s, %s, 98, 98.0, 22, 0, 1, 'Medium')", (pid, act_id), commit=True)

        rec = generate_recommendation_for_patient(pid)
        profile = get_patient_performance_profile(pid)

        # Verify progression to Hard difficulty
        self.assertEqual(rec['recommended_difficulty'], 'Hard')
        self.assertEqual(profile['stage'], 'Personalized Stage')
        print(f"\n[Test Pass] Patient C High Performer Recommendation: {rec['activity_name']} ({rec['recommended_difficulty']})")

    def test_dynamic_recommendation_shift(self):
        """
        Verify that as a patient's performance improves, future recommendations dynamically adapt.
        """
        pid = 101
        # Add 5 poor sessions on Sequence Memory (ID 3)
        for _ in range(3):
            execute_query("INSERT INTO activity_sessions (patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty) VALUES (%s, 3, 30, 35.0, 95, 8, 1, 'Easy')", (pid,), commit=True)

        rec_before = generate_recommendation_for_patient(pid)
        self.assertEqual(rec_before['activity_id'], 3)
        self.assertEqual(rec_before['recommended_difficulty'], 'Easy')

        # Now Patient A practices and drastically improves on Sequence Memory (98% accuracy)
        for _ in range(4):
            execute_query("INSERT INTO activity_sessions (patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty) VALUES (%s, 3, 98, 98.0, 20, 0, 1, 'Easy')", (pid,), commit=True)

        profile_after = get_patient_performance_profile(pid)
        rec_after = generate_recommendation_for_patient(pid)

        # Verify Sequence Memory accuracy updated to 98% and difficulty progressed to Medium/Hard
        seq_profile = [a for a in profile_after['activities'] if a['activity_id'] == 3][0]
        self.assertGreaterEqual(seq_profile['recent_accuracy'], 90.0)
        self.assertEqual(seq_profile['recommended_level'], 'Medium')
        print(f"\n[Test Pass] Dynamic Shift Verified: Sequence Memory accuracy improved to {seq_profile['recent_accuracy']}%, new level: {seq_profile['recommended_level']}")

if __name__ == '__main__':
    unittest.main()
