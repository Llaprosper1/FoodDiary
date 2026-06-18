import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../utils/themeContext';
import {
  saveMeal, getMeals, deleteMeal, updateMeal,
  getCustomIngredients, saveCustomIngredients,
  getIngredientGroups, saveIngredientGroups,
} from '../utils/storage';

const DEFAULT_INGREDIENTS = [
  'Milch','Käse','Joghurt','Butter','Sahne','Weizen','Gluten','Brot','Nudeln',
  'Äpfel','Birnen','Mango','Zwiebeln','Knoblauch','Tomaten','Paprika',
  'Eier','Fleisch','Fisch','Nüsse','Soja','Zucker','Laktose','Fruktose',
];

// ── Hilfsfunktionen ────────────────────────────────────────────
function getDayKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDayLabel(key) {
  const today = getDayKey(new Date().toISOString());
  const yesterday = getDayKey(new Date(Date.now() - 86400000).toISOString());
  if (key === today) return '📅 Heute';
  if (key === yesterday) return '📅 Gestern';
  const d = new Date(key);
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function groupByDay(meals) {
  // Sortiere alle Mahlzeiten: neueste zuerst für Tage, aber innerhalb eines Tages älteste zuerst
  const map = {};
  meals.forEach(m => {
    const key = getDayKey(m.timestamp);
    if (!map[key]) map[key] = [];
    map[key].push(m);
  });
  // Innerhalb jedes Tages: chronologisch (älteste oben)
  Object.keys(map).forEach(key => {
    map[key].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  });
  // Tage: neueste zuerst
  const sorted = Object.keys(map).sort((a, b) => b.localeCompare(a));
  return sorted.map(key => ({ key, label: getDayLabel(key), meals: map[key] }));
}

// ── Gruppen-Modal ──────────────────────────────────────────────
function GroupsModal({ visible, groups, onClose, onGroupsChanged, theme }) {
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupIngredients, setNewGroupIngredients] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editIngredients, setEditIngredients] = useState('');
  const S = makeStyles(theme);

  const addGroup = async () => {
    const name = newGroupName.trim();
    const ings = newGroupIngredients.split(',').map(i => i.trim()).filter(Boolean);
    if (!name || ings.length === 0) { Alert.alert('Fehler', 'Name und Zutaten (kommagetrennt) eingeben.'); return; }
    const updated = [...groups, { id: Date.now().toString(), name, ingredients: ings }];
    await saveIngredientGroups(updated);
    onGroupsChanged(updated);
    setNewGroupName(''); setNewGroupIngredients('');
  };

  const deleteGroup = (id) => {
    Alert.alert('Löschen', 'Gruppe löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => {
        const updated = groups.filter(g => g.id !== id);
        await saveIngredientGroups(updated); onGroupsChanged(updated);
      }},
    ]);
  };

  const saveEdit = async () => {
    const name = editName.trim();
    const ings = editIngredients.split(',').map(i => i.trim()).filter(Boolean);
    if (!name || ings.length === 0) { Alert.alert('Fehler', 'Name und Zutaten eingeben.'); return; }
    const updated = groups.map(g => g.id === editingId ? { ...g, name, ingredients: ings } : g);
    await saveIngredientGroups(updated); onGroupsChanged(updated); setEditingId(null);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[S.modalContainer, { backgroundColor: theme.background }]}>
        <View style={[S.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Text style={[S.modalTitle, { color: theme.text }]}>📦 Gruppen verwalten</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: theme.accent, fontSize: 15, fontWeight: 'bold' }}>✅ Fertig</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={[S.sectionTitle, { color: theme.primary }]}>➕ Neue Gruppe</Text>
          <TextInput style={[S.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="Gruppenname (z.B. Pommes frites)" placeholderTextColor={theme.textSecondary}
            value={newGroupName} onChangeText={setNewGroupName} />
          <TextInput style={[S.input, { marginTop: 8, backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="Zutaten kommagetrennt (z.B. Kartoffeln, Sonnenblumenöl, Salz)"
            placeholderTextColor={theme.textSecondary}
            value={newGroupIngredients} onChangeText={setNewGroupIngredients} multiline />
          <TouchableOpacity style={[S.saveBtn, { backgroundColor: theme.primary }]} onPress={addGroup}>
            <Text style={S.saveBtnText}>+ Gruppe hinzufügen</Text>
          </TouchableOpacity>

          <Text style={[S.sectionTitle, { color: theme.primary, marginTop: 24 }]}>📋 Vorhandene Gruppen</Text>
          {groups.map(g => (
            <View key={g.id} style={[S.groupCard, { backgroundColor: theme.surface, borderLeftColor: theme.accent }]}>
              {editingId === g.id ? (
                <View style={{ flex: 1 }}>
                  <TextInput style={[S.input, { backgroundColor: theme.surface2, color: theme.text, borderColor: theme.border }]}
                    value={editName} onChangeText={setEditName} placeholderTextColor={theme.textSecondary} />
                  <TextInput style={[S.input, { marginTop: 6, backgroundColor: theme.surface2, color: theme.text, borderColor: theme.border }]}
                    value={editIngredients} onChangeText={setEditIngredients} multiline placeholderTextColor={theme.textSecondary} />
                  <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
                    <TouchableOpacity style={[S.saveBtn, { flex: 1, backgroundColor: theme.primary }]} onPress={saveEdit}>
                      <Text style={S.saveBtnText}>💾 Speichern</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[S.saveBtn, { flex: 1, backgroundColor: theme.border }]} onPress={() => setEditingId(null)}>
                      <Text style={[S.saveBtnText, { color: theme.text }]}>Abbrechen</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.groupCardName, { color: theme.primary }]}>📦 {g.name}</Text>
                    <Text style={[S.groupCardSub, { color: theme.textSecondary }]}>{g.ingredients.join(' · ')}</Text>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => { setEditingId(g.id); setEditName(g.name); setEditIngredients(g.ingredients.join(', ')); }} style={{ marginRight: 14 }}>
                      <Ionicons name="pencil-outline" size={20} color={theme.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteGroup(g.id)}>
                      <Ionicons name="trash-outline" size={20} color={theme.danger} />
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
function MealForm({ initial, onSave, onCancel, quickList, groups, onQuickListChanged, onGroupsChanged, theme }) {
  const [name, setName] = useState(initial?.name || '');
  const [ingredientInput, setIngredientInput] = useState('');
  // Zutaten: Array von { type: 'single'|'group', label: string, ingredients: string[] }
  const [items, setItems] = useState(() => {
    if (!initial) return [];
    // Beim Editieren: alle Zutaten als Einzel-Items laden
    return initial.items || initial.ingredients.map(i => ({ type: 'single', label: i, ingredients: [i] }));
  });
  const [notes, setNotes] = useState(initial?.notes || '');
  const [date, setDate] = useState(initial ? new Date(initial.timestamp) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEditQuick, setShowEditQuick] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [newQuickItem, setNewQuickItem] = useState('');
  const S = makeStyles(theme);

  const addSingle = (ing) => {
    const trimmed = ing.trim();
    if (!trimmed) return;
    const alreadyIn = items.some(it => it.type === 'single' && it.label === trimmed);
    if (!alreadyIn) setItems(prev => [...prev, { type: 'single', label: trimmed, ingredients: [trimmed] }]);
    setIngredientInput('');
  };

  const addGroup = (group) => {
    const alreadyIn = items.some(it => it.type === 'group' && it.label === group.name);
    if (!alreadyIn) setItems(prev => [...prev, { type: 'group', label: group.name, ingredients: group.ingredients }]);
  };

  const removeItem = (label) => setItems(prev => prev.filter(it => it.label !== label));

  // Alle Zutaten für KI-Analyse flach auflisten
  const allIngredients = [...new Set(items.flatMap(it => it.ingredients))];

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Fehler', 'Bitte einen Namen eingeben.'); return; }
    if (items.length === 0) { Alert.alert('Fehler', 'Bitte mindestens eine Zutat angeben.'); return; }
    onSave({
      id: initial?.id || Date.now().toString(),
      name: name.trim(),
      items, // für Anzeige (Gruppen + Einzelzutaten)
      ingredients: allIngredients, // für KI-Analyse
      notes: notes.trim(),
      timestamp: date.toISOString(),
    });
  };

  const inputStyle = [S.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: theme.background }}>
      <GroupsModal visible={showGroupsModal} groups={groups} theme={theme}
        onClose={() => setShowGroupsModal(false)} onGroupsChanged={onGroupsChanged} />

      <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={[S.formTitle, { color: theme.primary }]}>{initial ? '✏️ Bearbeiten' : '🍽️ Neue Mahlzeit'}</Text>

        {/* Datum & Uhrzeit */}
        <Text style={[S.label, { color: theme.text }]}>Datum & Uhrzeit *</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={[S.dateBtn, { backgroundColor: theme.accentLight, borderColor: theme.accent }]} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color={theme.primary} />
            <Text style={[S.dateBtnText, { color: theme.primary }]}>
              {date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.dateBtn, { backgroundColor: theme.accentLight, borderColor: theme.accent }]} onPress={() => setShowTimePicker(true)}>
            <Ionicons name="time-outline" size={18} color={theme.primary} />
            <Text style={[S.dateBtnText, { color: theme.primary }]}>
              {date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
            </Text>
          </TouchableOpacity>
        </View>
        {showDatePicker && <DateTimePicker value={date} mode="date" display="default"
          onChange={(e, s) => { setShowDatePicker(false); if (s) { const d = new Date(date); d.setFullYear(s.getFullYear(), s.getMonth(), s.getDate()); setDate(d); }}} />}
        {showTimePicker && <DateTimePicker value={date} mode="time" display="default" is24Hour={true}
          onChange={(e, s) => { setShowTimePicker(false); if (s) { const d = new Date(date); d.setHours(s.getHours(), s.getMinutes()); setDate(d); }}} />}

        {/* Name */}
        <Text style={[S.label, { color: theme.text }]}>Name der Mahlzeit *</Text>
        <TextInput style={inputStyle} placeholder="z.B. Mittagessen..." placeholderTextColor={theme.textSecondary} value={name} onChangeText={setName} />

        {/* Zutaten eingeben */}
        <Text style={[S.label, { color: theme.text }]}>Zutaten & Gerichte *</Text>
        <View style={{ flexDirection: 'row' }}>
          <TextInput style={[inputStyle, { flex: 1, marginRight: 8 }]}
            placeholder="Einzelne Zutat..." placeholderTextColor={theme.textSecondary}
            value={ingredientInput} onChangeText={setIngredientInput}
            onSubmitEditing={() => addSingle(ingredientInput)} />
          <TouchableOpacity style={[S.addBtn, { backgroundColor: theme.accent }]} onPress={() => addSingle(ingredientInput)}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Gruppen */}
        <TouchableOpacity style={[S.groupToggleBtn, { backgroundColor: theme.accentLight }]} onPress={() => setShowGroups(!showGroups)}>
          <Ionicons name="albums-outline" size={16} color={theme.primary} />
          <Text style={[S.groupToggleText, { color: theme.primary }]}>{showGroups ? 'Gruppen ausblenden' : '📦 Gericht-Gruppen verwenden'}</Text>
        </TouchableOpacity>

        {showGroups && (
          <View style={[S.groupsBox, { backgroundColor: theme.surface2 }]}>
            <Text style={[S.sublabel, { color: theme.textSecondary }]}>Tippe auf ein Gericht um es hinzuzufügen:</Text>
            {groups.length === 0 ? (
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Noch keine Gruppen vorhanden.</Text>
            ) : groups.map(g => (
              <TouchableOpacity key={g.id} style={[S.groupChip, { backgroundColor: theme.surface, borderColor: theme.accent }]} onPress={() => addGroup(g)}>
                <Text style={[S.groupChipText, { color: theme.primary }]}>📦 {g.name}</Text>
                <Text style={[S.groupChipSub, { color: theme.textSecondary }]}>{g.ingredients.join(', ')}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[S.manageBtn, { backgroundColor: theme.primary }]} onPress={() => setShowGroupsModal(true)}>
              <Ionicons name="settings-outline" size={15} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Gruppen verwalten</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Schnellauswahl */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <Text style={[S.sublabel, { color: theme.textSecondary }]}>Schnellauswahl:</Text>
          <TouchableOpacity onPress={() => setShowEditQuick(!showEditQuick)}>
            <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600' }}>{showEditQuick ? 'Fertig' : '✏️ Anpassen'}</Text>
          </TouchableOpacity>
        </View>

        {showEditQuick && (
          <View style={[S.editQuickBox, { backgroundColor: theme.surface2 }]}>
            <View style={{ flexDirection: 'row' }}>
              <TextInput style={[inputStyle, { flex: 1, marginRight: 8 }]}
                placeholder="Neue Zutat..." placeholderTextColor={theme.textSecondary}
                value={newQuickItem} onChangeText={setNewQuickItem} />
              <TouchableOpacity style={[S.addBtn, { backgroundColor: theme.accent }]} onPress={async () => {
                const t = newQuickItem.trim();
                if (t && !quickList.includes(t)) { const u = [...quickList, t]; await saveCustomIngredients(u); onQuickListChanged(u); setNewQuickItem(''); }
              }}><Ionicons name="add" size={24} color="#fff" /></TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {quickList.map(ing => (
                <TouchableOpacity key={ing} style={[S.chipDelete, { borderColor: theme.danger }]} onPress={async () => {
                  const u = quickList.filter(i => i !== ing); await saveCustomIngredients(u); onQuickListChanged(u);
                }}><Text style={{ color: theme.danger, fontSize: 13 }}>{ing} ✕</Text></TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {quickList.map(ing => {
            const sel = items.some(it => it.type === 'single' && it.label === ing);
            return (
              <TouchableOpacity key={ing}
                style={[S.chip, { backgroundColor: sel ? theme.accent : theme.accentLight, borderColor: theme.accent }]}
                onPress={() => sel ? removeItem(ing) : addSingle(ing)}>
                <Text style={{ color: sel ? '#fff' : theme.primary, fontSize: 13, fontWeight: sel ? '600' : '400' }}>{ing}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Ausgewählte Items */}
        {items.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={[S.sublabel, { color: theme.textSecondary }]}>✅ Hinzugefügt (tippe zum Entfernen):</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {items.map(it => (
                <TouchableOpacity key={it.label}
                  style={[S.chip, { backgroundColor: it.type === 'group' ? theme.primary : theme.accent, borderColor: 'transparent' }]}
                  onPress={() => removeItem(it.label)}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
                    {it.type === 'group' ? '📦 ' : ''}{it.label} ✕
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <Text style={[S.label, { color: theme.text }]}>Notizen (optional)</Text>
        <TextInput style={[inputStyle, { height: 80 }]} placeholder="Portionsgröße, Zubereitungsart..."
          placeholderTextColor={theme.textSecondary} value={notes} onChangeText={setNotes} multiline />

        <TouchableOpacity style={[S.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSave}>
          <Text style={S.saveBtnText}>💾 {initial ? 'Änderungen speichern' : 'Mahlzeit speichern'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ alignItems: 'center', marginTop: 12, padding: 10 }} onPress={onCancel}>
          <Text style={{ color: theme.textSecondary, fontSize: 15 }}>Abbrechen</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Tages-Gruppe (aufklappbar) ─────────────────────────────────
function DayGroup({ dayData, onEdit, onDelete, theme, todayKey }) {
  const [expanded, setExpanded] = useState(dayData.key === todayKey);
  const S = makeStyles(theme);

  return (
    <View style={{ marginBottom: 10 }}>
      <TouchableOpacity
        style={[S.dayHeader, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={[S.dayHeaderText, { color: theme.primary }]}>{dayData.label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{dayData.meals.length} Einträge</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.primary} />
        </View>
      </TouchableOpacity>

      {expanded && dayData.meals.map(meal => (
        <MealCard key={meal.id} meal={meal} onEdit={onEdit} onDelete={onDelete} theme={theme} />
      ))}
    </View>
  );
}

// ── Mahlzeit-Karte (aufklappbar) ───────────────────────────────
function MealCard({ meal, onEdit, onDelete, theme }) {
  const [expanded, setExpanded] = useState(false);
  const S = makeStyles(theme);

  const time = new Date(meal.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const items = meal.items || meal.ingredients.map(i => ({ type: 'single', label: i, ingredients: [i] }));

  return (
    <View style={[S.mealCard, { backgroundColor: theme.surface, borderLeftColor: theme.accent }]}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={[S.mealName, { color: theme.text }]}>{meal.name}</Text>
            <Text style={[S.mealTime, { color: theme.textSecondary }]}>🕐 {time} Uhr</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => onEdit(meal)}>
              <Ionicons name="pencil-outline" size={18} color={theme.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(meal.id)}>
              <Ionicons name="trash-outline" size={18} color={theme.danger} />
            </TouchableOpacity>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
          </View>
        </View>

        {/* Immer sichtbar: Gerichte/Gruppen als Tags */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
          {items.map(it => (
            <View key={it.label} style={[S.itemTag, {
              backgroundColor: it.type === 'group' ? theme.primary : theme.accentLight,
              borderColor: it.type === 'group' ? theme.primary : theme.accent
            }]}>
              <Text style={{ color: it.type === 'group' ? '#fff' : theme.primary, fontSize: 12 }}>
                {it.type === 'group' ? '📦 ' : ''}{it.label}
              </Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>

      {/* Ausgeklappt: alle Einzelzutaten */}
      {expanded && (
        <View style={[S.expandedBox, { borderTopColor: theme.border }]}>
          <Text style={[S.expandedTitle, { color: theme.textSecondary }]}>🔬 Alle Zutaten für Analyse:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {[...new Set(items.flatMap(it => it.ingredients))].map(ing => (
              <View key={ing} style={[S.ingredientTag, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
                <Text style={{ color: theme.textSecondary, fontSize: 11 }}>{ing}</Text>
              </View>
            ))}
          </View>
          {meal.notes ? <Text style={[S.mealNotes, { color: theme.textSecondary }]}>📝 {meal.notes}</Text> : null}
        </View>
      )}
    </View>
  );
}

// ── Hauptscreen ────────────────────────────────────────────────
export default function MealsScreen() {
  const { theme } = useTheme();
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
    if (editingMeal) await updateMeal(meal); else await saveMeal(meal);
    setShowForm(false); setEditingMeal(null); loadAll();
  };

  const handleDelete = (id) => {
    Alert.alert('Löschen', 'Mahlzeit wirklich löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => { await deleteMeal(id); loadAll(); }},
    ]);
  };

  const todayKey = getDayKey(new Date().toISOString());
  const grouped = groupByDay(meals);

  if (showForm) {
    return <MealForm initial={editingMeal} quickList={quickList} groups={groups} theme={theme}
      onSave={handleSave} onCancel={() => { setShowForm(false); setEditingMeal(null); }}
      onQuickListChanged={setQuickList} onGroupsChanged={setGroups} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <TouchableOpacity style={[makeStyles(theme).fabButton, { backgroundColor: theme.primary }]}
        onPress={() => { setEditingMeal(null); setShowForm(true); }}>
        <Ionicons name="add" size={28} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Mahlzeit eintragen</Text>
      </TouchableOpacity>

      {grouped.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Text style={{ fontSize: 60, marginBottom: 16 }}>🍽️</Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text, textAlign: 'center' }}>Noch keine Mahlzeiten.</Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={item => item.key}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <DayGroup dayData={item} todayKey={todayKey} theme={theme}
              onEdit={(meal) => { setEditingMeal(meal); setShowForm(true); }}
              onDelete={handleDelete} />
          )}
        />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
function makeStyles(theme) {
  return StyleSheet.create({
    formTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
    label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 4 },
    sublabel: { fontSize: 12, marginTop: 4, marginBottom: 4 },
    input: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15 },
    dateBtn: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateBtnText: { fontWeight: '600', fontSize: 14 },
    addBtn: { borderRadius: 10, padding: 12, justifyContent: 'center', alignItems: 'center' },
    chip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
    chipDelete: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, backgroundColor: 'transparent' },
    groupToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, padding: 10, marginTop: 10 },
    groupToggleText: { fontWeight: '600', fontSize: 13 },
    groupsBox: { borderRadius: 10, padding: 12, marginTop: 6 },
    groupChip: { borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1 },
    groupChipText: { fontWeight: '600', fontSize: 14 },
    groupChipSub: { fontSize: 11, marginTop: 2 },
    manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, padding: 10, marginTop: 8, justifyContent: 'center' },
    editQuickBox: { borderRadius: 10, padding: 10, marginBottom: 8 },
    saveBtn: { borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
    fabButton: { margin: 16, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 3 },
    dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
    dayHeaderText: { fontWeight: 'bold', fontSize: 14 },
    mealCard: { borderRadius: 10, padding: 12, marginBottom: 8, borderLeftWidth: 4, elevation: 1 },
    mealName: { fontSize: 15, fontWeight: '600' },
    mealTime: { fontSize: 12, marginTop: 2 },
    mealNotes: { fontSize: 13, marginTop: 8, fontStyle: 'italic' },
    itemTag: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
    ingredientTag: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
    expandedBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
    expandedTitle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
    modalContainer: { flex: 1 },
    modalHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1 },
    modalTitle: { fontSize: 17, fontWeight: 'bold' },
    groupCard: { borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 3, elevation: 1 },
    groupCardName: { fontWeight: 'bold', fontSize: 14 },
    groupCardSub: { fontSize: 12, marginTop: 2 },
  });
}
