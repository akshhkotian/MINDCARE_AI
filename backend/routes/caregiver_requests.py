from flask import Blueprint, request, jsonify
from database import execute_query
from datetime import datetime

caregiver_requests_bp = Blueprint('caregiver_requests', __name__)

@caregiver_requests_bp.route('/caregiver/<int:caregiver_id>', methods=['GET'])
def get_caregiver_requests(caregiver_id):
    """GET /api/caregiver-requests/caregiver/<caregiver_id> - Get patient connection requests for a caregiver"""
    try:
        query = '''
            SELECT r.*, u.name as patient_name, u.email as patient_email, u.age as patient_age
            FROM caregiver_requests r
            JOIN users u ON r.patient_id = u.id
            WHERE r.caregiver_id = %s
            ORDER BY r.requested_at DESC
        '''
        requests = execute_query(query, (caregiver_id,), fetchall=True) or []
        return jsonify(requests), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@caregiver_requests_bp.route('/patient/<int:patient_id>', methods=['GET'])
def get_patient_request_status(patient_id):
    """GET /api/caregiver-requests/patient/<patient_id> - Get connection status for a patient"""
    try:
        # Check if patient already has an active connected caregiver in users table
        patient = execute_query('SELECT caregiver_id FROM users WHERE id = %s', (patient_id,), fetchone=True)
        if patient and patient.get('caregiver_id'):
            cg = execute_query(
                'SELECT id, name, email, caregiver_code FROM users WHERE id = %s',
                (patient['caregiver_id'],),
                fetchone=True
            )
            if cg:
                return jsonify({
                    'status': 'accepted',
                    'caregiver_id': cg['id'],
                    'caregiver_name': cg['name'],
                    'caregiver_email': cg['email'],
                    'caregiver_code': cg['caregiver_code']
                }), 200

        # Otherwise fetch the latest request
        query = '''
            SELECT r.*, u.name as caregiver_name, u.email as caregiver_email, u.caregiver_code
            FROM caregiver_requests r
            JOIN users u ON r.caregiver_id = u.id
            WHERE r.patient_id = %s
            ORDER BY r.requested_at DESC
            LIMIT 1
        '''
        req = execute_query(query, (patient_id,), fetchone=True)
        return jsonify(req or {'status': 'none'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@caregiver_requests_bp.route('/connect', methods=['POST'])
def send_connection_request():
    """
    POST /api/caregiver-requests/connect
    Payload: { patient_id: int, caregiver_code: str }
    """
    data = request.get_json() or {}
    patient_id = data.get('patient_id')
    caregiver_code = (data.get('caregiver_code') or '').strip().upper()

    if not patient_id:
        return jsonify({'error': 'patient_id is required.'}), 400
    if not caregiver_code:
        return jsonify({'error': 'Caregiver ID Code is required.'}), 400

    try:
        # Check patient
        patient = execute_query('SELECT id, name, role, caregiver_id FROM users WHERE id = %s', (patient_id,), fetchone=True)
        if not patient or patient['role'] != 'patient':
            return jsonify({'error': 'Invalid patient account.'}), 404

        # Find caregiver by code (case-insensitive)
        caregiver = execute_query(
            'SELECT id, name, email, caregiver_code, role FROM users WHERE UPPER(caregiver_code) = %s AND role = %s',
            (caregiver_code, 'caregiver'),
            fetchone=True
        )
        if not caregiver:
            return jsonify({'error': f'Caregiver with code "{caregiver_code}" not found. Please double check the code.'}), 404

        caregiver_id = caregiver['id']

        # Check if already connected to this caregiver
        if patient.get('caregiver_id') == caregiver_id:
            return jsonify({'error': f'You are already connected to {caregiver["name"]}.'}), 400

        # Check if there is already an active pending request to this caregiver
        existing_pending = execute_query(
            '''SELECT id FROM caregiver_requests 
               WHERE patient_id = %s AND caregiver_id = %s AND status = 'pending' ''',
            (patient_id, caregiver_id),
            fetchone=True
        )
        if existing_pending:
            return jsonify({'message': f'A connection request to {caregiver["name"]} is already pending approval.'}), 200

        # Create new connection request
        now_str = str(datetime.now())
        req_id = execute_query(
            '''INSERT INTO caregiver_requests (patient_id, caregiver_id, status, requested_at)
               VALUES (%s, %s, 'pending', %s)''',
            (patient_id, caregiver_id, now_str),
            commit=True
        )

        return jsonify({
            'message': f'Connection request sent to {caregiver["name"]} successfully!',
            'request_id': req_id,
            'status': 'pending',
            'caregiver_name': caregiver['name'],
            'caregiver_code': caregiver['caregiver_code']
        }), 201

    except Exception as e:
        return jsonify({'error': f'Failed to send connection request: {str(e)}'}), 500


@caregiver_requests_bp.route('/disconnect', methods=['POST'])
def disconnect_caregiver():
    """
    POST /api/caregiver-requests/disconnect
    Payload: { patient_id: int }
    """
    data = request.get_json() or {}
    patient_id = data.get('patient_id')

    if not patient_id:
        return jsonify({'error': 'patient_id is required.'}), 400

    try:
        # Clear caregiver_id
        execute_query('UPDATE users SET caregiver_id = NULL WHERE id = %s', (patient_id,), commit=True)
        
        # Mark previous accepted/pending requests for this patient as archived/rejected
        now_str = str(datetime.now())
        execute_query(
            "UPDATE caregiver_requests SET status = 'rejected', responded_at = %s WHERE patient_id = %s AND status IN ('accepted', 'pending')",
            (now_str, patient_id),
            commit=True
        )

        return jsonify({'message': 'Caregiver disconnected successfully.'}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to disconnect caregiver: {str(e)}'}), 500


@caregiver_requests_bp.route('/<int:request_id>/respond', methods=['POST'])
def respond_to_request(request_id):
    """
    POST /api/caregiver-requests/<request_id>/respond
    Payload: { action: 'accept' | 'reject' }
    """
    data = request.get_json() or {}
    action = data.get('action', '').strip().lower()

    if action not in ['accept', 'reject']:
        return jsonify({'error': 'Action must be accept or reject.'}), 400

    req = execute_query('SELECT * FROM caregiver_requests WHERE id = %s', (request_id,), fetchone=True)
    if not req:
        return jsonify({'error': 'Connection request not found.'}), 404

    new_status = 'accepted' if action == 'accept' else 'rejected'
    now_str = str(datetime.now())

    try:
        # Update request status
        execute_query(
            'UPDATE caregiver_requests SET status = %s, responded_at = %s WHERE id = %s',
            (new_status, now_str, request_id),
            commit=True
        )

        # If accepted, link patient caregiver_id in users table
        if new_status == 'accepted':
            execute_query(
                'UPDATE users SET caregiver_id = %s WHERE id = %s',
                (req['caregiver_id'], req['patient_id']),
                commit=True
            )

        return jsonify({
            'message': f'Connection request {new_status} successfully.',
            'request_id': request_id,
            'status': new_status
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to respond to request: {str(e)}'}), 500


@caregiver_requests_bp.route('/caregiver/<int:caregiver_id>/patients', methods=['GET'])
def get_accepted_patients(caregiver_id):
    """GET /api/caregiver-requests/caregiver/<caregiver_id>/patients - Retrieve accepted patients for a caregiver"""
    try:
        query = '''
            SELECT u.id, u.name, u.email, u.role, u.age, u.created_at
            FROM users u
            WHERE u.role = 'patient' AND u.caregiver_id = %s
            ORDER BY u.name ASC
        '''
        patients = execute_query(query, (caregiver_id,), fetchall=True) or []
        return jsonify(patients), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
