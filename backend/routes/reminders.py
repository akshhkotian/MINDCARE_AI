from flask import Blueprint, request, jsonify
from database import execute_query
import datetime

reminders_bp = Blueprint('reminders', __name__)

DEFAULT_REMINDERS = [
    {
        'title': 'Daily Hydration',
        'description': 'Drink a large glass of fresh water to stay hydrated and refreshed.',
        'reminder_time': '08:00 AM',
        'repeat_option': 'Daily'
    },
    {
        'title': 'Daily Cognitive Activity',
        'description': 'It\'s time to play your daily cognitive training games on MindCare AI.',
        'reminder_time': '10:30 AM',
        'repeat_option': 'Daily'
    }
]

@reminders_bp.route('', methods=['POST'])
def create_reminder():
    """POST /api/reminders - Create a new patient reminder"""
    data = request.get_json() or {}
    patient_id = data.get('patient_id')
    caregiver_id = data.get('caregiver_id')
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    reminder_date = data.get('reminder_date', '').strip() or datetime.date.today().isoformat()
    reminder_time = data.get('reminder_time', '').strip() or '09:00 AM'
    repeat_option = data.get('repeat_option', 'Daily')

    if not patient_id or not title:
        return jsonify({'error': 'patient_id and title are required.'}), 400

    try:
        if not caregiver_id:
            user_row = execute_query('SELECT caregiver_id FROM users WHERE id = %s', (patient_id,), fetchone=True)
            caregiver_id = (user_row and user_row.get('caregiver_id')) or 1

        reminder_id = execute_query(
            '''INSERT INTO reminders 
               (patient_id, caregiver_id, title, description, reminder_date, reminder_time, repeat_option, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, 'Pending')''',
            (patient_id, caregiver_id, title, description, reminder_date, reminder_time, repeat_option),
            commit=True
        )
        new_item = execute_query('SELECT * FROM reminders WHERE id = %s', (reminder_id,), fetchone=True)
        return jsonify({'message': 'Reminder created successfully.', 'reminder': new_item, 'id': reminder_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@reminders_bp.route('/<int:patient_id>', methods=['GET'])
def get_reminders(patient_id):
    """GET /api/reminders/<patient_id> - Get all reminders for a patient. Seed 2 default reminders if none exist."""
    try:
        reminders = execute_query(
            'SELECT * FROM reminders WHERE patient_id = %s ORDER BY id DESC',
            (patient_id,), fetchall=True
        )
        
        # If no reminders exist for patient, automatically seed default reminders
        if not reminders:
            user_row = execute_query('SELECT caregiver_id FROM users WHERE id = %s', (patient_id,), fetchone=True)
            caregiver_id = (user_row and user_row.get('caregiver_id')) or 1
            today_str = datetime.date.today().isoformat()
            
            for default_rem in DEFAULT_REMINDERS:
                execute_query(
                    '''INSERT INTO reminders 
                       (patient_id, caregiver_id, title, description, reminder_date, reminder_time, repeat_option, status)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, 'Pending')''',
                    (patient_id, caregiver_id, default_rem['title'], default_rem['description'],
                     today_str, default_rem['reminder_time'], default_rem['repeat_option']),
                    commit=True
                )
            
            reminders = execute_query(
                'SELECT * FROM reminders WHERE patient_id = %s ORDER BY id DESC',
                (patient_id,), fetchall=True
            )
            
        return jsonify(reminders or []), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@reminders_bp.route('/seed-defaults/<int:patient_id>', methods=['POST'])
def seed_defaults(patient_id):
    """POST /api/reminders/seed-defaults/<patient_id> - Seed default reminders on demand"""
    try:
        user_row = execute_query('SELECT caregiver_id FROM users WHERE id = %s', (patient_id,), fetchone=True)
        caregiver_id = (user_row and user_row.get('caregiver_id')) or 1
        today_str = datetime.date.today().isoformat()
        
        added = []
        for default_rem in DEFAULT_REMINDERS:
            # Check if title already exists for patient
            existing = execute_query(
                'SELECT id FROM reminders WHERE patient_id = %s AND title = %s',
                (patient_id, default_rem['title']), fetchone=True
            )
            if not existing:
                rem_id = execute_query(
                    '''INSERT INTO reminders 
                       (patient_id, caregiver_id, title, description, reminder_date, reminder_time, repeat_option, status)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, 'Pending')''',
                    (patient_id, caregiver_id, default_rem['title'], default_rem['description'],
                     today_str, default_rem['reminder_time'], default_rem['repeat_option']),
                    commit=True
                )
                added.append(rem_id)
                
        reminders = execute_query(
            'SELECT * FROM reminders WHERE patient_id = %s ORDER BY id DESC',
            (patient_id,), fetchall=True
        )
        return jsonify({'message': f'Seeded {len(added)} default reminders.', 'reminders': reminders}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@reminders_bp.route('/<int:reminder_id>', methods=['PUT'])
def update_reminder(reminder_id):
    """PUT /api/reminders/<id> - Update status or reminder details"""
    data = request.get_json() or {}
    status = data.get('status')
    title = data.get('title')
    description = data.get('description')
    reminder_date = data.get('reminder_date')
    reminder_time = data.get('reminder_time')
    repeat_option = data.get('repeat_option')

    try:
        existing = execute_query('SELECT * FROM reminders WHERE id = %s', (reminder_id,), fetchone=True)
        if not existing:
            return jsonify({'error': 'Reminder not found.'}), 404

        new_status = status if status is not None else existing['status']
        new_title = title if title is not None else existing['title']
        new_desc = description if description is not None else existing['description']
        new_date = reminder_date if reminder_date is not None else existing['reminder_date']
        new_time = reminder_time if reminder_time is not None else existing['reminder_time']
        new_repeat = repeat_option if repeat_option is not None else existing['repeat_option']

        execute_query(
            '''UPDATE reminders 
               SET status=%s, title=%s, description=%s, reminder_date=%s, reminder_time=%s, repeat_option=%s 
               WHERE id=%s''',
            (new_status, new_title, new_desc, new_date, new_time, new_repeat, reminder_id),
            commit=True
        )

        updated_item = execute_query('SELECT * FROM reminders WHERE id = %s', (reminder_id,), fetchone=True)
        return jsonify({'message': 'Reminder updated successfully.', 'reminder': updated_item}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@reminders_bp.route('/<int:reminder_id>', methods=['DELETE'])
def delete_reminder(reminder_id):
    """DELETE /api/reminders/<id> - Delete a reminder"""
    try:
        execute_query('DELETE FROM reminders WHERE id = %s', (reminder_id,), commit=True)
        return jsonify({'message': 'Reminder deleted successfully.'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

