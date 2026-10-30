import os
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from database import init_db
from ml.predict import get_model

# Import Blueprints
from routes.auth import auth_bp
from routes.activities import activities_bp
from routes.sessions import sessions_bp
from routes.ml import ml_bp
from routes.recommendations import recommendations_bp
from routes.reminders import reminders_bp
from routes.assistance import assistance_bp
from routes.memory import memory_bp
from routes.caregiver_requests import caregiver_requests_bp
from routes.familiar_people import familiar_people_bp

def create_app():
    app = Flask(__name__, static_folder='static', static_url_path='')
    app.config.from_object(Config)

    # Enable CORS for frontend cross-origin access
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

    # Initialize Database & Seed Data
    init_db()

    # Pre-load or Train ML Random Forest Model
    try:
        get_model()
    except Exception as e:
        print(f"[App Warning] ML Model initialization warning: {e}")

    # Register API Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(activities_bp, url_prefix='/api/activities')
    app.register_blueprint(sessions_bp, url_prefix='/api/sessions')
    app.register_blueprint(ml_bp, url_prefix='/api/ml')
    app.register_blueprint(recommendations_bp, url_prefix='/api/recommendations')
    app.register_blueprint(reminders_bp, url_prefix='/api/reminders')
    app.register_blueprint(assistance_bp, url_prefix='/api/assistance')
    app.register_blueprint(memory_bp, url_prefix='/api/memory')
    app.register_blueprint(caregiver_requests_bp, url_prefix='/api/caregiver-requests')
    app.register_blueprint(familiar_people_bp, url_prefix='/api/familiar-people')

    @app.route('/api/patients/<int:patient_id>/performance-profile', methods=['GET'])
    def get_patient_profile_alias(patient_id):
        from ml.recommendation_engine import get_patient_performance_profile
        try:
            profile = get_patient_performance_profile(patient_id)
            return jsonify(profile), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/')
    def root():
        return app.send_static_file('index.html')

    @app.route('/api/health')
    def health_check():
        return jsonify({'status': 'Healthy', 'database': 'Connected'}), 200

    return app

if __name__ == '__main__':
    app = create_app()
    print("==================================================")
    print("  MindCare AI Flask Backend Server Running")
    print("  URL: http://127.0.0.1:5000")
    print("==================================================")
    app.run(host='0.0.0.0', port=5000, debug=True)
