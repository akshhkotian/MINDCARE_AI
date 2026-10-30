from flask import Blueprint, request, jsonify
from database import execute_query

assistance_bp = Blueprint('assistance', __name__)

@assistance_bp.route('', methods=['POST'])
def create_assistance_request():
    """POST /api/assistance - Patient requests immediate help"""
    data = request.get_json() or {}
    patient_id = data.get('patient_id')
    message = data.get('message', 'Patient pressed I Need Help button. Assistance required.').strip()

    if not patient_id:
        return jsonify({'error': 'patient_id is required.'}), 400

    try:
        # Find caregiver_id if assigned
        patient = execute_query('SELECT caregiver_id FROM users WHERE id = %s', (patient_id,), fetchone=True)
        caregiver_id = patient['caregiver_id'] if patient else None

        req_id = execute_query(
            '''INSERT INTO assistance_requests (patient_id, caregiver_id, message, status)
               VALUES (%s, %s, %s, 'Pending')''',
            (patient_id, caregiver_id, message),
            commit=True
        )

        return jsonify({
            'message': 'Help request submitted successfully. Caregiver notified.',
            'id': req_id,
            'status': 'Pending'
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@assistance_bp.route('/caregiver/<int:caregiver_id>', methods=['GET'])
def get_caregiver_assistance_requests(caregiver_id):
    """GET /api/assistance/caregiver/<caregiver_id> - View patient help requests for caregiver"""
    try:
        query = '''
            SELECT ar.*, u.name as patient_name, u.age as patient_age
            FROM assistance_requests ar
            JOIN users u ON ar.patient_id = u.id
            WHERE ar.caregiver_id = %s OR u.caregiver_id = %s OR ar.caregiver_id IS NULL
            ORDER BY ar.created_at DESC
        '''
        requests_list = execute_query(query, (caregiver_id, caregiver_id), fetchall=True)
        return jsonify(requests_list), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@assistance_bp.route('/<int:request_id>', methods=['PUT'])
def update_assistance_status(request_id):
    """PUT /api/assistance/<id> - Mark assistance request as Resolved"""
    data = request.get_json() or {}
    status = data.get('status', 'Resolved')

    try:
        execute_query('UPDATE assistance_requests SET status = %s WHERE id = %s', (status, request_id), commit=True)
        return jsonify({'message': f'Request status updated to {status}.'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
