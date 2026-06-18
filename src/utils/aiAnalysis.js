// KI-Analyse – unterstützt OpenAI, Google Gemini und Groq

const SYSTEM_PROMPT = `Du bist ein erfahrener Ernährungsberater mit Spezialisierung auf Lebensmittelunverträglichkeiten. Du analysierst Tagebuchdaten und erkennst Muster zwischen Lebensmitteln und Symptomen.`;

function buildPrompt(meals, symptoms) {
  const mealsText = meals.map(m => {
    const date = new Date(m.timestamp);
    const items = m.items ? m.items.map(i => i.label).join(', ') : m.ingredients.join(', ');
    const allIngs = m.ingredients?.join(', ') || items;
    return `• ${date.toLocaleString('de-DE')}: ${m.name} | Gerichte: ${items} | Zutaten: ${allIngs}${m.notes ? ` | Notiz: ${m.notes}` : ''}`;
  }).join('\n');

  const symptomsText = symptoms.map(s => {
    const date = new Date(s.timestamp);
    const end = s.endTimestamp ? ` bis ${new Date(s.endTimestamp).toLocaleString('de-DE')}` : '';
    return `• ${date.toLocaleString('de-DE')}${end}: ${s.type} (Stärke: ${s.severity}/10)${s.notes ? ` – ${s.notes}` : ''}`;
  }).join('\n');

  return `Du analysierst ein Lebensmitteltagebuch auf Unverträglichkeiten.

Bekannte Unverträglichkeiten: Laktose, Fruktose
Vermutet: Histamin, Kohlenhydrate

WICHTIG: Symptome können bis zu 72 Stunden nach der Mahlzeit auftreten. Berücksichtige kumulierende Effekte (z.B. Histamin-Bucket-Effekt).

MAHLZEITEN:
${mealsText}

SYMPTOME:
${symptomsText}

Analysiere:
1. Welche Zutaten tauchen häufig in den 72h vor Symptomen auf?
2. Gibt es Muster bei bestimmten Zutaten und Symptomtypen?
3. Kumulierende Effekte (mehrere problematische Mahlzeiten hintereinander)?
4. Welche Unverträglichkeiten könnten dahinterstecken?
5. Konkrete Empfehlung: Welche Zutaten zuerst weglassen?

Antworte auf Deutsch, strukturiert mit Überschriften. Weise darauf hin dass dies keine medizinische Diagnose ist.`;
}

// ── OpenAI / ChatGPT ────────────────────────────────────────────
async function analyzeWithOpenAI(meals, symptoms, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // günstiger als gpt-4o
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(meals, symptoms) }
      ],
      max_tokens: 1500,
      temperature: 0.3,
    }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI Fehler: ${error.error?.message || 'Unbekannter Fehler'}`);
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

// ── Google Gemini ───────────────────────────────────────────────
async function analyzeWithGemini(meals, symptoms, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: SYSTEM_PROMPT + '\n\n' + buildPrompt(meals, symptoms) }]
        }],
        generationConfig: { maxOutputTokens: 1500, temperature: 0.3 },
      }),
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini Fehler: ${error.error?.message || 'Unbekannter Fehler'}`);
  }
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// ── Groq (kostenlos, Llama 3) ───────────────────────────────────
async function analyzeWithGroq(meals, symptoms, apiKey) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(meals, symptoms) }
      ],
      max_tokens: 1500,
      temperature: 0.3,
    }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Groq Fehler: ${error.error?.message || 'Unbekannter Fehler'}`);
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

// ── Haupt-Exportfunktion ────────────────────────────────────────
export const analyzeWithAI = async (meals, symptoms, apiKey, provider = 'groq') => {
  if (!apiKey) throw new Error('Kein API-Key hinterlegt. Bitte unter Einstellungen einen Key eingeben.');
  if (meals.length < 3) throw new Error('Bitte mindestens 3 Mahlzeiten eintragen.');
  if (symptoms.length < 2) throw new Error('Bitte mindestens 2 Symptome eintragen.');

  switch (provider) {
    case 'openai': return await analyzeWithOpenAI(meals, symptoms, apiKey);
    case 'gemini': return await analyzeWithGemini(meals, symptoms, apiKey);
    case 'groq':
    default: return await analyzeWithGroq(meals, symptoms, apiKey);
  }
};

// ── Lokale Analyse (kein API-Key nötig) ────────────────────────
export const quickLocalAnalysis = (meals, symptoms) => {
  if (meals.length === 0 || symptoms.length === 0) return null;
  const ingredientSymptomMap = {};
  symptoms.forEach(symptom => {
    if (symptom.noProblem) return;
    const symptomTime = new Date(symptom.timestamp).getTime();
    const recentMeals = meals.filter(meal => {
      const mealTime = new Date(meal.timestamp).getTime();
      const diff = (symptomTime - mealTime) / (1000 * 60 * 60);
      return diff >= 0 && diff <= 72;
    });
    recentMeals.forEach(meal => {
      const ings = meal.ingredients || meal.items?.flatMap(i => i.ingredients) || [];
      ings.forEach(ingredient => {
        const key = ingredient.toLowerCase().trim();
        if (!ingredientSymptomMap[key]) ingredientSymptomMap[key] = { count: 0, symptoms: [] };
        ingredientSymptomMap[key].count++;
        if (!ingredientSymptomMap[key].symptoms.includes(symptom.type))
          ingredientSymptomMap[key].symptoms.push(symptom.type);
      });
    });
  });
  return Object.entries(ingredientSymptomMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([ingredient, data]) => ({ ingredient, occurrences: data.count, symptoms: data.symptoms }));
};
