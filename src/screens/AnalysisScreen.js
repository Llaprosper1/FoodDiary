import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getMeals, getSymptoms, getApiKey } from '../utils/storage';
import { analyzeWithAI, quickLocalAnalysis } from '../utils/aiAnalysis';

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

export default function AnalysisScreen() {
  const [meals, setMeals] = useState([]);
  const [symptoms, setSymptoms] = useState([]);
  const [aiResult, setAiResult] = useState(null);
  const [localResult, setLocalResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('local');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const m = await getMeals();
    const s = await getSymptoms();
    setMeals(m);
    setSymptoms(s);

    // Lokale Analyse direkt berechnen
    const local = quickLocalAnalysis(m, s);
    setLocalResult(local);
  };

  const runAIAnalysis = async () => {
    const apiKey = await getApiKey();
    if (!apiKey) {
      Alert.alert(
        'API-Key fehlt',
        'Bitte trage deinen OpenAI API-Key unter Einstellungen ein.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      const result = await analyzeWithAI(meals, symptoms, apiKey);
      setAiResult(result);
      setActiveTab('ai');
    } catch (error) {
      Alert.alert('Fehler', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getBarColor = (occurrences, max) => {
    const ratio = occurrences / max;
    if (ratio > 0.6) return COLORS.danger;
    if (ratio > 0.3) return COLORS.warning;
    return COLORS.accent;
  };

  const maxOccurrences = localResult?.length > 0 ? localResult[0].occurrences : 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Statistiken */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{meals.length}</Text>
          <Text style={styles.statLabel}>Mahlzeiten</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{symptoms.length}</Text>
          <Text style={styles.statLabel}>Symptome</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {new Set(meals.flatMap(m => m.ingredients)).size}
          </Text>
          <Text style={styles.statLabel}>Zutaten</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'local' && styles.tabActive]}
          onPress={() => setActiveTab('local')}
        >
          <Text style={[styles.tabText, activeTab === 'local' && styles.tabTextActive]}>
            📊 Lokale Analyse
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ai' && styles.tabActive]}
          onPress={() => setActiveTab('ai')}
        >
          <Text style={[styles.tabText, activeTab === 'ai' && styles.tabTextActive]}>
            🤖 KI-Analyse
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'local' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verdächtige Zutaten</Text>
          <Text style={styles.sectionSubtitle}>
            Zutaten, die häufig in den 72 Stunden vor Symptomen vorkamen:
          </Text>

          {!localResult || localResult.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                {meals.length < 3 || symptoms.length < 2
                  ? '⚠️ Bitte mindestens 3 Mahlzeiten und 2 Symptome eintragen.'
                  : 'Keine Muster gefunden. Trage mehr Daten ein.'}
              </Text>
            </View>
          ) : (
            localResult.map((item, idx) => (
              <View key={item.ingredient} style={styles.barRow}>
                <View style={styles.barLabel}>
                  <Text style={styles.barRank}>#{idx + 1}</Text>
                  <Text style={styles.barIngredient}>{item.ingredient}</Text>
                </View>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        width: `${(item.occurrences / maxOccurrences) * 100}%`,
                        backgroundColor: getBarColor(item.occurrences, maxOccurrences),
                      }
                    ]}
                  />
                  <Text style={styles.barCount}>{item.occurrences}×</Text>
                </View>
                <Text style={styles.barSymptoms}>{item.symptoms.join(', ')}</Text>
              </View>
            ))
          )}
        </View>
      )}

      {activeTab === 'ai' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KI-Analyse mit ChatGPT</Text>
          <Text style={styles.sectionSubtitle}>
            ChatGPT analysiert alle deine Einträge und sucht nach Mustern bei Lebensmittelunverträglichkeiten.
          </Text>

          <TouchableOpacity
            style={[styles.aiBtn, loading && styles.aiBtnDisabled]}
            onPress={runAIAnalysis}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.aiBtnText}>🤖 Jetzt mit ChatGPT analysieren</Text>
            )}
          </TouchableOpacity>

          {loading && (
            <Text style={styles.loadingText}>
              Analyse läuft... (kann 10–30 Sekunden dauern)
            </Text>
          )}

          {aiResult && (
            <View style={styles.aiResult}>
              <Text style={styles.aiResultTitle}>📋 Analyseergebnis</Text>
              <Text style={styles.aiResultText}>{aiResult}</Text>
              <Text style={styles.disclaimer}>
                ⚠️ Dies ist keine medizinische Diagnose. Bitte konsultiere einen Arzt oder Ernährungsberater.
              </Text>
            </View>
          )}

          {!aiResult && !loading && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Für die KI-Analyse brauchst du einen OpenAI API-Key.{'\n\n'}
                Den erhältst du kostenlos (mit Guthaben) unter:{'\n'}
                platform.openai.com/api-keys{'\n\n'}
                Trage ihn unter ⚙️ Einstellungen ein.
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    elevation: 2,
    borderTopWidth: 3,
    borderTopColor: COLORS.accent,
  },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.gray, fontWeight: '500', fontSize: 13 },
  tabTextActive: { color: COLORS.white, fontWeight: 'bold' },
  section: {
    margin: 16,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    elevation: 2,
  },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.primary, marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: COLORS.gray, marginBottom: 16 },
  emptyBox: {
    backgroundColor: COLORS.light,
    borderRadius: 10,
    padding: 14,
  },
  emptyText: { color: COLORS.primary, fontSize: 14, textAlign: 'center' },
  barRow: { marginBottom: 14 },
  barLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  barRank: { fontSize: 12, color: COLORS.gray, width: 24 },
  barIngredient: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  barContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { height: 16, borderRadius: 8, minWidth: 10 },
  barCount: { fontSize: 12, color: COLORS.gray },
  barSymptoms: { fontSize: 11, color: COLORS.gray, fontStyle: 'italic', marginTop: 2 },
  aiBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  aiBtnDisabled: { opacity: 0.6 },
  aiBtnText: { color: COLORS.white, fontSize: 15, fontWeight: 'bold' },
  loadingText: { textAlign: 'center', color: COLORS.gray, fontSize: 13, marginBottom: 12 },
  aiResult: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  aiResultTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary, marginBottom: 10 },
  aiResultText: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  disclaimer: {
    fontSize: 12,
    color: COLORS.warning,
    marginTop: 12,
    fontStyle: 'italic',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  infoBox: {
    backgroundColor: '#fff3e0',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  infoText: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
});
