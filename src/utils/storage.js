import AsyncStorage from '@react-native-async-storage/async-storage';

const MEALS_KEY = 'food_diary_meals';
const SYMPTOMS_KEY = 'food_diary_symptoms';
const API_KEY_KEY = 'food_diary_api_key';

// ── Mahlzeiten ──────────────────────────────────────────────────
export const saveMeal = async (meal) => {
  const meals = await getMeals();
  const updated = [meal, ...meals];
  await AsyncStorage.setItem(MEALS_KEY, JSON.stringify(updated));
};

export const getMeals = async () => {
  const data = await AsyncStorage.getItem(MEALS_KEY);
  return data ? JSON.parse(data) : [];
};

export const deleteMeal = async (id) => {
  const meals = await getMeals();
  const updated = meals.filter(m => m.id !== id);
  await AsyncStorage.setItem(MEALS_KEY, JSON.stringify(updated));
};

// ── Symptome ────────────────────────────────────────────────────
export const saveSymptom = async (symptom) => {
  const symptoms = await getSymptoms();
  const updated = [symptom, ...symptoms];
  await AsyncStorage.setItem(SYMPTOMS_KEY, JSON.stringify(updated));
};

export const getSymptoms = async () => {
  const data = await AsyncStorage.getItem(SYMPTOMS_KEY);
  return data ? JSON.parse(data) : [];
};

export const deleteSymptom = async (id) => {
  const symptoms = await getSymptoms();
  const updated = symptoms.filter(s => s.id !== id);
  await AsyncStorage.setItem(SYMPTOMS_KEY, JSON.stringify(updated));
};

// ── API Key ─────────────────────────────────────────────────────
export const saveApiKey = async (key) => {
  await AsyncStorage.setItem(API_KEY_KEY, key);
};

export const getApiKey = async () => {
  return await AsyncStorage.getItem(API_KEY_KEY);
};

// ── Export als JSON ─────────────────────────────────────────────
export const exportAllData = async () => {
  const meals = await getMeals();
  const symptoms = await getSymptoms();
  return { meals, symptoms, exportedAt: new Date().toISOString() };
};

// ── Angepasste Schnellauswahl ────────────────────────────────────
const CUSTOM_INGREDIENTS_KEY = 'food_diary_custom_ingredients';

export const saveCustomIngredients = async (list) => {
  await AsyncStorage.setItem(CUSTOM_INGREDIENTS_KEY, JSON.stringify(list));
};

export const getCustomIngredients = async () => {
  const data = await AsyncStorage.getItem(CUSTOM_INGREDIENTS_KEY);
  return data ? JSON.parse(data) : null;
};
