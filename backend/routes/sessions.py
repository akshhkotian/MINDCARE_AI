from flask import Blueprint, request, jsonify
from database import execute_query
from ml.predict import predict_performance, determine_recommended_difficulty

sessions_bp = Blueprint('sessions', __name__)

@sessions_bp.route('', methods=['POST'])
def create_session():
    """
    POST /api/sessions
    Payload: {
        patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty
    }
    """
    data = request.get_json() or {}
    patient_id = data.get('patient_id')
    activity_id = data.get('activity_id')
    score = data.get('score', 0)
    accuracy = data.get('accuracy', 0.0)
    completion_time = data.get('completion_time', 0)
    mistakes = data.get('mistakes', 0)
    attempts = data.get('attempts', 1)
    difficulty = data.get('difficulty', 'Easy')

    if not patient_id or not activity_id:
        return jsonify({'error': 'patient_id and activity_id are required.'}), 400

    # 1. Run Machine Learning Random Forest Prediction
    perf_category = predict_performance(
        accuracy=accuracy,
        score=score,
        completion_time=completion_time,
        mistakes=mistakes,
        attempts=attempts,
        difficulty=difficulty
    )

    # 2. Determine Adaptive Difficulty Recommendation
    rec_info = determine_recommended_difficulty(difficulty, perf_category)
    recommended_difficulty = rec_info['recommended_difficulty']
    message = rec_info['message']

    try:
        # 3. Store Session Record
        session_id = execute_query(
            '''INSERT INTO activity_sessions 
               (patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty, performance_category)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)''',
            (patient_id, activity_id, score, accuracy, completion_time, mistakes, attempts, difficulty, perf_category),
            commit=True
        )

        # 4. Generate & Store Updated Personalized Recommendation Record
        from ml.recommendation_engine import generate_recommendation_for_patient
        new_rec = generate_recommendation_for_patient(patient_id)

        return jsonify({
            'message': 'Activity performance recorded successfully.',
            'session': {
                'id': session_id,
                'patient_id': patient_id,
                'activity_id': activity_id,
                'score': score,
                'accuracy': accuracy,
                'completion_time': completion_time,
                'mistakes': mistakes,
                'attempts': attempts,
                'difficulty': difficulty,
                'performance_category': perf_category
            },
            'recommendation': new_rec
        }), 201

    except Exception as e:
        return jsonify({'error': f'Failed to record session: {str(e)}'}), 500


@sessions_bp.route('/patient/<int:patient_id>', methods=['GET'])
def get_patient_sessions(patient_id):
    """GET /api/sessions/patient/<patient_id> - Retrieve historical sessions with activity names"""
    try:
        query = '''
            SELECT s.*, a.name as activity_name 
            FROM activity_sessions s
            JOIN activities a ON s.activity_id = a.id
            WHERE s.patient_id = %s
            ORDER BY s.created_at DESC
        '''
        sessions = execute_query(query, (patient_id,), fetchall=True)
        return jsonify(sessions), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
