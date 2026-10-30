from flask import Blueprint, request, jsonify
from ml.predict import predict_performance, determine_recommended_difficulty

ml_bp = Blueprint('ml', __name__)

@ml_bp.route('/predict', methods=['POST'])
def predict():
    """
    POST /api/ml/predict
    Payload: { accuracy, score, completion_time, mistakes, attempts, difficulty }
    """
    data = request.get_json() or {}
    accuracy = data.get('accuracy', 0.0)
    score = data.get('score', 0)
    completion_time = data.get('completion_time', 0)
    mistakes = data.get('mistakes', 0)
    attempts = data.get('attempts', 1)
    difficulty = data.get('difficulty', 'Easy')

    category = predict_performance(
        accuracy=accuracy,
        score=score,
        completion_time=completion_time,
        mistakes=mistakes,
        attempts=attempts,
        difficulty=difficulty
    )

    recommendation = determine_recommended_difficulty(difficulty, category)

    return jsonify({
        'performance_category': category,
        'recommendation': recommendation,
        'disclaimer': 'MindCare AI evaluates activity performance only and does not diagnose medical conditions.'
    }), 200
