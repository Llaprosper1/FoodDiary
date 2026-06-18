import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, Share
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/themeContext';
import { saveApiKey, getApiKey, exportAllData, getMeals, getSymptoms } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROVIDERS = [
  {
    id: 'groq',
    name: 'Groq (Llama 3)',
    tag: '✅ Kostenlos',
    tagColor: '#52b788',
    description: 'Kostenlos, sehr schnell. API-Key auf console.groq.com',
    url: 'console.groq.com',
    placeholder: 'gsk_...',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    tag: '✅ Kostenlos',
    tagColor: '#52b788',
    description: 'Kostenloses Kontingent. API-Key auf aistudio.google.com',
    url: 'aistudio.google.com',
    placeholder: 'AIza...',
  },
  {
    id: 'openai',
    name: 'ChatGPT (OpenAI)',
    tag: '💳 Kostenpflichtig',
    tagColor: '#f4a261',
    description: 'Kostenpflichtig. API-Key auf platform.openai.com',
    url: 'platform.openai.com',
    placeholder: 'sk-...',
  },
];

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const [selectedProvider, setSelectedProvider] = useState('groq');
  const [apiKeys, setApiKeys] = useState({ groq: '', gemini: '', openai: '' });
  const [showKeys, setShowKeys] = useState({ groq: false, gemini: false, openai: false });
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState({ meals: 0, symptoms: 0 });

  useFocusEffect(useCallback(() => { loadSettings(); }, []));

  const loadSettings = async () => {
    const stored = await AsyncStorage.getItem('food_diary_ai_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      setSelectedProvider(parsed.provider || 'groq');
      setApiKeys(parsed.keys || { groq: '', gemini: '', openai: '' });
    }
    const meals = await getMeals();
    const symptoms = await getSymptoms();
    setStats({ meals: meals.length, symptoms: symptoms.length });
  };

  const handleSave = async () => {
    await AsyncStorage.setItem('food_diary_ai_settings', JSON.stringify({
      provider: selectedProvider,
      keys: apiKeys,
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = async () => {
    const data = await exportAllData();
    const json = JSON.stringify(data, null, 2);
    await Share.share({ message: json, title: 'FoodDiary Export' });
  };

  const handleDeleteAll = () => {
    Alert.alert('⚠️ Alle Daten löschen', 'Wirklich ALLE Daten löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Alles löschen', style: 'destructive', onPress: async () => {
        await AsyncStorage.clear();
        setStats({ meals: 0, symptoms: 0 });
        Alert.alert('Gelöscht', 'Alle Daten wurden gelöscht.');
      }},
    ]);
  };

  const S = makeStyles(theme);

  return (
    <ScrollView style={[S.container, { backgroundColor: theme.background }]} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Tag/Nacht Modus */}
      <View style={[S.card, { backgroundColor: theme.surface }]}>
        <Text style={[S.cardTitle, { color: theme.primary }]}>🌙 Anzeigemodus</Text>
        <TouchableOpacity style={[S.themeToggle, { backgroundColor: theme.surface2, borderColor: theme.border }]} onPress={toggleTheme}>
          <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={22} color={theme.primary} />
          <Text style={[S.themeToggleText, { color: theme.text }]}>
            {isDark ? '☀️ Tagmodus aktivieren' : '🌙 Nachtmodus aktivieren'}
          </Text>
          <View style={[S.toggleIndicator, { backgroundColor: isDark ? theme.accent : theme.border }]}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{isDark ? 'AN' : 'AUS'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* KI-Anbieter Auswahl */}
      <View style={[S.card, { backgroundColor: theme.surface }]}>
        <Text style={[S.cardTitle, { color: theme.primary }]}>🤖 KI-Anbieter wählen</Text>
        <Text style={[S.cardSubtitle, { color: theme.textSecondary }]}>Wähle welche KI die Analyse durchführen soll:</Text>

        {PROVIDERS.map(p => (
          <TouchableOpacity
            key={p.id}
            style={[S.providerCard, {
              backgroundColor: selectedProvider === p.id ? theme.accentLight : theme.surface2,
              borderColor: selectedProvider === p.id ? theme.accent : theme.border,
            }]}
            onPress={() => setSelectedProvider(p.id)}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[S.providerName, { color: theme.text }]}>{p.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[S.tagBadge, { backgroundColor: p.tagColor + '22', borderColor: p.tagColor }]}>
                  <Text style={[S.tagText, { color: p.tagColor }]}>{p.tag}</Text>
                </View>
                {selectedProvider === p.id && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.accent} />
                )}
              </View>
            </View>
            <Text style={[S.providerDesc, { color: theme.textSecondary }]}>{p.description}</Text>

            {/* API-Key Eingabe */}
            <Text style={[S.keyLabel, { color: theme.textSecondary }]}>API-Key ({p.url}):</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                style={[S.input, { flex: 1, backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={apiKeys[p.id]}
                onChangeText={val => setApiKeys(prev => ({ ...prev, [p.id]: val }))}
                placeholder={p.placeholder}
                placeholderTextColor={theme.textSecondary}
                secureTextEntry={!showKeys[p.id]}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[S.eyeBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowKeys(prev => ({ ...prev, [p.id]: !prev[p.id] }))}>
                <Ionicons name={showKeys[p.id] ? 'eye-off' : 'eye'} size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={[S.saveBtn, { backgroundColor: saved ? theme.success : theme.primary }]} onPress={handleSave}>
          <Text style={S.saveBtnText}>{saved ? '✅ Gespeichert!' : '💾 Einstellungen speichern'}</Text>
        </TouchableOpacity>

        <View style={[S.infoBox, { backgroundColor: theme.accentLight }]}>
          <Text style={[S.infoText, { color: theme.primary }]}>
            💡 Empfehlung: Nutze <Text style={{ fontWeight: 'bold' }}>Groq</Text> – völlig kostenlos, kein Kreditkarte nötig.{'\n'}
            Registriere dich auf console.groq.com und erstelle einen API-Key.
          </Text>
        </View>
      </View>

      {/* Statistiken */}
      <View style={[S.card, { backgroundColor: theme.surface }]}>
        <Text style={[S.cardTitle, { color: theme.primary }]}>📊 Meine Daten</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
          <View style={[S.statItem, { backgroundColor: theme.accentLight }]}>
            <Text style={[S.statNumber, { color: theme.primary }]}>{stats.meals}</Text>
            <Text style={[S.statLabel, { color: theme.textSecondary }]}>Mahlzeiten</Text>
          </View>
          <View style={[S.statItem, { backgroundColor: theme.accentLight }]}>
            <Text style={[S.statNumber, { color: theme.primary }]}>{stats.symptoms}</Text>
            <Text style={[S.statLabel, { color: theme.textSecondary }]}>Symptome</Text>
          </View>
        </View>
        <TouchableOpacity style={[S.saveBtn, { backgroundColor: theme.primary }]} onPress={handleExport}>
          <Text style={S.saveBtnText}>📤 Daten exportieren (JSON)</Text>
        </TouchableOpacity>
      </View>

      {/* Gefahrenzone */}
      <View style={[S.card, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.danger }]}>
        <Text style={[S.cardTitle, { color: theme.danger }]}>⚠️ Gefahrenzone</Text>
        <TouchableOpacity style={[S.saveBtn, { backgroundColor: theme.danger }]} onPress={handleDeleteAll}>
          <Text style={S.saveBtnText}>🗑️ Alle Daten löschen</Text>
        </TouchableOpacity>
      </View>

      <View style={{ alignItems: 'center', padding: 20 }}>
        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>FoodDiary v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    container: { flex: 1 },
    card: { borderRadius: 14, padding: 16, margin: 16, marginBottom: 0, elevation: 2 },
    cardTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 6 },
    cardSubtitle: { fontSize: 13, marginBottom: 12 },
    themeToggle: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      borderRadius: 12, padding: 14, borderWidth: 1,
    },
    themeToggleText: { flex: 1, fontSize: 15, fontWeight: '500' },
    toggleIndicator: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    providerCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1.5 },
    providerName: { fontSize: 15, fontWeight: 'bold' },
    providerDesc: { fontSize: 12, marginTop: 4, marginBottom: 10 },
    tagBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
    tagText: { fontSize: 11, fontWeight: '600' },
    keyLabel: { fontSize: 12, marginBottom: 6 },
    input: { borderRadius: 10, borderWidth: 1, padding: 10, fontSize: 13, fontFamily: 'monospace' },
    eyeBtn: { padding: 10, borderRadius: 10, borderWidth: 1 },
    saveBtn: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 12 },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    infoBox: { borderRadius: 10, padding: 12, marginTop: 10 },
    infoText: { fontSize: 12, lineHeight: 18 },
    statItem: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
    statNumber: { fontSize: 24, fontWeight: 'bold' },
    statLabel: { fontSize: 12 },
  });
}
