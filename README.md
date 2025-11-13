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

Erstellen Sie eine `.env` Datei im Hauptverzeichnis:

```env
OPENWEATHER_API_KEY=ihr_api_schlüssel_hier
```

**OpenWeather API Key erhalten:**
1. Registrieren Sie sich auf [OpenWeatherMap](https://openweathermap.org/)
2. Gehen Sie zu [API Keys](https://home.openweathermap.org/api_keys)
3. Erstellen Sie einen neuen API Key (kostenlos)
4. Fügen Sie den Key in die `.env` Datei ein

### Schritt 5: Anwendung starten

```bash
python app.py
```

Die Anwendung läuft jetzt auf `http://localhost:5000`

## Verwendung

### Automatischer Stundenplan

Der Stundenplan wird automatisch von der KSR-API geladen:
```
https://isy-api.ksr.ch/pagdDownloadTimeTableIcal/dmbphs0g5i58gpwo7fxkja/timetable.ics
```

Die Daten werden alle 5 Minuten automatisch aktualisiert.

### Stundenplan manuell hochladen (Fallback)

1. Exportieren Sie Ihren Stundenplan als ICS-Datei (z.B. aus Google Calendar, Outlook, etc.)
2. Klicken Sie auf "ICS-Datei hochladen"
3. Wählen Sie Ihre ICS-Datei aus
4. Der Stundenplan wird automatisch geladen

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
- Kommende Prüfungen

### `GET /api/weather`
Gibt Wetterdaten für Romanshorn zurück

### `POST /upload`
ICS-Datei hochladen
- Parameter: `file` (ICS-Datei)

## Technologien

- **Backend:** Flask (Python 3.8+)
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **APIs:** OpenWeather API
- **Bibliotheken:**
  - icalendar: ICS-Datei-Parsing
  - requests: HTTP-Anfragen
  - python-dateutil: Datum/Zeit-Verwaltung
  - pytz: Zeitzone-Unterstützung

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

- API-Keys niemals in den Code committen
- Verwenden Sie `.env` Dateien für sensible Daten
- Setzen Sie `debug=False` in Produktionsumgebungen
- Verwenden Sie einen Production-Server (z.B. Gunicorn) statt Flask Development Server

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