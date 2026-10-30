import os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib

def generate_synthetic_data(n_samples=1500):
    """
    Generates a realistic synthetic dataset of patient activity performance.
    Features:
      - accuracy (0 - 100 %)
      - score (0 - 100 pts)
      - completion_time (10 - 180 seconds)
      - mistakes (0 - 15)
      - attempts (1 - 5)
      - difficulty (1 = Easy, 2 = Medium, 3 = Hard)
    Target:
      - performance: 'Needs Support', 'Normal Progress', 'Good Progress'
    """
    np.random.seed(42)
    
    accuracies = []
    scores = []
    times = []
    mistakes_list = []
    attempts_list = []
    difficulties = []
    labels = []
    
    for _ in range(n_samples):
        diff = np.random.choice([1, 2, 3], p=[0.4, 0.4, 0.2])
        
        # Latent performance quality score (0 to 1)
        latent_perf = np.random.beta(2, 2)
        
        # Adjust based on difficulty
        if diff == 1:
            acc = float(np.clip(latent_perf * 100 + np.random.normal(10, 5), 20, 100))
            score_val = float(np.clip(acc * 0.95 + np.random.normal(5, 5), 10, 100))
            time_val = float(np.clip(100 - acc * 0.7 + np.random.normal(0, 10), 15, 120))
            mistakes = int(np.clip((100 - acc) / 10 + np.random.normal(0, 1), 0, 12))
            attempts = int(np.clip(1 + mistakes / 4, 1, 4))
        elif diff == 2:
            acc = float(np.clip(latent_perf * 100 + np.random.normal(0, 8), 15, 100))
            score_val = float(np.clip(acc * 0.9 + np.random.normal(0, 5), 10, 100))
            time_val = float(np.clip(120 - acc * 0.8 + np.random.normal(0, 12), 20, 150))
            mistakes = int(np.clip((100 - acc) / 8 + np.random.normal(0, 1.5), 0, 15))
            attempts = int(np.clip(1 + mistakes / 3, 1, 5))
        else: # Hard
            acc = float(np.clip(latent_perf * 100 - np.random.normal(5, 10), 10, 100))
            score_val = float(np.clip(acc * 0.85 + np.random.normal(-5, 5), 5, 100))
            time_val = float(np.clip(150 - acc * 0.9 + np.random.normal(0, 15), 25, 180))
            mistakes = int(np.clip((100 - acc) / 6 + np.random.normal(0, 2), 0, 18))
            attempts = int(np.clip(1 + mistakes / 2.5, 1, 5))
            
        # Determine performance class label based on realistic thresholds
        composite = (acc * 0.45) + (score_val * 0.35) - (mistakes * 3) - (time_val * 0.1)
        
        if composite >= 55:
            label = 'Good Progress'
        elif composite >= 30:
            label = 'Normal Progress'
        else:
            label = 'Needs Support'
            
        accuracies.append(round(acc, 2))
        scores.append(round(score_val, 2))
        times.append(round(time_val, 2))
        mistakes_list.append(mistakes)
        attempts_list.append(attempts)
        difficulties.append(diff)
        labels.append(label)
        
    df = pd.DataFrame({
        'accuracy': accuracies,
        'score': scores,
        'completion_time': times,
        'mistakes': mistakes_list,
        'attempts': attempts_list,
        'difficulty': difficulties,
        'performance': labels
    })
    return df

def train_and_save_model(model_save_path=None):
    """
    Trains the Random Forest Classifier on synthetic data and saves model.pkl
    """
    if model_save_path is None:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        model_save_path = os.path.join(current_dir, 'model.pkl')
        
    print("[ML Training] Generating synthetic patient performance dataset...")
    df = generate_synthetic_data(n_samples=2000)
    
    X = df[['accuracy', 'score', 'completion_time', 'mistakes', 'attempts', 'difficulty']]
    y = df['performance']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print("[ML Training] Training Random Forest Classifier...")
    rf_model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        class_weight='balanced'
    )
    rf_model.fit(X_train, y_train)
    
    y_pred = rf_model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"[ML Training] Model Accuracy on Test Set: {accuracy * 100:.2f}%")
    print(classification_report(y_test, y_pred))
    
    # Save the model
    os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
    joblib.dump(rf_model, model_save_path)
    print(f"[ML Training] Trained model successfully saved to: {model_save_path}")
    return rf_model

if __name__ == '__main__':
    train_and_save_model()
