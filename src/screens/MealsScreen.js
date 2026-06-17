import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { saveMeal, getMeals, deleteMeal } from '../utils/storage';

const COLORS = {
  primary: '#1a472a',
  accent: '#52b788',
  light: '#d8f3dc',
  background: '#f8f9fa',
  white: '#ffffff',
  danger: '#e63946',
  text: '#212529',
  gray: '#6c757d',
  border: '#dee2e6',
};

const COMMON_INGREDIENTS = [
  'Milch', 'Käse', 'Joghurt', 'Butter', 'Sahne',
  'Weizen', 'Gluten', 'Brot', 'Nudeln',
  'Äpfel', 'Birnen', 'Mango', 'Zwiebeln', 'Knoblauch',
  'Tomaten', 'Paprika', 'Eier', 'Fleisch', 'Fisch',
  'Nüsse', 'Soja', 'Zucker', 'Laktose', 'Fruktose',
];

export default function MealsScreen() {
  const [meals, setMeals] = useState([]);
  const [name, setName] = useState('');
  const [ingredientInput, setIngredientInput] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadMeals();
    }, [])
  );

  const loadMeals = async () => {
    const data = await getMeals();
    setMeals(data);
  };

  const addIngredient = (ing) => {
    const trimmed = ing.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients([...ingredients, trimmed]);
      setIngredientInput('');
    }
  };

  const removeIngredient = (ing) => {
    setIngredients(ingredients.filter(i => i !== ing));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Fehler', 'Bitte einen Namen für die Mahlzeit eingeben.');
      return;
    }
    if (ingredients.length === 0) {
      Alert.alert('Fehler', 'Bitte mindestens eine Zutat angeben.');
      return;
    }

    const meal = {
      id: Date.now().toString(),
      name: name.trim(),
      ingredients,
      notes: notes.trim(),
      timestamp: new Date().toISOString(),
    };

    await saveMeal(meal);
    setName('');
    setIngredients([]);
    setNotes('');
    setShowForm(false);
    loadMeals();
  };

  const handleDelete = (id) => {
    Alert.alert('Löschen', 'Mahlzeit wirklich löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => {
        await deleteMeal(id);
        loadMeals();
      }},
    ]);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      {showForm ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView style={styles.form} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.formTitle}>Neue Mahlzeit</Text>

            <Text style={styles.label}>Name der Mahlzeit *</Text>
            <TextInput
              style={styles.input}
              placeholder="z.B. Mittagessen, Frühstück..."
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Zutaten *</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholder="Zutat eingeben..."
                value={ingredientInput}
                onChangeText={setIngredientInput}
                onSubmitEditing={() => addIngredient(ingredientInput)}
              />
              <TouchableOpacity style={styles.addBtn} onPress={() => addIngredient(ingredientInput)}>
                <Ionicons name="add" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sublabel}>Schnellauswahl:</Text>
            <View style={styles.chips}>
              {COMMON_INGREDIENTS.map(ing => (
                <TouchableOpacity
                  key={ing}
                  style={[styles.chip, ingredients.includes(ing) && styles.chipSelected]}
                  onPress={() => ingredients.includes(ing) ? removeIngredient(ing) : addIngredient(ing)}
                >
                  <Text style={[styles.chipText, ingredients.includes(ing) && styles.chipTextSelected]}>
                    {ing}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {ingredients.length > 0 && (
              <View style={styles.selectedIngredients}>
                <Text style={styles.sublabel}>Ausgewählt:</Text>
                <View style={styles.chips}>
                  {ingredients.map(ing => (
                    <TouchableOpacity key={ing} style={styles.chipSelected} onPress={() => removeIngredient(ing)}>
                      <Text style={styles.chipTextSelected}>{ing} ✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <Text style={styles.label}>Notizen (optional)</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Portionsgröße, Zubereitungsart, Restaurant..."
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>💾 Mahlzeit speichern</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
              <Text style={styles.cancelBtnText}>Abbrechen</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <>
          <TouchableOpacity style={styles.fabButton} onPress={() => setShowForm(true)}>
            <Ionicons name="add" size={28} color={COLORS.white} />
            <Text style={styles.fabText}>Mahlzeit eintragen</Text>
          </TouchableOpacity>

          {meals.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyText}>Noch keine Mahlzeiten eingetragen.</Text>
              <Text style={styles.emptySubtext}>Tippe auf „Mahlzeit eintragen", um zu starten.</Text>
            </View>
          ) : (
            <FlatList
              data={meals}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <TouchableOpacity onPress={() => handleDelete(item.id)}>
                      <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cardTime}>🕐 {formatDate(item.timestamp)}</Text>
                  <View style={styles.chips}>
                    {item.ingredients.map(ing => (
                      <View key={ing} style={styles.chip}>
                        <Text style={styles.chipText}>{ing}</Text>
                      </View>
                    ))}
                  </View>
                  {item.notes ? <Text style={styles.cardNotes}>📝 {item.notes}</Text> : null}
                </View>
              )}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  form: { flex: 1, padding: 16 },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 12, marginBottom: 4 },
  sublabel: { fontSize: 12, color: COLORS.gray, marginTop: 8, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  addBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: {
    backgroundColor: COLORS.light,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  chipSelected: {
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { color: COLORS.primary, fontSize: 13 },
  chipTextSelected: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  selectedIngredients: { marginTop: 8 },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { alignItems: 'center', marginTop: 12, padding: 10 },
  cancelBtnText: { color: COLORS.gray, fontSize: 15 },
  fabButton: {
    backgroundColor: COLORS.primary,
    margin: 16,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
  },
  fabText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: COLORS.gray, textAlign: 'center', marginTop: 8 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  cardTime: { fontSize: 12, color: COLORS.gray, marginVertical: 4 },
  cardNotes: { fontSize: 13, color: COLORS.gray, marginTop: 6, fontStyle: 'italic' },
});
