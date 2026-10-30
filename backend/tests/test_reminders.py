import sys
import os
import unittest

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import init_db, execute_query
from app import create_app

class TestRemindersAPI(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        init_db()
        cls.app = create_app()
        cls.client = cls.app.test_client()

    def setUp(self):
        # Create test patient (ID 999)
        execute_query("DELETE FROM reminders WHERE patient_id = 999", commit=True)
        execute_query("DELETE FROM users WHERE id = 999", commit=True)
        execute_query("INSERT INTO users (id, name, email, password, role, caregiver_id) VALUES (999, 'Test Patient', 'test999@mindcare.ai', 'hash', 'patient', 1)", commit=True)

    def tearDown(self):
        execute_query("DELETE FROM reminders WHERE patient_id = 999", commit=True)
        execute_query("DELETE FROM users WHERE id = 999", commit=True)

    def test_auto_seed_default_reminders(self):
        """Verify that GET /api/reminders/999 automatically seeds 2 default reminders (Hydration & Cognitive)."""
        res = self.client.get('/api/reminders/999')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertGreaterEqual(len(data), 2)
        titles = [r['title'] for r in data]
        self.assertIn('Daily Hydration', titles)
        self.assertIn('Daily Cognitive Activity', titles)

    def test_create_and_delete_reminder(self):
        """Verify creating a custom reminder and deleting it."""
        post_data = {
            'patient_id': 999,
            'title': 'Test Afternoon Walk',
            'description': 'Walk in the garden for 15 minutes',
            'reminder_time': '04:00 PM',
            'repeat_option': 'Daily'
        }
        res = self.client.post('/api/reminders', json=post_data)
        self.assertEqual(res.status_code, 201)
        res_json = res.get_json()
        rem_id = res_json['id']
        self.assertIsNotNone(rem_id)

        # Update status
        put_res = self.client.put(f'/api/reminders/{rem_id}', json={'status': 'Completed'})
        self.assertEqual(put_res.status_code, 200)

        # Delete reminder
        del_res = self.client.delete(f'/api/reminders/{rem_id}')
        self.assertEqual(del_res.status_code, 200)

if __name__ == '__main__':
    unittest.main()
