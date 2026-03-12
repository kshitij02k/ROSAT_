"""
Telemedicine Queue Optimization System
ML Service - Consultation Duration Prediction
Uses RandomForestRegressor to predict consultation duration.
"""

import os
import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')

SYMPTOM_ENCODING = {
    'fever': 1,
    'cold': 2,
    'flu': 3,
    'cough': 4,
    'headache': 5,
    'migraine': 6,
    'eye pain': 7,
    'vision': 8,
    'heart pain': 9,
    'chest pain': 10,
    'palpitations': 11,
    'skin rash': 12,
    'acne': 13,
    'back pain': 14,
    'fracture': 15,
    'joint': 16,
    'anxiety': 17,
    'depression': 18,
    'dental': 19,
    'tooth': 20,
    'stomach': 21,
    'abdomen': 22,
    'diarrhea': 23,
    'other': 0
}


def encode_symptom(symptom_str):
    """Encode symptom string to numeric value."""
    if not symptom_str:
        return 0
    symptom_lower = symptom_str.lower()
    for key, val in SYMPTOM_ENCODING.items():
        if key in symptom_lower:
            return val
    return 0


def load_or_train_model():
    """Load existing model or train a new one if not found."""
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            print("Model loaded from disk.")
            return model
        except Exception as e:
            print(f"Error loading model: {e}. Training new model.")

    print("Training new model...")
    return train_model()


def train_model():
    """Train a RandomForestRegressor with synthetic data."""
    from sklearn.ensemble import RandomForestRegressor

    np.random.seed(42)
    n_samples = 2000

    ages = np.random.randint(5, 90, n_samples)
    symptoms = np.random.choice(list(SYMPTOM_ENCODING.values()), n_samples)
    emergency_levels = np.random.randint(1, 6, n_samples)
    previous_visits = np.random.randint(0, 10, n_samples)

    # Generate realistic consultation durations
    # Base duration influenced by factors
    durations = (
        6 +
        (emergency_levels * 2.5) +
        (ages > 60).astype(int) * 3 +
        (previous_visits > 3).astype(int) * 2 +
        np.random.normal(0, 2, n_samples)
    )
    durations = np.clip(durations, 5, 45).astype(int)

    X = np.column_stack([ages, symptoms, emergency_levels, previous_visits])
    y = durations

    model = RandomForestRegressor(n_estimators=100, random_state=42, max_depth=10)
    model.fit(X, y)

    joblib.dump(model, MODEL_PATH)
    print(f"Model trained and saved to {MODEL_PATH}")
    return model


# Load model on startup
model = load_or_train_model()


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'OK', 'model': 'RandomForestRegressor'})


@app.route('/predict-duration', methods=['POST'])
def predict_duration():
    """
    Predict consultation duration.

    Input:
    {
        "age": 30,
        "symptom": "fever",
        "emergency": 2,
        "previousVisits": 1
    }

    Output:
    {
        "predictedDuration": 8
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No input data provided'}), 400

        age = int(data.get('age', 30))
        symptom_str = str(data.get('symptom', ''))
        emergency = int(data.get('emergency', 1))
        previous_visits = int(data.get('previousVisits', 0))

        # Validate inputs
        age = max(1, min(age, 120))
        emergency = max(1, min(emergency, 5))
        previous_visits = max(0, previous_visits)

        symptom_encoded = encode_symptom(symptom_str)

        features = np.array([[age, symptom_encoded, emergency, previous_visits]])
        predicted = model.predict(features)[0]
        predicted_duration = max(5, int(round(predicted)))

        return jsonify({
            'predictedDuration': predicted_duration,
            'inputs': {
                'age': age,
                'symptom': symptom_str,
                'emergencyLevel': emergency,
                'previousVisits': previous_visits
            }
        })

    except Exception as e:
        print(f"Prediction error: {e}")
        return jsonify({'error': str(e), 'predictedDuration': 10}), 500


@app.route('/retrain', methods=['POST'])
def retrain():
    """Retrain the model (admin only endpoint)."""
    global model
    try:
        model = train_model()
        return jsonify({'message': 'Model retrained successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
