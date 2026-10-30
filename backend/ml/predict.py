import os

_MODEL = None

def get_model():
    """
    Loads the trained Random Forest model. If dependencies or model.pkl are not ready, returns None.
    """
    global _MODEL
    if _MODEL is None:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(current_dir, 'model.pkl')
        try:
            import joblib
            if not os.path.exists(model_path):
                print("[ML Predict] Training model...")
                from ml.train_model import train_and_save_model
                _MODEL = train_and_save_model(model_path)
            else:
                _MODEL = joblib.load(model_path)
                print("[ML Predict] Random Forest model loaded successfully.")
        except Exception as e:
            print(f"[ML Predict Note] Machine learning packages loading status: {e}. Using rule-based cognitive scoring fallback.")
            _MODEL = False
    return _MODEL

def map_difficulty_to_numeric(difficulty):
    if isinstance(difficulty, int): return difficulty
    diff_str = str(difficulty).strip().capitalize()
    mapping = {'Easy': 1, 'Medium': 2, 'Hard': 3}
    return mapping.get(diff_str, 1)

def map_numeric_to_difficulty(num):
    mapping = {1: 'Easy', 2: 'Medium', 3: 'Hard'}
    return mapping.get(num, 'Easy')

def predict_performance(accuracy, score, completion_time, mistakes, attempts=1, difficulty='Easy'):
    """
    Predicts patient performance category using trained Random Forest Classifier or cognitive rule-based fallback.
    """
    model = get_model()
    diff_num = map_difficulty_to_numeric(difficulty)
    
    if model and model is not False:
        try:
            import pandas as pd
            input_data = pd.DataFrame([{
                'accuracy': float(accuracy),
                'score': float(score),
                'completion_time': float(completion_time),
                'mistakes': int(mistakes),
                'attempts': int(attempts),
                'difficulty': diff_num
            }])
            return str(model.predict(input_data)[0])
        except Exception as e:
            print(f"[Prediction Fallback] {e}")

    # Fallback cognitive evaluation engine
    acc = float(accuracy)
    m = int(mistakes)
    if acc >= 75 and m <= 2:
        return 'Good Progress'
    elif acc >= 50:
        return 'Normal Progress'
    else:
        return 'Needs Support'

def determine_recommended_difficulty(current_difficulty, performance_category):
    diff_num = map_difficulty_to_numeric(current_difficulty)
    
    if performance_category == 'Needs Support':
        new_diff_num = max(1, diff_num - 1)
        message = "Let's try an easier activity."
    elif performance_category == 'Good Progress':
        new_diff_num = min(3, diff_num + 1)
        message = "Excellent! You are ready for a little more challenge."
    else:
        new_diff_num = diff_num
        message = "Good job! You can continue at this level."
        
    recommended_difficulty = map_numeric_to_difficulty(new_diff_num)
    
    return {
        'recommended_difficulty': recommended_difficulty,
        'message': message,
        'performance_category': performance_category
    }
