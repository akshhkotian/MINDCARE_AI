from flask import Blueprint, request, jsonify
from database import execute_query

familiar_people_bp = Blueprint('familiar_people', __name__)

@familiar_people_bp.route('/patient/<int:patient_id>', methods=['GET'])
def get_familiar_people(patient_id):
    """GET /api/familiar-people/patient/<patient_id> - Get familiar faces uploaded for a patient"""
    try:
        query = 'SELECT * FROM familiar_people WHERE patient_id = %s ORDER BY created_at DESC'
        people = execute_query(query, (patient_id,), fetchall=True) or []
        return jsonify(people), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@familiar_people_bp.route('', methods=['POST'])
def add_familiar_person():
    """
    POST /api/familiar-people
    Payload: { patient_id, caregiver_id, name, relationship, photo_path, description }
    """
    data = request.get_json() or {}
    patient_id = data.get('patient_id')
    caregiver_id = data.get('caregiver_id')
    name = data.get('name', '').strip()
    relationship = data.get('relationship', '').strip()
    photo_path = data.get('photo_path', '').strip()
    description = data.get('description', '').strip()

    if not patient_id or not caregiver_id or not name or not relationship or not photo_path:
        return jsonify({'error': 'patient_id, caregiver_id, name, relationship, and photo_path are required.'}), 400

    try:
        person_id = execute_query(
            '''INSERT INTO familiar_people (patient_id, caregiver_id, name, relationship, photo_path, description)
               VALUES (%s, %s, %s, %s, %s, %s)''',
            (patient_id, caregiver_id, name, relationship, photo_path, description),
            commit=True
        )

        person = execute_query('SELECT * FROM familiar_people WHERE id = %s', (person_id,), fetchone=True)
        return jsonify({
            'message': 'Familiar person added successfully.',
            'person': person
        }), 201
    except Exception as e:
        return jsonify({'error': f'Failed to add familiar person: {str(e)}'}), 500


@familiar_people_bp.route('/<int:person_id>', methods=['DELETE'])
def delete_familiar_person(person_id):
    """DELETE /api/familiar-people/<person_id> - Delete a familiar person item"""
    try:
        execute_query('DELETE FROM familiar_people WHERE id = %s', (person_id,), commit=True)
        return jsonify({'message': 'Familiar person deleted successfully.'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
