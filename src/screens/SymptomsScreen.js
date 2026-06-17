import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, Alert, ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { TextInput } from 'react-native';
import { saveSymptom, getSymptoms, deleteSymptom } from '../utils/storage';

const COLORS = {
  primary: '#1a472a',
  accent: '#52b788',
  light: '#d8f3dc',
  background: '#f8f9fa',
  white: '#ffffff',
  danger: '#e63946',
  warning: '#f4a261',
  text: '#212529',
  gray: '#6c757d',
  border: '#dee2e6',
};

const SYMPTOM_TYPES = [
  { label: 'Blähungen', icon: '💨' },
  { label: 'Bauchschmerzen', icon: '😣' },
  { label: 'Übelkeit', icon: '🤢' },
  { label: 'Durchfall', icon: '🚽' },
  { label: 'Verstopfung', icon: '😖' },
  { label: 'Kopfschmerzen', icon: '🤕' },
  { label: 'Hautausschlag', icon: '🔴' },
  { label: 'Müdigkeit', icon: '😴' },
  { label: 'Sodbrennen', icon: '🔥' },
  { label: 'Kribbeln', icon: '⚡' },
  { label: 'Herzrasen', icon: '💓' },
  { label: 'Schnupfen', icon: '🤧' },
  { label: 'Juckreiz', icon: '🦟' },
  { label: 'Magenkrämpfe', icon: '😫' },
  { label: 'Sonstiges', icon: '❓' },
];

export default function SymptomsScreen() {
  const [symptoms, setSymptoms] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [severity, setSeverity] = useState(5);
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSymptoms();
    }, [])
  );

  const loadSymptoms = async () => {
    const data = await getSymptoms();
    setSymptoms(data);
  };

  const handleSave = async () => {
    if (!selectedType) {
      Alert.alert('Fehler', 'Bitte ein Symptom auswählen.');
      return;
    }

    const symptom = {
      id: Date.now().toString(),
      type: selectedType.label,
      icon: selectedType.icon,
      severity,
      notes: notes.trim(),
      timestamp: new Date().toISOString(),
    };

    await saveSymptom(symptom);
    setSelectedType(null);
    setSeverity(5);
    setNotes('');
    setShowForm(false);
    loadSymptoms();
  };

  const handleDelete = (id) => {
    Alert.alert('Löschen', 'Symptom wirklich löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => {
        await deleteSymptom(id);
        loadSymptoms();
      }},
    ]);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getSeverityColor = (s) => {
    if (s <= 3) return '#52b788';
    if (s <= 6) return '#f4a261';
    return '#e63946';
  };

  return (
    <View style={styles.container}>
      {showForm ? (
        <ScrollView style={styles.form} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.formTitle}>Symptom eintragen</Text>
          <Text style={styles.timestamp}>🕐 Jetzt: {new Date().toLocaleString('de-DE')}</Text>

          <Text style={styles.label}>Symptom auswählen *</Text>
          <View style={styles.symptomGrid}>
            {SYMPTOM_TYPES.map(s => (
              <TouchableOpacity
                key={s.label}
                style={[styles.symptomBtn, selectedType?.label === s.label && styles.symptomBtnSelected]}
                onPress={() => setSelectedType(s)}
              >
                <Text style={styles.symptomIcon}>{s.icon}</Text>
                <Text style={[styles.symptomLabel, selectedType?.label === s.label && styles.symptomLabelSelected]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Stärke: <Text style={{ color: getSeverityColor(severity), fontWeight: 'bold' }}>{severity}/10</Text></Text>
          <View style={styles.severityRow}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.severityBtn, severity === n && { backgroundColor: getSeverityColor(n) }]}
                onPress={() => setSeverity(n)}
              >
                <Text style={[styles.severityText, severity === n && { color: COLORS.white }]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Notizen (optional)</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Genauere Beschreibung, Situation..."
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>💾 Symptom speichern</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
            <Text style={styles.cancelBtnText}>Abbrechen</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <>
          <TouchableOpacity style={styles.fabButton} onPress={() => setShowForm(true)}>
            <Ionicons name="add" size={28} color={COLORS.white} />
            <Text style={styles.fabText}>Symptom eintragen</Text>
          </TouchableOpacity>

          {symptoms.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🤒</Text>
              <Text style={styles.emptyText}>Noch keine Symptome eingetragen.</Text>
              <Text style={styles.emptySubtext}>Trage Symptome unabhängig von Mahlzeiten ein.</Text>
            </View>
          ) : (
            <FlatList
              data={symptoms}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardLeft}>
                      <Text style={styles.cardIcon}>{item.icon}</Text>
                      <View>
                        <Text style={styles.cardTitle}>{item.type}</Text>
                        <Text style={styles.cardTime}>🕐 {formatDate(item.timestamp)}</Text>
                      </View>
                    </View>
                    <View style={styles.cardRight}>
                      <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) }]}>
                        <Text style={styles.severityBadgeText}>{item.severity}/10</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ marginTop: 4 }}>
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
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
  formTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary, marginBottom: 4 },
  timestamp: { fontSize: 13, color: COLORS.gray, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 12, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  symptomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  symptomBtn: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    alignItems: 'center',
    width: '30%',
  },
  symptomBtnSelected: {
    backgroundColor: COLORS.light,
    borderColor: COLORS.accent,
  },
  symptomIcon: { fontSize: 24, marginBottom: 4 },
  symptomLabel: { fontSize: 11, color: COLORS.text, textAlign: 'center' },
  symptomLabelSelected: { color: COLORS.primary, fontWeight: '600' },
  severityRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  severityBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  severityText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
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
    borderLeftColor: COLORS.warning,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  cardRight: { alignItems: 'flex-end' },
  cardIcon: { fontSize: 28 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  cardTime: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  cardNotes: { fontSize: 13, color: COLORS.gray, marginTop: 8, fontStyle: 'italic' },
  severityBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  severityBadgeText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
});
