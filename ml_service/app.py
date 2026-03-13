from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import json
import numpy as np
import os

app = Flask(__name__)
CORS(app)

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')
duration_model = None
specialization_rules = None


def load_models():
    global duration_model, specialization_rules

    duration_model_path = os.path.join(MODEL_DIR, 'duration_model.pkl')
    rules_path = os.path.join(MODEL_DIR, 'specialization_rules.json')

    if os.path.exists(duration_model_path):
        duration_model = joblib.load(duration_model_path)
    else:
        print("Warning: duration model not found, using fallback")

    if os.path.exists(rules_path):
        with open(rules_path) as f:
            specialization_rules = json.load(f)
    else:
        print("Warning: specialization rules not found, using fallback")


load_models()


@app.route('/predict-duration', methods=['POST'])
def predict_duration():
    try:
        data = request.get_json(force=True)
        age             = int(data['age'])
        emergency_level = int(data['emergency_level'])
        previous_visits = int(data['previous_visits'])
        symptoms        = str(data.get('symptoms', ''))
        symptoms_length = len(symptoms)

        if duration_model is not None:
            features = np.array([[age, emergency_level, previous_visits, symptoms_length]])
            predicted = float(duration_model.predict(features)[0])
        else:
            predicted = 15.0

        return jsonify({'predicted_duration': predicted})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/predict-specialization', methods=['POST'])
def predict_specialization():
    try:
        data = request.get_json(force=True)
        symptoms_lower = str(data.get('symptoms', '')).lower()

        specialization = 'General Physician'

        if specialization_rules:
            for spec, keywords in specialization_rules.items():
                if any(kw in symptoms_lower for kw in keywords):
                    specialization = spec
                    break

        return jsonify({'specialization': specialization})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    try:
        models_loaded = duration_model is not None and specialization_rules is not None
        return jsonify({'status': 'ok', 'models_loaded': models_loaded})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(port=5001, debug=debug)
