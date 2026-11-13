from flask import Blueprint, request, jsonify
from database import execute_query
import datetime

reminders_bp = Blueprint('reminders', __name__)

@reminders_bp.route('', methods=['POST'])
def create_reminder():
    """POST /api/reminders - Create a new patient reminder (added by caregiver)"""
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
    """GET /api/reminders/<patient_id> - Get all reminders for a patient (only those added by caregiver)"""
    try:
        reminders = execute_query(
            'SELECT * FROM reminders WHERE patient_id = %s ORDER BY id DESC',
            (patient_id,), fetchall=True
        )
        return jsonify(reminders or []), 200
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
