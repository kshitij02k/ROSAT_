const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama3-8b-8192';

if (!GROQ_API_KEY) {
  console.warn('[groqService] WARNING: GROQ_API_KEY is not set. AI triage will use rule-based fallback.');
}

/**
 * Analyze patient symptoms using Groq LLM to determine:
 * - emergencyLevel (1-5)
 * - doctorSpecialization
 * - isCriticalOperationToday (boolean)
 */
const triageSymptoms = async (symptoms, age, gender, visitType) => {
  if (!GROQ_API_KEY) {
    console.warn('GROQ_API_KEY not set, using rule-based fallback');
    return fallbackTriage(symptoms);
  }

  try {
    const prompt = `You are a medical triage AI. Analyze the following patient information and return a JSON object with exactly three fields.

Patient Info:
- Symptoms: ${symptoms}
- Age: ${age || 'Unknown'}
- Gender: ${gender || 'Unknown'}
- Visit Type: ${visitType || 'Unknown'}

Return ONLY a valid JSON object (no markdown, no explanation) with these fields:
1. "emergencyLevel": integer 1-5 (1=routine, 2=mild, 3=moderate, 4=urgent, 5=critical/life-threatening)
2. "doctorSpecialization": one of ["Cardiologist","Neurologist","General Physician","Orthopedist","Dermatologist","Pulmonologist","Gastroenterologist","Psychiatrist"]
3. "isCriticalOperationToday": boolean true only if immediate surgical or emergency intervention is needed today

JSON:`;

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'You are a medical triage assistant. Always respond with valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 200,
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const content = response.data.choices[0].message.content.trim();
    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('Groq returned non-JSON response, using fallback');
      return fallbackTriage(symptoms);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and clamp values
    const emergencyLevel = Math.min(5, Math.max(1, parseInt(parsed.emergencyLevel, 10) || 2));

    const validSpecializations = [
      'Cardiologist', 'Neurologist', 'General Physician', 'Orthopedist',
      'Dermatologist', 'Pulmonologist', 'Gastroenterologist', 'Psychiatrist',
    ];
    const doctorSpecialization = validSpecializations.includes(parsed.doctorSpecialization)
      ? parsed.doctorSpecialization
      : 'General Physician';

    const isCriticalOperationToday = parsed.isCriticalOperationToday === true;

    return { emergencyLevel, doctorSpecialization, isCriticalOperationToday };
  } catch (err) {
    console.warn('Groq API call failed, using fallback triage:', err.message);
    return fallbackTriage(symptoms);
  }
};

/**
 * Rule-based fallback when Groq API is unavailable
 */
const fallbackTriage = (symptoms) => {
  const lower = (symptoms || '').toLowerCase();

  const criticalKeywords = ['chest pain', 'heart attack', 'stroke', 'unconscious', 'seizure', 'severe bleeding', 'not breathing', 'anaphylaxis'];
  const urgentKeywords = ['fracture', 'high fever', 'severe pain', 'difficulty breathing', 'head injury'];
  const moderateKeywords = ['persistent cough', 'vomiting', 'diarrhea', 'moderate pain', 'dizziness'];

  let emergencyLevel = 2;
  let isCriticalOperationToday = false;

  if (criticalKeywords.some((kw) => lower.includes(kw))) {
    emergencyLevel = 5;
    isCriticalOperationToday = true;
  } else if (urgentKeywords.some((kw) => lower.includes(kw))) {
    emergencyLevel = 4;
  } else if (moderateKeywords.some((kw) => lower.includes(kw))) {
    emergencyLevel = 3;
  }

  // Determine specialization from keywords
  const specMap = {
    Cardiologist: ['chest pain', 'heart', 'palpitation', 'cardiac'],
    Neurologist: ['headache', 'brain', 'seizure', 'neurological', 'migraine', 'dizziness'],
    Dermatologist: ['skin', 'rash', 'acne', 'eczema', 'dermatitis'],
    Orthopedist: ['bone', 'joint', 'fracture', 'arthritis', 'back pain'],
    Gastroenterologist: ['stomach', 'abdomen', 'digestive', 'gastric', 'nausea', 'vomiting', 'diarrhea'],
    Pulmonologist: ['lung', 'breathing', 'cough', 'asthma', 'respiratory', 'pneumonia'],
    Psychiatrist: ['mental', 'anxiety', 'depression', 'psychiatric', 'stress', 'mood'],
  };

  let doctorSpecialization = 'General Physician';
  for (const [spec, keywords] of Object.entries(specMap)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      doctorSpecialization = spec;
      break;
    }
  }

  return { emergencyLevel, doctorSpecialization, isCriticalOperationToday };
};

module.exports = { triageSymptoms };
