from flask import Blueprint, jsonify, request
from database import execute_query
from ml.recommendation_engine import generate_recommendation_for_patient, get_patient_performance_profile

recommendations_bp = Blueprint('recommendations', __name__)

@recommendations_bp.route('/<int:patient_id>', methods=['GET'])
def get_patient_recommendations(patient_id):
    """
    GET /api/recommendations/<patient_id>
    Fetches recent recommendations for patient_id. If no recommendations exist or force=true,
    generates a new personalized recommendation automatically.
    """
    try:
        force = request.args.get('force', 'false').lower() == 'true'
        
        query = '''
            SELECT r.*, a.name as activity_name 
            FROM recommendations r
            JOIN activities a ON r.activity_id = a.id
            WHERE r.patient_id = %s
            ORDER BY r.created_at DESC
            LIMIT 10
        '''
        recs = execute_query(query, (patient_id,), fetchall=True) or []
        
        if not recs or force:
            new_rec = generate_recommendation_for_patient(patient_id)
            recs = execute_query(query, (patient_id,), fetchall=True) or [new_rec]
            
        return jsonify(recs), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@recommendations_bp.route('/generate/<int:patient_id>', methods=['POST'])
def generate_recommendation(patient_id):
    """
    POST /api/recommendations/generate/<patient_id>
    Triggers on-demand calculation of a personalized activity recommendation.
    """
    try:
        rec = generate_recommendation_for_patient(patient_id)
        return jsonify(rec), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@recommendations_bp.route('/profile/<int:patient_id>', methods=['GET'])
def get_performance_profile(patient_id):
    """
    GET /api/recommendations/profile/<patient_id>
    Retrieves individual patient performance profile, activity trends, strengths, and areas for practice.
    """
    try:
        profile = get_patient_performance_profile(patient_id)
        return jsonify(profile), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
