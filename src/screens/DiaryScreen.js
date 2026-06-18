import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../utils/themeContext';
import { getMeals, getSymptoms } from '../utils/storage';

export default function DiaryScreen() {
  const { theme } = useTheme();
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState('all');

  useFocusEffect(useCallback(() => { loadEntries(); }, []));

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
    if (s <= 3) return theme.success;
    if (s <= 6) return theme.warning;
    return theme.danger;
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Filter-Tabs */}
      <View style={[styles.filterRow, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {['all', 'meals', 'symptoms'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, { backgroundColor: filter === f ? theme.primary : theme.background }]}
            onPress={() => setFilter(f)}
          >
            <Text style={{ fontSize: 12, fontWeight: filter === f ? 'bold' : '500', color: filter === f ? '#fff' : theme.textSecondary }}>
              {f === 'all' ? '📋 Alle' : f === 'meals' ? '🍽️ Mahlzeiten' : '🤒 Symptome'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {sections.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📖</Text>
          <Text style={[styles.emptyText, { color: theme.text }]}>Das Tagebuch ist noch leer.</Text>
          <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>Trage Mahlzeiten und Symptome ein, um sie hier zu sehen.</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={item => item.date}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: section }) => (
            <View>
              <View style={[styles.dateHeader, { backgroundColor: theme.accentLight }]}>
                <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 13 }}>{section.date}</Text>
              </View>
              {section.items.map(entry => (
                <View
                  key={entry.id}
                  style={[
                    styles.card,
                    { backgroundColor: theme.surface, borderLeftColor: entry.entryType === 'meal' ? theme.accent : theme.warning }
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardIcon}>
                      {entry.entryType === 'meal' ? '🍽️' : entry.icon || '🤒'}
                    </Text>
                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardTitle, { color: theme.text }]}>{entry.name || entry.type}</Text>
                      <Text style={[styles.cardTime, { color: theme.textSecondary }]}>
                        {new Date(entry.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                      </Text>
                    </View>
                    {entry.entryType === 'symptom' && entry.severity > 0 && (
                      <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(entry.severity) }]}>
                        <Text style={styles.severityText}>{entry.severity}/10</Text>
                      </View>
                    )}
                  </View>
                  {entry.entryType === 'meal' && entry.ingredients?.length > 0 && (
                    <Text style={[styles.ingredients, { color: theme.textSecondary }]}>
                      🥗 {entry.ingredients.join(' · ')}
                    </Text>
                  )}
                  {entry.notes ? (
                    <Text style={[styles.notes, { color: theme.textSecondary }]}>📝 {entry.notes}</Text>
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
  filterRow: { flexDirection: 'row', padding: 8, gap: 6, borderBottomWidth: 1 },
  filterBtn: { flex: 1, padding: 8, borderRadius: 8, alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  emptySubtext: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  dateHeader: { borderRadius: 8, padding: 8, marginBottom: 8, marginTop: 8 },
  card: { borderRadius: 10, padding: 12, marginBottom: 8, elevation: 1, borderLeftWidth: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { fontSize: 24 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardTime: { fontSize: 12 },
  ingredients: { fontSize: 13, marginTop: 6 },
  notes: { fontSize: 13, marginTop: 4, fontStyle: 'italic' },
  severityBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  severityText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});
