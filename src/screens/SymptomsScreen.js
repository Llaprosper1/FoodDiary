import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, Alert, ScrollView, TextInput
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../utils/themeContext';
import { saveSymptom, getSymptoms, deleteSymptom } from '../utils/storage';

const SYMPTOM_TYPES = [
  { label: 'Beschwerdefrei', icon: '✅', noProblem: true },
  { label: 'Kein Problem', icon: '😊', noProblem: true },
  { label: 'Blähungen', icon: '💨' },
  { label: 'Rülpsen', icon: '🫧' },
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

function getDayKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDayLabel(key) {
  const today = getDayKey(new Date().toISOString());
  const yesterday = getDayKey(new Date(Date.now()-86400000).toISOString());
  if (key === today) return '📅 Heute';
  if (key === yesterday) return '📅 Gestern';
  return new Date(key).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function groupByDay(symptoms) {
  const map = {};
  symptoms.forEach(s => {
    const key = getDayKey(s.timestamp);
    if (!map[key]) map[key] = [];
    map[key].push(s);
  });
  Object.keys(map).forEach(key => {
    map[key].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  });
  return Object.keys(map).sort((a, b) => b.localeCompare(a))
    .map(key => ({ key, label: getDayLabel(key), symptoms: map[key] }));
}

// Automatisch beschwerdefreie Zeiträume erkennen (>4h zwischen Symptomen)
function detectFreeIntervals(symptoms, threshold = 4) {
  const sorted = [...symptoms].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const intervals = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = new Date(sorted[i].timestamp);
    const b = new Date(sorted[i+1].timestamp);
    const hours = (b - a) / 3600000;
    if (hours >= threshold && !sorted[i].noProblem && !sorted[i+1].noProblem) {
      intervals.push({ from: sorted[i].timestamp, to: sorted[i+1].timestamp, hours: Math.round(hours) });
    }
  }
  return intervals;
}

function DateTimeRow({ label, date, onDatePress, onTimePress, theme }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 4 }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity style={[styles.dateBtn, { backgroundColor: theme.accentLight, borderColor: theme.accent }]} onPress={onDatePress}>
          <Ionicons name="calendar-outline" size={16} color={theme.primary} />
          <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 13 }}>
            {date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.dateBtn, { backgroundColor: theme.accentLight, borderColor: theme.accent }]} onPress={onTimePress}>
          <Ionicons name="time-outline" size={16} color={theme.primary} />
          <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 13 }}>
            {date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SymptomsScreen() {
  const { theme } = useTheme();
  const [symptoms, setSymptoms] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [severity, setSeverity] = useState(5);
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [picker, setPicker] = useState(null); // { target: 'start'|'end', mode: 'date'|'time' }
  const [showAutoIntervals, setShowAutoIntervals] = useState(false);

  useFocusEffect(useCallback(() => { loadSymptoms(); }, []));

  const loadSymptoms = async () => { const d = await getSymptoms(); setSymptoms(d); };

  const handleSave = async () => {
    if (!selectedType) { Alert.alert('Fehler', 'Bitte ein Symptom auswählen.'); return; }
    const symptom = {
      id: Date.now().toString(),
      type: selectedType.label,
      icon: selectedType.icon,
      noProblem: !!selectedType.noProblem,
      severity: selectedType.noProblem ? 0 : severity,
      notes: notes.trim(),
      timestamp: date.toISOString(),
      ...(selectedType.noProblem && { endTimestamp: endDate.toISOString() }),
    };
    await saveSymptom(symptom);
    setSelectedType(null); setSeverity(5); setNotes('');
    setDate(new Date()); setEndDate(new Date()); setShowForm(false);
    loadSymptoms();
  };

  const handleDelete = (id) => {
    Alert.alert('Löschen', 'Symptom löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => { await deleteSymptom(id); loadSymptoms(); }},
    ]);
  };

  const onPickerChange = (e, selected) => {
    if (!selected || !picker) { setPicker(null); return; }
    const isStart = picker.target === 'start';
    const current = isStart ? date : endDate;
    const setFn = isStart ? setDate : setEndDate;
    const updated = new Date(current);
    if (picker.mode === 'date') updated.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    else updated.setHours(selected.getHours(), selected.getMinutes());
    setFn(updated);
    setPicker(null);
  };

  const getSeverityColor = (s) => { if (s === 0) return theme.success; if (s <= 3) return theme.success; if (s <= 6) return theme.warning; return theme.danger; };
  const isNoProblem = selectedType?.noProblem;
  const grouped = groupByDay(symptoms);
  const autoIntervals = detectFreeIntervals(symptoms);
  const todayKey = getDayKey(new Date().toISOString());

  if (showForm) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.background, padding: 16 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {picker && (
          <DateTimePicker value={picker.target === 'start' ? date : endDate}
            mode={picker.mode} display="default" is24Hour={true}
            onChange={onPickerChange} />
        )}
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.primary, marginBottom: 12 }}>Symptom eintragen</Text>

        <DateTimeRow label={isNoProblem ? 'Von:' : 'Zeitpunkt:'} date={date} theme={theme}
          onDatePress={() => setPicker({ target: 'start', mode: 'date' })}
          onTimePress={() => setPicker({ target: 'start', mode: 'time' })} />

        {isNoProblem && (
          <DateTimeRow label="Bis:" date={endDate} theme={theme}
            onDatePress={() => setPicker({ target: 'end', mode: 'date' })}
            onTimePress={() => setPicker({ target: 'end', mode: 'time' })} />
        )}

        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text, marginTop: 12, marginBottom: 8 }}>Symptom auswählen *</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SYMPTOM_TYPES.map(s => (
            <TouchableOpacity key={s.label}
              style={[styles.symptomBtn, {
                backgroundColor: selectedType?.label === s.label
                  ? (s.noProblem ? theme.success : theme.accentLight)
                  : theme.surface,
                borderColor: selectedType?.label === s.label ? theme.accent : theme.border,
              }]}
              onPress={() => { setSelectedType(s); if (s.noProblem) { const e = new Date(date); e.setHours(e.getHours() + 8); setEndDate(e); }}}>
              <Text style={{ fontSize: 22, marginBottom: 2 }}>{s.icon}</Text>
              <Text style={{ fontSize: 11, color: theme.text, textAlign: 'center' }}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!isNoProblem && selectedType && (
          <>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text, marginTop: 14, marginBottom: 8 }}>
              Stärke: <Text style={{ color: getSeverityColor(severity), fontWeight: 'bold' }}>{severity}/10</Text>
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <TouchableOpacity key={n}
                  style={[styles.severityBtn, { backgroundColor: severity === n ? getSeverityColor(n) : theme.surface, borderColor: theme.border }]}
                  onPress={() => setSeverity(n)}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: severity === n ? '#fff' : theme.text }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text, marginTop: 12, marginBottom: 4 }}>Notizen (optional)</Text>
        <TextInput
          style={{ backgroundColor: theme.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.border, padding: 12, fontSize: 15, color: theme.text, height: 80 }}
          placeholder="Beschreibung..." placeholderTextColor={theme.textSecondary} value={notes} onChangeText={setNotes} multiline />

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSave}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>💾 Speichern</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ alignItems: 'center', marginTop: 12, padding: 10 }} onPress={() => setShowForm(false)}>
          <Text style={{ color: theme.textSecondary }}>Abbrechen</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => { setDate(new Date()); const e = new Date(); e.setHours(e.getHours()+4); setEndDate(e); setShowForm(true); }}>
        <Ionicons name="add" size={28} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Symptom eintragen</Text>
      </TouchableOpacity>

      {/* Automatisch erkannte beschwerdefreie Zeiträume */}
      {autoIntervals.length > 0 && (
        <TouchableOpacity
          style={[styles.autoBox, { backgroundColor: theme.surface, borderColor: theme.success }]}
          onPress={() => setShowAutoIntervals(!showAutoIntervals)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.success, fontWeight: '600', fontSize: 13 }}>
              ✅ {autoIntervals.length} beschwerdefreie Zeiträume erkannt
            </Text>
            <Ionicons name={showAutoIntervals ? 'chevron-up' : 'chevron-down'} size={16} color={theme.success} />
          </View>
          {showAutoIntervals && autoIntervals.map((iv, i) => (
            <Text key={i} style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
              • {new Date(iv.from).toLocaleString('de-DE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })} →{' '}
              {new Date(iv.to).toLocaleString('de-DE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
              {' '}({iv.hours}h)
            </Text>
          ))}
        </TouchableOpacity>
      )}

      {grouped.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Text style={{ fontSize: 60, marginBottom: 16 }}>🤒</Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text, textAlign: 'center' }}>Noch keine Symptome.</Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={item => item.key}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: dayData }) => {
            const [expanded, setExpanded] = useState(dayData.key === todayKey);
            return (
              <View style={{ marginBottom: 10 }}>
                <TouchableOpacity
                  style={[styles.dayHeader, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => setExpanded(!expanded)}>
                  <Text style={{ fontWeight: 'bold', fontSize: 14, color: theme.primary }}>{dayData.label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{dayData.symptoms.length} Einträge</Text>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.primary} />
                  </View>
                </TouchableOpacity>
                {expanded && dayData.symptoms.map(symptom => (
                  <View key={symptom.id} style={[styles.symptomCard, {
                    backgroundColor: theme.surface,
                    borderLeftColor: symptom.noProblem ? theme.success : theme.warning,
                  }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <Text style={{ fontSize: 26, marginRight: 10 }}>{symptom.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>{symptom.type}</Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          🕐 {new Date(symptom.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                          {symptom.endTimestamp && ` → ${new Date(symptom.endTimestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`}
                        </Text>
                        {symptom.notes ? <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4, fontStyle: 'italic' }}>📝 {symptom.notes}</Text> : null}
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        {symptom.severity > 0 && (
                          <View style={[styles.badge, { backgroundColor: getSeverityColor(symptom.severity, theme) }]}>
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{symptom.severity}/10</Text>
                          </View>
                        )}
                        <TouchableOpacity onPress={() => handleDelete(symptom.id)}>
                          <Ionicons name="trash-outline" size={18} color={theme.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            );
          }}
        />
      )}
    </View>
  );

  function getSeverityColor(s, t) {
    if (s === 0) return t.success;
    if (s <= 3) return t.success;
    if (s <= 6) return t.warning;
    return t.danger;
  }
}

const styles = StyleSheet.create({
  fab: { margin: 16, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 3 },
  dateBtn: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  symptomBtn: { borderRadius: 10, borderWidth: 1, padding: 10, alignItems: 'center', width: '30%' },
  severityBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  saveBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
  symptomCard: { borderRadius: 10, padding: 12, marginBottom: 8, borderLeftWidth: 4, elevation: 1 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  autoBox: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 12, borderWidth: 1 },
});
