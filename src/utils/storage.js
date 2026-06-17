import AsyncStorage from '@react-native-async-storage/async-storage';

const MEALS_KEY = 'food_diary_meals';
const SYMPTOMS_KEY = 'food_diary_symptoms';
const API_KEY_KEY = 'food_diary_api_key';
const CUSTOM_INGREDIENTS_KEY = 'food_diary_custom_ingredients';
const INGREDIENT_GROUPS_KEY = 'food_diary_ingredient_groups';

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

export const updateMeal = async (updatedMeal) => {
  const meals = await getMeals();
  const updated = meals.map(m => m.id === updatedMeal.id ? updatedMeal : m);
  await AsyncStorage.setItem(MEALS_KEY, JSON.stringify(updated));
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

// ── Angepasste Schnellauswahl ────────────────────────────────────
export const saveCustomIngredients = async (list) => {
  await AsyncStorage.setItem(CUSTOM_INGREDIENTS_KEY, JSON.stringify(list));
};

export const getCustomIngredients = async () => {
  const data = await AsyncStorage.getItem(CUSTOM_INGREDIENTS_KEY);
  return data ? JSON.parse(data) : null;
};

// ── Zutaten-Gruppen ──────────────────────────────────────────────
// Gruppe: { id, name, ingredients: [] }
const DEFAULT_GROUPS = [
  { id: '1', name: 'Pommes frites', ingredients: ['Kartoffeln', 'Sonnenblumenöl', 'Salz'] },
  { id: '2', name: 'Pizza Margherita', ingredients: ['Weizenmehl', 'Tomaten', 'Mozzarella', 'Olivenöl', 'Hefe'] },
  { id: '3', name: 'Milchkaffee', ingredients: ['Kaffee', 'Milch', 'Zucker'] },
  { id: '4', name: 'Obstsalat', ingredients: ['Äpfel', 'Birnen', 'Bananen', 'Fruktose'] },
];

export const getIngredientGroups = async () => {
  const data = await AsyncStorage.getItem(INGREDIENT_GROUPS_KEY);
  return data ? JSON.parse(data) : DEFAULT_GROUPS;
};

export const saveIngredientGroups = async (groups) => {
  await AsyncStorage.setItem(INGREDIENT_GROUPS_KEY, JSON.stringify(groups));
};

export const addIngredientGroup = async (group) => {
  const groups = await getIngredientGroups();
  const updated = [...groups, { ...group, id: Date.now().toString() }];
  await AsyncStorage.setItem(INGREDIENT_GROUPS_KEY, JSON.stringify(updated));
};

export const deleteIngredientGroup = async (id) => {
  const groups = await getIngredientGroups();
  const updated = groups.filter(g => g.id !== id);
  await AsyncStorage.setItem(INGREDIENT_GROUPS_KEY, JSON.stringify(updated));
};

// ── Export als JSON ─────────────────────────────────────────────
export const exportAllData = async () => {
  const meals = await getMeals();
  const symptoms = await getSymptoms();
  return { meals, symptoms, exportedAt: new Date().toISOString() };
};
