// KI-Analyse – unterstützt OpenAI, Google Gemini und Groq

const SYSTEM_PROMPT = `Du bist ein erfahrener Ernährungsberater mit Spezialisierung auf Lebensmittelunverträglichkeiten. Du analysierst Tagebuchdaten und erkennst Muster zwischen Lebensmitteln und Symptomen.`;

function buildPrompt(meals, symptoms, researchedIngredients = {}) {
  const mealsText = meals.map(m => {
    const date = new Date(m.timestamp);
    const items = m.items ? m.items.map(i => i.label).join(', ') : m.ingredients.join(', ');
    const allIngs = m.ingredients?.join(', ') || items;
    const portion = m.portionSize ? ` | Portionsgröße: ${m.portionSize}` : '';
    const aids = m.aids ? ` | Hilfsmittel eingenommen: ${m.aids}` : ' | Keine Hilfsmittel eingenommen';
    return `• ${date.toLocaleString('de-DE')}: ${m.name} | Gerichte: ${items} | Zutaten: ${allIngs}${portion}${aids}${m.notes ? ` | Notiz: ${m.notes}` : ''}`;
  }).join('\n');

  const symptomsText = symptoms.map(s => {
    const date = new Date(s.timestamp);
    const end = s.endTimestamp ? ` bis ${new Date(s.endTimestamp).toLocaleString('de-DE')}` : '';
    return `• ${date.toLocaleString('de-DE')}${end}: ${s.type} (Stärke: ${s.severity}/10)${s.notes ? ` – ${s.notes}` : ''}`;
  }).join('\n');

  const researchedKeys = Object.keys(researchedIngredients);
  const researchedText = researchedKeys.length > 0
    ? `\n\nPER WEB-RECHERCHE ERMITTELTE INHALTSSTOFFE VON MARKENPRODUKTEN:\n${researchedKeys.map(k => `• ${k}: ${researchedIngredients[k].join(', ')}`).join('\n')}\n\nBeziehe diese recherchierten Inhaltsstoffe mit in die Analyse ein, auch wenn sie nicht explizit in der Zutatenliste der Mahlzeit standen.`
    : '';

  return `Du analysierst ein Lebensmitteltagebuch auf Unverträglichkeiten.

Bekannte Unverträglichkeiten: Laktose, Fruktose
Vermutet: Histamin, Kohlenhydrate, SIBO (Dünndarmfehlbesiedlung), Gluten, FODMAP

WICHTIG: Symptome können bis zu 72 Stunden nach der Mahlzeit auftreten. Berücksichtige kumulierende Effekte (z.B. Histamin-Bucket-Effekt).

WICHTIG zu Hilfsmitteln: Wenn bei einer Mahlzeit ein Hilfsmittel wie eine Laktase-Tablette eingenommen wurde, UND keine Symptome auftraten, ist das KEIN Beweis dass die Person Laktose verträgt — das Hilfsmittel hat die Verdauung unterstützt. Werte solche Fälle separat aus und weise explizit darauf hin.

WICHTIG zu Portionsgrößen: Prüfe ob es eine Dosis-Wirkungs-Beziehung gibt — z.B. kleine Mengen eines Lebensmittels werden vertragen, größere Mengen verursachen Symptome. Das deutet auf eine Toleranzschwelle hin (häufig bei Laktose, Fruktose, FODMAP, Histamin).

MAHLZEITEN:
${mealsText}

SYMPTOME:
${symptomsText}${researchedText}

Analysiere:
1. Welche Zutaten tauchen häufig in den 72h vor Symptomen auf?
2. Gibt es Muster bei bestimmten Zutaten und Symptomtypen?
3. Kumulierende Effekte (mehrere problematische Mahlzeiten hintereinander)?
4. Gibt es Hinweise auf eine Toleranzschwelle (kleine Menge OK, große Menge problematisch)?
5. Welche Fälle mit Hilfsmitteln (z.B. Laktase) sind nicht aussagekräftig für die natürliche Verträglichkeit?
6. Welche Unverträglichkeiten könnten dahinterstecken (Laktose, Fruktose, Histamin, Gluten, FODMAP, SIBO)?
7. Konkrete Empfehlung: Welche Zutaten zuerst weglassen, und welche Tests (z.B. kontrollierte kleine Mengen ohne Hilfsmittel) sinnvoll wären?

Antworte auf Deutsch, strukturiert mit Überschriften. Weise darauf hin dass dies keine medizinische Diagnose ist und SIBO/Gluten-Verdacht ärztlich abgeklärt werden sollte (z.B. H2-Atemtest, Zöliakie-Diagnostik).`;
}

