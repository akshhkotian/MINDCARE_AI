from flask import Blueprint, jsonify
from database import execute_query

activities_bp = Blueprint('activities', __name__)

@activities_bp.route('', methods=['GET'])
def get_all_activities():
    """GET /api/activities - Retrieve list of all 8 cognitive activities"""
    try:
        activities = execute_query('SELECT * FROM activities ORDER BY id ASC', fetchall=True)
        return jsonify(activities), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@activities_bp.route('/<int:activity_id>', methods=['GET'])
def get_activity_by_id(activity_id):
    """GET /api/activities/<id> - Get specific activity details"""
    try:
        activity = execute_query('SELECT * FROM activities WHERE id = %s', (activity_id,), fetchone=True)
        if not activity:
            return jsonify({'error': 'Activity not found.'}), 404
        return jsonify(activity), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
