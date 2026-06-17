// KI-Analyse mit OpenAI ChatGPT API
// Der Nutzer trägt seinen eigenen API-Key in den Einstellungen ein

export const analyzeWithAI = async (meals, symptoms, apiKey) => {
  if (!apiKey) {
    throw new Error('Kein API-Key hinterlegt. Bitte unter Einstellungen einen OpenAI API-Key eingeben.');
  }

  if (meals.length < 3) {
    throw new Error('Bitte trage mindestens 3 Mahlzeiten ein, bevor du eine Analyse startest.');
  }

  if (symptoms.length < 2) {
    throw new Error('Bitte trage mindestens 2 Symptome ein, bevor du eine Analyse startest.');
  }

  // Daten aufbereiten für den KI-Prompt
  const mealsText = meals.map(m => {
    const date = new Date(m.timestamp);
    return `• ${date.toLocaleString('de-DE')}: ${m.name} (Zutaten: ${m.ingredients.join(', ')})${m.notes ? ` – Notiz: ${m.notes}` : ''}`;
  }).join('\n');

  const symptomsText = symptoms.map(s => {
    const date = new Date(s.timestamp);
    return `• ${date.toLocaleString('de-DE')}: ${s.type} (Stärke: ${s.severity}/10)${s.notes ? ` – Notiz: ${s.notes}` : ''}`;
  }).join('\n');

  const prompt = `Du bist ein Ernährungsexperte und analysierst ein Lebensmitteltagebuch auf Unverträglichkeiten.

Der Patient weiß bereits, dass er auf Laktose und Fruktose reagiert. Er vermutet außerdem Histamin-Intoleranz und möglicherweise eine Kohlenhydrat-Unverträglichkeit.

WICHTIG: Symptome können bei diesem Patienten mit einer Verzögerung von bis zu 72 Stunden nach der Mahlzeit auftreten. Berücksichtige daher bei der Analyse alle Mahlzeiten innerhalb von 72 Stunden vor einem Symptom – nicht nur die letzte Mahlzeit. Manche Reaktionen (z.B. Histamin-Intoleranz, FODMAP, Darmflora-Reaktionen) sind typischerweise verzögert.

MAHLZEITEN (chronologisch):
${mealsText}

SYMPTOME (chronologisch):
${symptomsText}

Analysiere bitte:
1. Welche Zutaten oder Lebensmittelgruppen tauchen häufig in den 72 Stunden VOR Symptomen auf?
2. Gibt es Muster bei bestimmten Zutaten und bestimmten Symptomtypen?
3. Gibt es Hinweise auf kumulierende Effekte (z.B. Histamin-Bucket-Effekt: mehrere histaminreiche Mahlzeiten hintereinander)?
4. Welche Unverträglichkeiten könnten dahinterstecken (Laktose, Fruktose, Histamin, Gluten, FODMAP, etc.)?
5. Konkrete Empfehlung: Welche Zutaten sollte der Patient zunächst weglassen und testen?

Antworte auf Deutsch, strukturiert mit Überschriften. Sei konkret und praktisch. Weise darauf hin, dass dies keine medizinische Diagnose ist und ein Arzt konsultiert werden sollte.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein erfahrener Ernährungsberater mit Spezialisierung auf Lebensmittelunverträglichkeiten. Du analysierst Tagebuchdaten und erkennst Muster zwischen Lebensmitteln und Symptomen.'
        },
        {
          role: 'user',
          content: prompt
        }
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
};

// Schnellanalyse: Häufigste Zutaten vor Symptomen (lokal, ohne API)
export const quickLocalAnalysis = (meals, symptoms) => {
  if (meals.length === 0 || symptoms.length === 0) return null;

  const ingredientSymptomMap = {};

  symptoms.forEach(symptom => {
    const symptomTime = new Date(symptom.timestamp).getTime();

    // Mahlzeiten in den 72 Stunden VOR dem Symptom
    // (Reaktionen können je nach Unverträglichkeit stark verzögert sein)
    const recentMeals = meals.filter(meal => {
      const mealTime = new Date(meal.timestamp).getTime();
      const diff = (symptomTime - mealTime) / (1000 * 60 * 60); // in Stunden
      return diff >= 0 && diff <= 72;
    });

    recentMeals.forEach(meal => {
      meal.ingredients.forEach(ingredient => {
        const key = ingredient.toLowerCase().trim();
        if (!ingredientSymptomMap[key]) {
          ingredientSymptomMap[key] = { count: 0, symptoms: [] };
        }
        ingredientSymptomMap[key].count++;
        if (!ingredientSymptomMap[key].symptoms.includes(symptom.type)) {
          ingredientSymptomMap[key].symptoms.push(symptom.type);
        }
      });
    });
  });

  // Sortiert nach Häufigkeit
  const sorted = Object.entries(ingredientSymptomMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  return sorted.map(([ingredient, data]) => ({
    ingredient,
    occurrences: data.count,
    symptoms: data.symptoms,
  }));
};
