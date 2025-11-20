# SuperGUI - Flask Dashboard

Eine moderne Flask-Web-App mit HTML/CSS für Stundenplan-Verwaltung, Wetter-Anzeige und Produktivitäts-Tools.

## Features

### 🕐 Echtzeit-Uhr
- Moderne Anzeige mit **leuchtendem Effekt**
- Automatische Aktualisierung jede Sekunde
- Deutsches Datumsformat
- Gradient-Animation auf dem Logo

### 📅 Stundenplan-Verwaltung
- **Automatische Aktualisierung** von KSR-Stundenplan-API
- ICS-Datei Upload als Fallback
- Anzeige der nächsten Lektion mit **Raum** und Fach
- Übersicht kommender Prüfungen (14 Tage)
- Automatische Erkennung von Prüfungen
- **Besondere Ereignisse**: Ausgefallene Lektionen, Raumwechsel, etc.
- Farbcodierte Badges für verschiedene Event-Typen
- **📆 Wochenübersicht**: "Mehr anzeigen" Button zeigt komplette Wochenansicht
  - Alle Lektionen der aktuellen Woche
  - Gruppiert nach Tagen
  - Zeigt Zeiten, Räume, Prüfungen und Sonderhinweise
  - Modernes Modal-Design mit Glassmorphismus

### 🤖 KI-Assistent (NEU!)
- **Google Gemini AI Integration**
- Floating Chat-Button für schnellen Zugriff
- Beantwortet Fragen zu:
  - Deinem Stundenplan
  - Kommenden Prüfungen
  - Aktuellen und nächsten Lektionen
- Kontext-bewusst: Kennt deinen aktuellen Stundenplan
- Moderne Chat-Oberfläche mit Typing-Indikatoren
- Unterstützt Tastaturkürzel (Enter zum Senden)

### 🌦️ Wetter für Romanshorn
- Aktuelle Temperatur und Wetterbeschreibung
- Gefühlte Temperatur
- Luftfeuchtigkeit
- Windgeschwindigkeit
- Integration mit OpenWeather API
- **Animiertes Wetter-Icon** (schwebendes Element)

### 🔍 Multi-Search
Suchfeld mit direkten Links zu:
- Google (mit Gradient-Button)
- ChatGPT (grüner Gradient)
- GitHub (dunkler Gradient)
- Brave Search (oranger Gradient)
- **Ripple-Effekt** beim Klicken
- Enter-Taste unterstützt

### 📔 OneNote Integration
Schnellzugriff-Buttons für:
- Schule-Notizbuch
- Persönliches Notizbuch
- Projekte-Notizbuch
- **Slide-Animation** beim Hover
- Direkter Start der Desktop-App

## Installation

### Voraussetzungen
- Python 3.8 oder höher
- pip (Python Package Manager)

### Schritt 1: Repository klonen

```bash
git clone https://github.com/NotSusmuel/supergui.git
cd supergui
```

### Schritt 2: Virtuelle Umgebung erstellen (empfohlen)

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### Schritt 3: Abhängigkeiten installieren

```bash
pip install -r requirements.txt
```

### Schritt 4: Umgebungsvariablen konfigurieren

Kopieren Sie die Beispiel-Umgebungsvariablen-Datei:

```bash
cp .env.example .env
```

Die `.env.example` Datei enthält bereits einen funktionierenden API-Schlüssel für OpenWeather.

