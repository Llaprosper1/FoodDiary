import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  saveMeal, getMeals, deleteMeal, updateMeal,
  getCustomIngredients, saveCustomIngredients,
  getIngredientGroups, saveIngredientGroups,
} from '../utils/storage';

const COLORS = {
  primary: '#1a472a', accent: '#52b788', light: '#d8f3dc',
  background: '#f8f9fa', white: '#ffffff', danger: '#e63946',
  text: '#212529', gray: '#6c757d', border: '#dee2e6',
};

const DEFAULT_INGREDIENTS = [
  'Milch','Käse','Joghurt','Butter','Sahne','Weizen','Gluten','Brot','Nudeln',
  'Äpfel','Birnen','Mango','Zwiebeln','Knoblauch','Tomaten','Paprika',
  'Eier','Fleisch','Fisch','Nüsse','Soja','Zucker','Laktose','Fruktose',
];

// ── Gruppen-Modal (eigenständig, bekommt alles direkt übergeben) ──
function GroupsModal({ visible, groups, onClose, onGroupsChanged }) {
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupIngredients, setNewGroupIngredients] = useState('');
  const [editingGroup, setEditingGroup] = useState(null);
  const [editName, setEditName] = useState('');
  const [editIngredients, setEditIngredients] = useState('');

  const addGroup = async () => {
    const name = newGroupName.trim();
    const ings = newGroupIngredients.split(',').map(i => i.trim()).filter(Boolean);
    if (!name || ings.length === 0) {
      Alert.alert('Fehler', 'Bitte Name und Zutaten (kommagetrennt) eingeben.');
      return;
    }
    const updated = [...groups, { id: Date.now().toString(), name, ingredients: ings }];
    await saveIngredientGroups(updated);
    onGroupsChanged(updated);
    setNewGroupName('');
    setNewGroupIngredients('');
  };

  const deleteGroup = async (id) => {
    Alert.alert('Löschen', 'Gruppe wirklich löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => {
        const updated = groups.filter(g => g.id !== id);
        await saveIngredientGroups(updated);
        onGroupsChanged(updated);
      }},
    ]);
  };

  const startEdit = (group) => {
    setEditingGroup(group.id);
    setEditName(group.name);
    setEditIngredients(group.ingredients.join(', '));
  };

  const saveEdit = async () => {
    const name = editName.trim();
    const ings = editIngredients.split(',').map(i => i.trim()).filter(Boolean);
    if (!name || ings.length === 0) {
      Alert.alert('Fehler', 'Bitte Name und Zutaten eingeben.');
      return;
    }
    const updated = groups.map(g => g.id === editingGroup ? { ...g, name, ingredients: ings } : g);
    await saveIngredientGroups(updated);
    onGroupsChanged(updated);
    setEditingGroup(null);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>📦 Zutaten-Gruppen</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>✅ Fertig</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Neue Gruppe */}
          <Text style={styles.sectionTitle}>➕ Neue Gruppe erstellen</Text>
          <TextInput
            style={styles.input}
            placeholder="Gruppenname (z.B. Pommes frites)"
            value={newGroupName}
            onChangeText={setNewGroupName}
          />
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Zutaten kommagetrennt (z.B. Kartoffeln, Sonnenblumenöl, Salz)"
            value={newGroupIngredients}
            onChangeText={setNewGroupIngredients}
            multiline
          />
          <TouchableOpacity style={styles.saveBtn} onPress={addGroup}>
            <Text style={styles.saveBtnText}>+ Gruppe hinzufügen</Text>
          </TouchableOpacity>

          {/* Vorhandene Gruppen */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>📋 Vorhandene Gruppen</Text>
          {groups.length === 0 && (
            <Text style={{ color: COLORS.gray, textAlign: 'center', marginTop: 10 }}>Noch keine Gruppen vorhanden.</Text>
          )}
          {groups.map(g => (
            <View key={g.id} style={styles.groupCard}>
              {editingGroup === g.id ? (
                // Edit-Modus
                <View style={{ flex: 1 }}>
                  <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Gruppenname" />
                  <TextInput
                    style={[styles.input, { marginTop: 6 }]}
                    value={editIngredients}
                    onChangeText={setEditIngredients}
                    placeholder="Zutaten kommagetrennt"
                    multiline
                  />
                  <View style={styles.editBtnRow}>
                    <TouchableOpacity style={styles.saveBtnSmall} onPress={saveEdit}>
                      <Text style={styles.saveBtnText}>💾 Speichern</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtnSmall} onPress={() => setEditingGroup(null)}>
                      <Text style={styles.cancelBtnSmallText}>Abbrechen</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                // Ansichts-Modus
                <>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.groupCardName}>📦 {g.name}</Text>
                    <Text style={styles.groupCardIngredients}>{g.ingredients.join(' · ')}</Text>
                  </View>
                  <View style={styles.groupCardActions}>
                    <TouchableOpacity onPress={() => startEdit(g)} style={{ marginRight: 12 }}>
                      <Ionicons name="pencil-outline" size={20} color={COLORS.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteGroup(g.id)}>
                      <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Mahlzeit-Formular ──────────────────────────────────────────
function MealForm({ initial, onSave, onCancel, quickList, groups, onQuickListChanged, onGroupsChanged }) {
  const [name, setName] = useState(initial?.name || '');
  const [ingredientInput, setIngredientInput] = useState('');
  const [ingredients, setIngredients] = useState(initial?.ingredients || []);
  const [notes, setNotes] = useState(initial?.notes || '');
  const [date, setDate] = useState(initial ? new Date(initial.timestamp) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEditQuick, setShowEditQuick] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [newQuickItem, setNewQuickItem] = useState('');

  const addIngredient = (ing) => {
    const trimmed = ing.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients(prev => [...prev, trimmed]);
      setIngredientInput('');
    }
  };

  const removeIngredient = (ing) => setIngredients(prev => prev.filter(i => i !== ing));

  const addGroup = (group) => {
    const toAdd = group.ingredients.filter(i => !ingredients.includes(i));
    if (toAdd.length > 0) setIngredients(prev => [...prev, ...toAdd]);
  };

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Fehler', 'Bitte einen Namen eingeben.'); return; }
    if (ingredients.length === 0) { Alert.alert('Fehler', 'Bitte mindestens eine Zutat angeben.'); return; }
    onSave({
      id: initial?.id || Date.now().toString(),
      name: name.trim(),
      ingredients,
      notes: notes.trim(),
      timestamp: date.toISOString(),
    });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <GroupsModal
        visible={showGroupsModal}
        groups={groups}
        onClose={() => setShowGroupsModal(false)}
        onGroupsChanged={onGroupsChanged}
      />

      <ScrollView style={styles.form} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.formTitle}>{initial ? '✏️ Mahlzeit bearbeiten' : '🍽️ Neue Mahlzeit'}</Text>

        <Text style={styles.label}>Datum & Uhrzeit *</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
            <Text style={styles.dateBtnText}>
              {date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowTimePicker(true)}>
            <Ionicons name="time-outline" size={18} color={COLORS.primary} />
            <Text style={styles.dateBtnText}>
              {date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
            </Text>
          </TouchableOpacity>
        </View>
        {showDatePicker && (
          <DateTimePicker value={date} mode="date" display="default"
            onChange={(e, s) => { setShowDatePicker(false); if (s) { const d = new Date(date); d.setFullYear(s.getFullYear(), s.getMonth(), s.getDate()); setDate(d); }}} />
        )}
        {showTimePicker && (
          <DateTimePicker value={date} mode="time" display="default" is24Hour={true}
            onChange={(e, s) => { setShowTimePicker(false); if (s) { const d = new Date(date); d.setHours(s.getHours(), s.getMinutes()); setDate(d); }}} />
        )}

        <Text style={styles.label}>Name der Mahlzeit *</Text>
        <TextInput style={styles.input} placeholder="z.B. Mittagessen..." value={name} onChangeText={setName} />

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

        {/* Gruppen */}
        <TouchableOpacity style={styles.groupToggleBtn} onPress={() => setShowGroups(!showGroups)}>
          <Ionicons name="albums-outline" size={16} color={COLORS.primary} />
          <Text style={styles.groupToggleText}>{showGroups ? 'Gruppen ausblenden' : '📦 Zutaten-Gruppen verwenden'}</Text>
        </TouchableOpacity>

        {showGroups && (
          <View style={styles.groupsBox}>
            <Text style={styles.sublabel}>Gruppe antippen = alle Zutaten hinzufügen:</Text>
            {groups.length === 0 ? (
              <Text style={{ color: COLORS.gray, fontSize: 13 }}>Noch keine Gruppen. Unten erstellen.</Text>
            ) : (
              <View>
                {groups.map(g => (
                  <TouchableOpacity key={g.id} style={styles.groupChip} onPress={() => addGroup(g)}>
                    <Text style={styles.groupChipText}>📦 {g.name}</Text>
                    <Text style={styles.groupChipSub}>{g.ingredients.join(', ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TouchableOpacity style={styles.manageGroupsBtn} onPress={() => setShowGroupsModal(true)}>
              <Ionicons name="settings-outline" size={15} color={COLORS.white} />
              <Text style={styles.manageGroupsBtnText}>Gruppen verwalten</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Schnellauswahl */}
        <View style={styles.quickHeader}>
          <Text style={styles.sublabel}>Schnellauswahl:</Text>
          <TouchableOpacity onPress={() => setShowEditQuick(!showEditQuick)}>
            <Text style={styles.editLink}>{showEditQuick ? 'Fertig' : '✏️ Anpassen'}</Text>
          </TouchableOpacity>
        </View>

        {showEditQuick && (
          <View style={styles.editQuickBox}>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholder="Neue Zutat zur Schnellauswahl..."
                value={newQuickItem}
                onChangeText={setNewQuickItem}
              />
              <TouchableOpacity style={styles.addBtn} onPress={async () => {
                const trimmed = newQuickItem.trim();
                if (trimmed && !quickList.includes(trimmed)) {
                  const updated = [...quickList, trimmed];
                  await saveCustomIngredients(updated);
                  onQuickListChanged(updated);
                  setNewQuickItem('');
                }
              }}>
                <Ionicons name="add" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sublabel}>Tippe ✕ zum Entfernen:</Text>
            <View style={styles.chips}>
              {quickList.map(ing => (
                <TouchableOpacity key={ing} style={styles.chipDelete} onPress={async () => {
                  const updated = quickList.filter(i => i !== ing);
                  await saveCustomIngredients(updated);
                  onQuickListChanged(updated);
                }}>
                  <Text style={styles.chipDeleteText}>{ing} ✕</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.chips}>
          {quickList.map(ing => (
            <TouchableOpacity
              key={ing}
              style={[styles.chip, ingredients.includes(ing) && styles.chipSelected]}
              onPress={() => ingredients.includes(ing) ? removeIngredient(ing) : addIngredient(ing)}
            >
              <Text style={[styles.chipText, ingredients.includes(ing) && styles.chipTextSelected]}>{ing}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {ingredients.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.sublabel}>✅ Ausgewählte Zutaten (tippe zum Entfernen):</Text>
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
          placeholder="Portionsgröße, Zubereitungsart..."
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>💾 {initial ? 'Änderungen speichern' : 'Mahlzeit speichern'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Abbrechen</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Hauptscreen ────────────────────────────────────────────────
export default function MealsScreen() {
  const [meals, setMeals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [quickList, setQuickList] = useState(DEFAULT_INGREDIENTS);
  const [groups, setGroups] = useState([]);

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const loadAll = async () => {
    const data = await getMeals();
    setMeals(data);
    const custom = await getCustomIngredients();
    if (custom) setQuickList(custom);
    const grps = await getIngredientGroups();
    setGroups(grps);
  };

  const handleSave = async (meal) => {
    if (editingMeal) await updateMeal(meal);
    else await saveMeal(meal);
    setShowForm(false);
    setEditingMeal(null);
    loadAll();
  };

  const handleDelete = (id) => {
    Alert.alert('Löschen', 'Mahlzeit wirklich löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => { await deleteMeal(id); loadAll(); }},
    ]);
  };

  const formatDate = (iso) => new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  if (showForm) {
    return (
      <MealForm
        initial={editingMeal}
        quickList={quickList}
        groups={groups}
        onSave={handleSave}
        onCancel={() => { setShowForm(false); setEditingMeal(null); }}
        onQuickListChanged={setQuickList}
        onGroupsChanged={(newGroups) => { setGroups(newGroups); }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.fabButton} onPress={() => { setEditingMeal(null); setShowForm(true); }}>
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
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => { setEditingMeal(item); setShowForm(true); }} style={{ marginRight: 14 }}>
                    <Ionicons name="pencil-outline" size={20} color={COLORS.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id)}>
                    <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  form: { flex: 1, padding: 16 },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 12, marginBottom: 4 },
  sublabel: { fontSize: 12, color: COLORS.gray, marginTop: 4, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.white, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.border, padding: 12, fontSize: 15, color: COLORS.text,
  },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateBtn: {
    flex: 1, backgroundColor: COLORS.light, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.accent, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  dateBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  addBtn: { backgroundColor: COLORS.accent, borderRadius: 10, padding: 12, justifyContent: 'center', alignItems: 'center' },
  groupToggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.light, borderRadius: 10, padding: 10, marginTop: 10,
  },
  groupToggleText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  groupsBox: { backgroundColor: COLORS.light, borderRadius: 10, padding: 12, marginTop: 6 },
  groupChip: {
    backgroundColor: COLORS.white, borderRadius: 10, padding: 10,
    marginBottom: 8, borderWidth: 1, borderColor: COLORS.accent,
  },
  groupChipText: { fontWeight: '600', color: COLORS.primary, fontSize: 14 },
  groupChipSub: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  manageGroupsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: 8, padding: 10, marginTop: 8,
    justifyContent: 'center',
  },
  manageGroupsBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
  quickHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  editLink: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  editQuickBox: { backgroundColor: COLORS.light, borderRadius: 10, padding: 10, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: {
    backgroundColor: COLORS.light, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.accent,
  },
  chipSelected: { backgroundColor: COLORS.accent, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipDelete: {
    backgroundColor: '#fce4e4', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.danger,
  },
  chipDeleteText: { color: COLORS.danger, fontSize: 13 },
  chipText: { color: COLORS.primary, fontSize: 13 },
  chipTextSelected: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  saveBtnSmall: { backgroundColor: COLORS.primary, borderRadius: 10, padding: 10, alignItems: 'center', flex: 1, marginRight: 8 },
  saveBtnText: { color: COLORS.white, fontSize: 15, fontWeight: 'bold' },
  cancelBtn: { alignItems: 'center', marginTop: 12, padding: 10 },
  cancelBtnText: { color: COLORS.gray, fontSize: 15 },
  cancelBtnSmall: { backgroundColor: COLORS.border, borderRadius: 10, padding: 10, alignItems: 'center', flex: 1 },
  cancelBtnSmallText: { color: COLORS.text, fontSize: 14 },
  editBtnRow: { flexDirection: 'row', marginTop: 8 },
  fabButton: {
    backgroundColor: COLORS.primary, margin: 16, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 3,
  },
  fabText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: COLORS.gray, textAlign: 'center', marginTop: 8 },
  card: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14,
    marginBottom: 12, elevation: 2, borderLeftWidth: 4, borderLeftColor: COLORS.accent,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardActions: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, flex: 1 },
  cardTime: { fontSize: 12, color: COLORS.gray, marginVertical: 4 },
  cardNotes: { fontSize: 13, color: COLORS.gray, marginTop: 6, fontStyle: 'italic' },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    backgroundColor: COLORS.primary, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  modalTitle: { color: COLORS.white, fontSize: 17, fontWeight: 'bold' },
  modalClose: { color: COLORS.accent, fontSize: 15, fontWeight: 'bold' },
  groupCard: {
    backgroundColor: COLORS.white, borderRadius: 10, padding: 12,
    marginBottom: 8, flexDirection: 'row', alignItems: 'center',
    borderLeftWidth: 3, borderLeftColor: COLORS.accent, elevation: 1,
  },
  groupCardName: { fontWeight: 'bold', color: COLORS.primary, fontSize: 14 },
  groupCardIngredients: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  groupCardActions: { flexDirection: 'row', alignItems: 'center' },
});
