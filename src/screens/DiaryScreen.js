import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getMeals, getSymptoms } from '../utils/storage';

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

export default function DiaryScreen() {
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'meals', 'symptoms'

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [])
  );

  const loadEntries = async () => {
    const meals = await getMeals();
    const symptoms = await getSymptoms();

    const combined = [
      ...meals.map(m => ({ ...m, entryType: 'meal' })),
      ...symptoms.map(s => ({ ...s, entryType: 'symptom' })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    setEntries(combined);
  };

  const filtered = entries.filter(e => {
    if (filter === 'meals') return e.entryType === 'meal';
    if (filter === 'symptoms') return e.entryType === 'symptom';
    return true;
  });

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('de-DE', {
      weekday: 'short', day: '2-digit', month: '2-digit',
      year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Gruppe nach Datum
  const groupedEntries = filtered.reduce((groups, entry) => {
    const date = new Date(entry.timestamp).toLocaleDateString('de-DE', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(entry);
    return groups;
  }, {});

  const sections = Object.entries(groupedEntries).map(([date, items]) => ({ date, items }));

  const getSeverityColor = (s) => {
    if (s <= 3) return '#52b788';
    if (s <= 6) return '#f4a261';
    return '#e63946';
  };

  return (
    <View style={styles.container}>
      {/* Filter-Tabs */}
      <View style={styles.filterRow}>
        {['all', 'meals', 'symptoms'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? '📋 Alle' : f === 'meals' ? '🍽️ Mahlzeiten' : '🤒 Symptome'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {sections.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📖</Text>
          <Text style={styles.emptyText}>Das Tagebuch ist noch leer.</Text>
          <Text style={styles.emptySubtext}>Trage Mahlzeiten und Symptome ein, um sie hier zu sehen.</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={item => item.date}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: section }) => (
            <View>
              <View style={styles.dateHeader}>
                <Text style={styles.dateHeaderText}>{section.date}</Text>
              </View>
              {section.items.map(entry => (
                <View
                  key={entry.id}
                  style={[
                    styles.card,
                    entry.entryType === 'meal' ? styles.mealCard : styles.symptomCard
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardIcon}>
                      {entry.entryType === 'meal' ? '🍽️' : entry.icon || '🤒'}
                    </Text>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{entry.name || entry.type}</Text>
                      <Text style={styles.cardTime}>
                        {new Date(entry.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                      </Text>
                    </View>
                    {entry.entryType === 'symptom' && (
                      <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(entry.severity) }]}>
                        <Text style={styles.severityText}>{entry.severity}/10</Text>
                      </View>
                    )}
                  </View>
                  {entry.entryType === 'meal' && entry.ingredients?.length > 0 && (
                    <Text style={styles.ingredients}>
                      🥗 {entry.ingredients.join(' · ')}
                    </Text>
                  )}
                  {entry.notes ? (
                    <Text style={styles.notes}>📝 {entry.notes}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterBtn: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  filterBtnActive: { backgroundColor: COLORS.primary },
  filterText: { fontSize: 12, color: COLORS.gray, fontWeight: '500' },
  filterTextActive: { color: COLORS.white, fontWeight: 'bold' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: COLORS.gray, textAlign: 'center', marginTop: 8 },
  dateHeader: {
    backgroundColor: COLORS.light,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    marginTop: 8,
  },
  dateHeaderText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 13 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
  },
  mealCard: { borderLeftWidth: 4, borderLeftColor: COLORS.accent },
  symptomCard: { borderLeftWidth: 4, borderLeftColor: COLORS.warning },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { fontSize: 24 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cardTime: { fontSize: 12, color: COLORS.gray },
  ingredients: { fontSize: 13, color: COLORS.gray, marginTop: 6 },
  notes: { fontSize: 13, color: COLORS.gray, marginTop: 4, fontStyle: 'italic' },
  severityBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  severityText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
});