**Für eigenen OpenWeather API Key (optional):**
1. Registrieren Sie sich auf [OpenWeatherMap](https://openweathermap.org/)
2. Gehen Sie zu [API Keys](https://home.openweathermap.org/api_keys)
3. Erstellen Sie einen neuen API Key (kostenlos)
4. Ersetzen Sie den Key in der `.env` Datei

**Für Google AI / Gemini API Key (für KI-Assistent):**
1. Besuchen Sie [Google AI Studio](https://ai.google.dev/)
2. Melden Sie sich mit Ihrem Google-Konto an
3. Erstellen Sie einen neuen API Key (kostenlos für gemini-2.0-flash-exp)
4. Fügen Sie den Key in der `.env` Datei ein:
   ```
   GOOGLE_AI_API_KEY=IhrGoogleAIKeyHier
   ```

**Hinweis:** Der KI-Assistent funktioniert nur mit einem gültigen Google AI API Key.

### Schritt 5: Anwendung starten

```bash
python app.py
```

Die Anwendung läuft jetzt auf `http://localhost:5000`

## Verwendung

### Automatischer Stundenplan

Der Stundenplan wird **automatisch** von der KSR-API geladen:
```
https://isy-api.ksr.ch/pagdDownloadTimeTableIcal/dmbphs0g5i58gpwo7fxkja/timetable.ics
```

**Keine manuelle Aktion erforderlich!** Die Daten werden:
- ✅ Beim Laden der Seite automatisch abgerufen
- ✅ Alle 5 Minuten automatisch aktualisiert
- ✅ Prüfungen werden erkannt durch "(Prüfung)" am Ende des Titels

**Hinweis für Entwicklung:** Falls die automatische Synchronisation nicht funktioniert (z.B. Netzwerkprobleme oder in einer Sandbox-Umgebung), verwendet die App automatisch eine lokale Fallback-Datei (`uploads/timetable.ics`). Die mitgelieferte `sample_timetable.ics` enthält Beispieldaten mit zukünftigen Daten, die Sie zum Testen in den `uploads/` Ordner kopieren können.

### OneNote-Links konfigurieren

Bearbeiten Sie die Datei `static/js/main.js` und ersetzen Sie die Platzhalter-URLs:

```javascript
const oneNoteLinks = {
    'Mathematik': 'onenote:https://d.docs.live.net/xxx/Mathematik',
    'Deutsch': 'onenote:https://d.docs.live.net/xxx/Deutsch',
    'Englisch': 'onenote:https://d.docs.live.net/xxx/Englisch',
    // ... weitere Fächer
    'default': {
        'school': 'onenote:https://d.docs.live.net/xxx/Schule',
        'personal': 'onenote:https://d.docs.live.net/xxx/Persönlich',
        'projects': 'onenote:https://d.docs.live.net/xxx/Projekte'
    }
};
```

**OneNote-URLs finden:**
1. Öffnen Sie OneNote Desktop-App
2. Rechtsklick auf ein Notizbuch → "Link zum Notizbuch kopieren"
3. Der Link hat das Format: `onenote:https://d.docs.live.net/...`
4. Fügen Sie den Link in die Konfiguration ein

**Hinweis:** Die OneNote-Links funktionieren nur mit der installierten OneNote Desktop-App.

## Projektstruktur

```
supergui/
├── app.py                  # Haupt-Flask-Anwendung
├── requirements.txt        # Python-Abhängigkeiten
├── README.md              # Diese Datei
├── .gitignore             # Git-Ignore-Datei
├── templates/
│   └── index.html         # HTML-Template
├── static/
│   ├── css/
│   │   └── style.css      # Styling
│   └── js/
│       └── main.js        # JavaScript-Funktionen
└── uploads/               # ICS-Dateien (wird erstellt)
```

## API-Endpunkte

### `GET /`
Haupt-Dashboard-Seite

### `GET /api/timetable`
Gibt Stundenplan-Daten zurück
- Nächste Lektion
- Aktuelle Lektion
- Heutige Lektionen
- Kommende Prüfungen

### `GET /api/weekly`
Gibt Wochenübersicht zurück
- Alle Lektionen der aktuellen Woche
- Gruppiert nach Tagen
- Parameter: `mode` (auto/manual)

### `GET /api/weather`
Gibt Wetterdaten für Romanshorn zurück

### `POST /api/ai/chat`
KI-Assistent Chat-Endpunkt
- Parameter: `message` (Benutzernachricht), `history` (Gesprächsverlauf)
- Nutzt Google Gemini 2.0 Flash
- Kontext: Stundenplan-Daten

### `POST /upload`
ICS-Datei hochladen
- Parameter: `file` (ICS-Datei)

## Technologien

- **Backend:** Flask (Python 3.8+)
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **APIs:** 
  - OpenWeather API (Wetterdaten)
  - Google Gemini AI (KI-Assistent)
- **Bibliotheken:**
  - icalendar: ICS-Datei-Parsing
  - requests: HTTP-Anfragen
  - python-dateutil: Datum/Zeit-Verwaltung
  - pytz: Zeitzone-Unterstützung
  - google-generativeai: Google AI Integration

## Design

- **Super modernes dunkles Design** mit Farbverläufen
- **Glassmorphismus-Effekte** mit Backdrop-Blur
- **Flüssige Animationen** und Übergänge
- **Abgerundete Buttons** mit Hover-Effekten
- **Glühende Elemente** (Clock, Cards)
- Responsive Layout (Desktop, Tablet, Mobile)
- Animierte Hintergründe
- Smooth Scroll und Transitions

## Anpassung

### Farben ändern

Bearbeiten Sie die CSS-Variablen in `static/css/style.css`:

```css
:root {
    --primary-color: #6366f1;
    --secondary-color: #8b5cf6;
    --background: #0f172a;
    /* ... weitere Variablen */
}
```

### Wetter-Standort ändern

Bearbeiten Sie `app.py` und ändern Sie die Koordinaten:

```python
# Romanshorn coordinates
lat = 47.5661
lon = 9.3789
```

### KSR-Stundenplan-URL anpassen

Wenn Sie eine andere KSR-Stundenplan-URL verwenden möchten, ändern Sie in `app.py`:

```python
app.config['ICS_URL'] = 'https://isy-api.ksr.ch/pagdDownloadTimeTableIcal/IHRE_ID_HIER/timetable.ics'
```

## Fehlerbehebung

### Wetter wird nicht angezeigt
- Überprüfen Sie, ob der OpenWeather API Key korrekt konfiguriert ist
- Stellen Sie sicher, dass die `.env` Datei im Hauptverzeichnis liegt
- Überprüfen Sie die Browser-Konsole auf Fehler

### Stundenplan wird nicht geladen
- Stellen Sie sicher, dass eine ICS-Datei hochgeladen wurde
- Überprüfen Sie, ob die ICS-Datei gültig ist
- Schauen Sie in die Terminal-Ausgabe für Fehler

### Port 5000 bereits belegt
Ändern Sie den Port in `app.py`:

```python
app.run(debug=True, host='0.0.0.0', port=5001)
```

## Sicherheitshinweise

- ⚠️ API-Keys niemals in den Code committen
- ⚠️ Verwenden Sie `.env` Dateien für sensible Daten
- ⚠️ Setzen Sie `FLASK_ENV=production` in Produktionsumgebungen
- ⚠️ Verwenden Sie einen Production-Server (z.B. Gunicorn) statt Flask Development Server
- ⚠️ Aktivieren Sie HTTPS in Produktionsumgebungen
- ⚠️ Begrenzen Sie den Zugriff auf Upload-Endpoints

## Lizenz

Dieses Projekt steht unter der MIT-Lizenz.

## Autor

NotSusmuel

## Beitragen

Pull Requests sind willkommen! Für größere Änderungen öffnen Sie bitte zuerst ein Issue.

## Roadmap

- [ ] Benutzer-Authentifizierung
- [ ] Mehrere Stundenpläne
- [ ] Notifications für Prüfungen
- [ ] Kalender-Synchronisation
- [ ] Dunkelmodus-Toggle
- [ ] Mehrsprachigkeit