// ── Web-Recherche für unbekannte Markenprodukte (via Gemini Search Grounding) ──
// Läuft NUR wenn ein Gemini-Key hinterlegt ist. Schlägt sie fehl (Überlastung etc.),
// wird sie einfach übersprungen – die Hauptanalyse läuft trotzdem normal weiter.
async function lookupUnknownIngredients(meals, geminiKey) {
  if (!geminiKey) return {};

  // Sammle alle "items" Labels (Gerichtsnamen/Markennamen) aus allen Mahlzeiten
  const allLabels = new Set();
  meals.forEach(m => {
    (m.items || []).forEach(it => allLabels.add(it.label));
  });
  if (allLabels.size === 0) return {};

  const labelsList = [...allLabels].join(', ');
  const lookupPrompt = `Für folgende Lebensmittel/Markenprodukte: ${labelsList}

Falls es sich um ein bekanntes Markenprodukt oder Fertigprodukt handelt (z.B. Getränke, Süßigkeiten, Fertiggerichte), recherchiere die wichtigsten Inhaltsstoffe/Zutaten (z.B. von der Herstellerseite oder Verpackungsangaben).

Antworte NUR als JSON-Objekt, ohne Markdown-Codeblock, im Format:
{"Produktname": ["Zutat1", "Zutat2", ...], ...}

Lasse Produkte die bereits einfache Lebensmittel sind (z.B. "Äpfel", "Milch") komplett weg – nur Markenprodukte/Fertigprodukte mit recherchierbaren Inhaltsstoffen aufnehmen. Falls du zu einem Produkt nichts Verlässliches findest, lasse es ebenfalls weg.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: lookupPrompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 800, temperature: 0.1 },
        }),
      }
    );
    if (!response.ok) return {}; // Überlastet, Rate-Limit etc. → einfach überspringen

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    text = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    // Jeglicher Fehler (Netzwerk, Parsing, Überlastung) → stillschweigend überspringen
    return {};
  }
}


async function analyzeWithOpenAI(meals, symptoms, apiKey, researchedIngredients) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // günstiger als gpt-4o
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(meals, symptoms, researchedIngredients) }
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
async function analyzeWithGemini(meals, symptoms, apiKey, researchedIngredients) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: SYSTEM_PROMPT + '\n\n' + buildPrompt(meals, symptoms, researchedIngredients) }]
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
async function analyzeWithGroq(meals, symptoms, apiKey, researchedIngredients) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(meals, symptoms, researchedIngredients) }
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
// geminiKeyForResearch: optionaler Gemini-Key NUR für die Web-Recherche von
// Markenprodukten – unabhängig davon welcher "provider" für die eigentliche
// Analyse gewählt wurde. Schlägt die Recherche fehl, wird sie übersprungen.
export const analyzeWithAI = async (meals, symptoms, apiKey, provider = 'groq', geminiKeyForResearch = null) => {
  if (!apiKey) throw new Error('Kein API-Key hinterlegt. Bitte unter Einstellungen einen Key eingeben.');
  if (meals.length < 3) throw new Error('Bitte mindestens 3 Mahlzeiten eintragen.');
  if (symptoms.length < 2) throw new Error('Bitte mindestens 2 Symptome eintragen.');

  // Schritt 1: Versuche unbekannte Markenprodukte zu recherchieren (best effort)
  const researchedIngredients = await lookupUnknownIngredients(meals, geminiKeyForResearch);

  // Schritt 2: Eigentliche Analyse mit dem gewählten Provider
  switch (provider) {
    case 'openai': return await analyzeWithOpenAI(meals, symptoms, apiKey, researchedIngredients);
    case 'gemini': return await analyzeWithGemini(meals, symptoms, apiKey, researchedIngredients);
    case 'groq':
    default: return await analyzeWithGroq(meals, symptoms, apiKey, researchedIngredients);
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
