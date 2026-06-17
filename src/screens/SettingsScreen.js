import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, Share
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { saveApiKey, getApiKey, exportAllData, getMeals, getSymptoms } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState({ meals: 0, symptoms: 0 });

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    const key = await getApiKey();
    if (key) setApiKey(key);
    const meals = await getMeals();
    const symptoms = await getSymptoms();
    setStats({ meals: meals.length, symptoms: symptoms.length });
  };

  const handleSaveKey = async () => {
    await saveApiKey(apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = async () => {
    const data = await exportAllData();
    const json = JSON.stringify(data, null, 2);
    await Share.share({
      message: json,
      title: 'FoodDiary Export',
    });
  };

  const handleDeleteAll = () => {
    Alert.alert(
      '⚠️ Alle Daten löschen',
      'Möchtest du wirklich ALLE Mahlzeiten und Symptome löschen? Dies kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Alles löschen',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            setStats({ meals: 0, symptoms: 0 });
            Alert.alert('Gelöscht', 'Alle Daten wurden gelöscht.');
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* OpenAI API Key */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔑 OpenAI API-Key</Text>
        <Text style={styles.cardSubtitle}>
          Für die KI-Analyse mit ChatGPT brauchst du einen API-Key von OpenAI.
          Erstelle einen kostenlos auf platform.openai.com/api-keys
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="sk-..."
            secureTextEntry={!showKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowKey(!showKey)}>
            <Ionicons name={showKey ? 'eye-off' : 'eye'} size={20} color={COLORS.gray} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.btn, saved && styles.btnSuccess]}
          onPress={handleSaveKey}
        >
          <Text style={styles.btnText}>
            {saved ? '✅ Gespeichert!' : '💾 API-Key speichern'}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            🔒 Dein API-Key wird nur lokal auf deinem Gerät gespeichert und niemals an Dritte weitergegeben.
          </Text>
        </View>
      </View>

      {/* Statistiken */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Meine Daten</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.meals}</Text>
            <Text style={styles.statLabel}>Mahlzeiten</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.symptoms}</Text>
            <Text style={styles.statLabel}>Symptome</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleExport}>
          <Text style={styles.btnText}>📤 Daten als JSON exportieren</Text>
        </TouchableOpacity>
      </View>

      {/* Bekannte Unverträglichkeiten */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ℹ️ Bekannte Unverträglichkeiten</Text>
        <Text style={styles.cardSubtitle}>Diese Informationen werden der KI-Analyse mitgegeben:</Text>
        <View style={styles.tagList}>
          {['Laktose', 'Fruktose', '? Histamin', '? Kohlenhydrate'].map(t => (
            <View key={t} style={[styles.tag, t.startsWith('?') ? styles.tagWarning : styles.tagConfirmed]}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.cardNote}>
          ✅ = bestätigt  |  ❓ = vermutet (werden im Prompt so kommuniziert)
        </Text>
      </View>

      {/* Gefahr-Zone */}
      <View style={[styles.card, styles.dangerCard]}>
        <Text style={[styles.cardTitle, { color: COLORS.danger }]}>⚠️ Gefahrenzone</Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAll}>
          <Text style={styles.deleteBtnText}>🗑️ Alle Daten löschen</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>FoodDiary v1.0.0</Text>
        <Text style={styles.appInfoText}>Lebensmittelunverträglichkeiten tracken & analysieren</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    margin: 16,
    marginBottom: 0,
    elevation: 2,
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: COLORS.danger,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.primary, marginBottom: 6 },
  cardSubtitle: { fontSize: 13, color: COLORS.gray, marginBottom: 12, lineHeight: 18 },
  cardNote: { fontSize: 11, color: COLORS.gray, marginTop: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    fontFamily: 'monospace',
  },
  eyeBtn: {
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnSuccess: { backgroundColor: COLORS.accent },
  btnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 14 },
  infoBox: {
    backgroundColor: COLORS.light,
    borderRadius: 8,
    padding: 10,
  },
  infoText: { fontSize: 12, color: COLORS.primary },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.light,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.gray },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  tag: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  tagConfirmed: { backgroundColor: COLORS.accent },
  tagWarning: { backgroundColor: COLORS.light, borderWidth: 1, borderColor: COLORS.accent },
  tagText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  deleteBtn: {
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
  },
  deleteBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 14 },
  appInfo: { alignItems: 'center', padding: 20 },
  appInfoText: { color: COLORS.gray, fontSize: 12 },
});
