# 🥗 FoodDiary – Lebensmittelunverträglichkeiten App

Eine Android App zum Tracken von Mahlzeiten, Symptomen und KI-gestützter Analyse deiner Lebensmittelunverträglichkeiten.

## Funktionen

- 🍽️ **Mahlzeiten eintragen** – mit Zutaten, Datum & Uhrzeit
- 🤒 **Symptome eintragen** – unabhängig von Mahlzeiten, mit Stärke 1–10
- 📖 **Tagebuch** – chronologische Übersicht aller Einträge
- 📊 **Lokale Analyse** – zeigt welche Zutaten häufig vor Symptomen vorkamen
- 🤖 **ChatGPT-Analyse** – KI erkennt Muster und gibt Empfehlungen

---

## 📱 APK bauen – Schritt für Schritt

### Schritt 1: GitHub Repository erstellen

1. Gehe zu [github.com](https://github.com) und melde dich an
2. Klicke auf **„New Repository"**
3. Name: `food-diary-app`
4. Klicke **„Create repository"**

### Schritt 2: Dateien hochladen

Lade alle Dateien aus diesem Projekt in das Repository hoch (entweder per Git oder GitHub Web-Upload).

### Schritt 3: Expo Account erstellen

1. Gehe zu [expo.dev](https://expo.dev) und erstelle einen kostenlosen Account
2. Merke dir deinen Benutzernamen

### Schritt 4: Expo Token holen

1. Gehe zu [expo.dev/accounts/[dein-name]/settings/access-tokens](https://expo.dev/accounts/)
2. Klicke **„Create Token"**
3. Kopiere den Token

### Schritt 5: GitHub Secret setzen

1. In deinem GitHub Repository → **Settings** → **Secrets and variables** → **Actions**
2. Klicke **„New repository secret"**
3. Name: `EXPO_TOKEN`
4. Value: den kopierten Expo Token einfügen
5. **„Add secret"** klicken

### Schritt 6: app.json anpassen

Öffne `app.json` und trage dein Expo Projekt ein:
- `"projectId"`: Findest du auf expo.dev nach dem ersten Build

### Schritt 7: APK automatisch bauen

1. Gehe zu deinem Repository → **Actions**
2. Klicke auf **„Build Android APK"**
3. Klicke **„Run workflow"** → **„Run workflow"**
4. Warte ca. 10–15 Minuten
5. Den Download-Link für die APK findest du auf [expo.dev](https://expo.dev) unter deinen Builds

---

## 🔑 OpenAI API-Key einrichten (für KI-Analyse)

1. Gehe zu [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Erstelle einen Account (kostenlos, mit Startguthaben)
3. Klicke **„Create new secret key"**
4. Kopiere den Key (beginnt mit `sk-...`)
5. In der App: **⚙️ Einstellungen** → API-Key eintragen → Speichern

---

## 🏗️ Lokale Entwicklung (optional)

```bash
npm install
npx expo start
```

Dann QR-Code scannen mit der **Expo Go** App auf deinem Android-Handy.

---

## 📊 Wie die Analyse funktioniert

**Lokale Analyse:**
- Prüft welche Zutaten in den 4 Stunden vor einem Symptom gegessen wurden
- Zeigt Häufigkeiten als Balkendiagramm
- Funktioniert vollständig offline, ohne API-Key

**KI-Analyse (ChatGPT):**
- Sendet alle Mahlzeiten + Symptome an ChatGPT GPT-4o
- Die KI kennt deine bekannten Unverträglichkeiten (Laktose, Fruktose)
- Sucht nach Mustern, benennt verdächtige Zutaten
- Gibt konkrete Empfehlungen welche Zutaten zuerst weggelassen werden sollten

---

## ⚠️ Hinweis

Diese App ersetzt keine medizinische Diagnose. Bitte konsultiere bei Verdacht auf Lebensmittelunverträglichkeiten immer einen Arzt oder Ernährungsberater (z.B. Gastroenterologe oder Ökotrophologe).
