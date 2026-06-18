import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../utils/themeContext';
import { getMeals, getSymptoms } from '../utils/storage';
import { analyzeWithAI, quickLocalAnalysis } from '../utils/aiAnalysis';

const PROVIDER_NAMES = { groq: 'Groq (Llama 3)', gemini: 'Google Gemini', openai: 'ChatGPT (OpenAI)' };
const PROVIDER_ICONS = { groq: '⚡', gemini: '🔷', openai: '🤖' };

export default function AnalysisScreen() {
  const { theme } = useTheme();
  const [meals, setMeals] = useState([]);
  const [symptoms, setSymptoms] = useState([]);
  const [aiResult, setAiResult] = useState(null);
  const [localResult, setLocalResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('local');
  const [provider, setProvider] = useState('groq');
  const [hasKey, setHasKey] = useState(false);
  const [hasGeminiResearchKey, setHasGeminiResearchKey] = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    const m = await getMeals();
    const s = await getSymptoms();
    setMeals(m);
    setSymptoms(s);
    setLocalResult(quickLocalAnalysis(m, s));

    const stored = await AsyncStorage.getItem('food_diary_ai_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      const p = parsed.provider || 'groq';
      setProvider(p);
      setHasKey(!!(parsed.keys?.[p]));
      setHasGeminiResearchKey(!!(parsed.keys?.gemini));
    }
  };

  const runAIAnalysis = async () => {
    const stored = await AsyncStorage.getItem('food_diary_ai_settings');
    if (!stored) { Alert.alert('Fehler', 'Bitte zuerst unter Einstellungen einen KI-Anbieter und API-Key auswählen.'); return; }
    const parsed = JSON.parse(stored);
    const p = parsed.provider || 'groq';
    const key = parsed.keys?.[p];
    if (!key) { Alert.alert('Fehler', `Kein API-Key für ${PROVIDER_NAMES[p]} hinterlegt.\nBitte unter Einstellungen eintragen.`); return; }

    // Gemini-Key für die optionale Web-Recherche von Markenprodukten (z.B. "Cola Zero")
    // wird verwendet falls vorhanden, unabhängig vom gewählten Hauptanbieter.
    const geminiKeyForResearch = parsed.keys?.gemini || null;

    setLoading(true);
    try {
      const result = await analyzeWithAI(meals, symptoms, key, p, geminiKeyForResearch);
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
    if (ratio > 0.6) return theme.danger;
    if (ratio > 0.3) return theme.warning;
    return theme.accent;
  };

  const maxOcc = localResult?.length > 0 ? localResult[0].occurrences : 1;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Statistiken */}
      <View style={{ flexDirection: 'row', padding: 16, gap: 10 }}>
        {[
          { number: meals.length, label: 'Mahlzeiten' },
          { number: symptoms.length, label: 'Symptome' },
          { number: new Set(meals.flatMap(m => m.ingredients || [])).size, label: 'Zutaten' },
        ].map(s => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: theme.surface, borderTopColor: theme.accent }]}>
            <Text style={[styles.statNumber, { color: theme.primary }]}>{s.number}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: theme.surface, marginHorizontal: 16 }]}>
        {['local', 'ai'].map(tab => (
          <TouchableOpacity key={tab}
            style={[styles.tab, activeTab === tab && { backgroundColor: theme.primary }]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, { color: activeTab === tab ? '#fff' : theme.textSecondary }]}>
              {tab === 'local' ? '📊 Lokale Analyse' : '🤖 KI-Analyse'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lokale Analyse */}
      {activeTab === 'local' && (
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Verdächtige Zutaten</Text>
          <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
            Häufig in den 72h vor Symptomen:
          </Text>
          {!localResult || localResult.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: theme.accentLight }]}>
              <Text style={[styles.emptyText, { color: theme.primary }]}>
                {meals.length < 3 || symptoms.length < 2
                  ? '⚠️ Mindestens 3 Mahlzeiten und 2 Symptome eintragen.'
                  : 'Keine Muster gefunden. Mehr Daten eintragen.'}
              </Text>
            </View>
          ) : localResult.map((item, idx) => (
            <View key={item.ingredient} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary, width: 24 }}>#{idx+1}</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{item.ingredient}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1, height: 16, backgroundColor: theme.surface2, borderRadius: 8, overflow: 'hidden' }}>
                  <View style={{
                    height: 16, borderRadius: 8,
                    width: `${(item.occurrences / maxOcc) * 100}%`,
                    backgroundColor: getBarColor(item.occurrences, maxOcc)
                  }} />
                </View>
                <Text style={{ fontSize: 12, color: theme.textSecondary, width: 24 }}>{item.occurrences}×</Text>
              </View>
              <Text style={{ fontSize: 11, color: theme.textSecondary, fontStyle: 'italic', marginTop: 2 }}>
                {item.symptoms.join(', ')}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* KI-Analyse */}
      {activeTab === 'ai' && (
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>KI-Analyse</Text>

          {/* Aktiver Provider */}
          <View style={[styles.providerBadge, { backgroundColor: theme.accentLight, borderColor: theme.accent }]}>
            <Text style={{ fontSize: 20 }}>{PROVIDER_ICONS[provider]}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.providerName, { color: theme.primary }]}>{PROVIDER_NAMES[provider]}</Text>
              <Text style={[styles.providerStatus, { color: hasKey ? theme.success : theme.danger }]}>
                {hasKey ? '✅ API-Key hinterlegt' : '❌ Kein API-Key – bitte in Einstellungen eintragen'}
              </Text>
            </View>
          </View>

          {hasGeminiResearchKey && (
            <View style={[styles.researchBadge, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
              <Text style={{ fontSize: 14 }}>🌐</Text>
              <Text style={{ fontSize: 11, color: theme.textSecondary, flex: 1 }}>
                Web-Recherche aktiv: Markenprodukte (z.B. "Cola Zero") werden vor der Analyse automatisch nachgeschlagen, falls Gemini verfügbar ist.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.aiBtn, { backgroundColor: loading ? theme.border : theme.primary }]}
            onPress={runAIAnalysis}
            disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.aiBtnText}>{PROVIDER_ICONS[provider]} Jetzt analysieren</Text>
            }
          </TouchableOpacity>

          {loading && (
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Analyse läuft... (10–30 Sekunden)
            </Text>
          )}

          {aiResult ? (
            <View style={[styles.aiResult, { backgroundColor: theme.accentLight }]}>
              <Text style={[styles.aiResultTitle, { color: theme.primary }]}>📋 Analyseergebnis</Text>
              <Text style={[styles.aiResultText, { color: theme.text }]}>{aiResult}</Text>
              <Text style={[styles.disclaimer, { color: theme.warning, borderTopColor: theme.border }]}>
                ⚠️ Keine medizinische Diagnose. Bitte einen Arzt konsultieren.
              </Text>
            </View>
          ) : !loading && (
            <View style={[styles.infoBox, { backgroundColor: theme.surface2, borderLeftColor: theme.warning }]}>
              <Text style={[styles.infoText, { color: theme.text }]}>
                💡 Empfehlung: <Text style={{ fontWeight: 'bold' }}>Groq</Text> ist kostenlos!{'\n\n'}
                1. Gehe zu console.groq.com{'\n'}
                2. Erstelle einen kostenlosen Account{'\n'}
                3. Klicke auf „API Keys" → „Create API Key"{'\n'}
                4. Key in ⚙️ Einstellungen eintragen{'\n'}
                5. Groq als Anbieter auswählen
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  statCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', elevation: 2, borderTopWidth: 3 },
  statNumber: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 2 },
  tabRow: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 8 },
  tab: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  tabText: { fontWeight: '500', fontSize: 13 },
  section: { margin: 16, borderRadius: 14, padding: 16, elevation: 2 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  sectionSub: { fontSize: 13, marginBottom: 16 },
  emptyBox: { borderRadius: 10, padding: 14 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  providerBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 12 },
  providerName: { fontWeight: 'bold', fontSize: 14 },
  providerStatus: { fontSize: 12, marginTop: 2 },
  researchBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, padding: 8, borderWidth: 1, marginBottom: 12 },
  aiBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  aiBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  loadingText: { textAlign: 'center', fontSize: 13, marginBottom: 12 },
  aiResult: { borderRadius: 12, padding: 14, marginTop: 8 },
  aiResultTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 10 },
  aiResultText: { fontSize: 14, lineHeight: 22 },
  disclaimer: { fontSize: 12, fontStyle: 'italic', marginTop: 12, borderTopWidth: 1, paddingTop: 10 },
  infoBox: { borderRadius: 10, padding: 14, borderLeftWidth: 4 },
  infoText: { fontSize: 13, lineHeight: 22 },
});
