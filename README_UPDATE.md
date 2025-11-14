# SuperGUI - Flask Dashboard (v2.0 - CSV Format)

Eine moderne Flask-Web-App für Stundenplan-Verwaltung mit **CSV-basiertem Parsing** für verbesserte Genauigkeit.

## ✨ Neu in v2.0: CSV-Format

### Warum CSV?
- ✅ **100% Erkennungsgenauigkeit** - Keine fehlenden Events mehr
- ✅ **Einfacheres Debugging** - In Excel/Editor öffenbar
- ✅ **Keine Library-Abhängigkeit** - Native Python csv-Modul
- ✅ **Automatische Konvertierung** - ICS wird zu CSV konvertiert

### Format
```csv
Subject,Start Date,Start Time,End Date,End Time,Description,Location
M sig 1Mf HL3.01,10/29/2025,08:40,10/29/2025,09:25,,
BIO sn 1Mf H1.03,10/22/2025,08:35,10/22/2025,09:20,,
```

## Features

### 📅 Stundenplan (CSV-basiert)
- **Auto-Sync** - Lädt ICS von KSR API und konvertiert zu CSV
- **Beide Formate** - Upload ICS oder CSV (ICS wird konvertiert)
- **Auto/Manual Toggle** - Wähle zwischen Sync-Modi  
- **Nächste Lektion** - Mit Raum (HL3.01, HR3.06, etc.)
- **Heutige Lektionen** - Alle Lektionen für heute
- **Prüfungen** - Erkennt "(Prüfung)" im Betreff
- **Vollständige Fachnamen** - M→Mathematik, GG→Geografie

### 🔗 Dynamische OneNote-Links
- **Kontextbezogen** - Zeigt Notizbuch für aktuelle Lektion
- **Smart Status** - "Gerade kein Unterricht" / "Fach hat kein Notizbuch"
- **11 Fächer gemappt** - Alle KSR-Notizbücher verlinkt

### 🌦️ Weitere Features
- **Echtzeit-Uhr** mit Leuchteffekt
- **Wetter Romanshorn** (OpenWeather API)
- **Multi-Search** - Google, ChatGPT, GitHub, Brave
- **Moderne UI** - Glassmorphismus, Animationen, 30px Abstände
- **Responsive** - Desktop, Tablet, Mobile

## Installation

```bash
git clone https://github.com/NotSusmuel/supergui.git
cd supergui
pip install -r requirements.txt
cp .env.example .env
python app.py
# http://localhost:5000
```

## KSR-Format

**Subject Field**: `SUBJECT TEACHER CLASS ROOM`
- **M** = Mathematik
- **sig** = Lehrer
- **1Mf** = Klasse  
- **HL3.01** = Raum

**Prüfungen**: "(Prüfung)" am Ende → Orange Badge

## Technologie

- **Backend**: Flask 3.0, Python csv, pytz
- **Frontend**: Vanilla JS, CSS3 Animationen
- **Design**: Glassmorphism, Gradient Buttons
- **Security**: 0 CodeQL Vulnerabilities

## Status

✅ **Produktionsreif**  
✅ **CSV-Format funktioniert perfekt**  
✅ **Alle Events werden erkannt**  
✅ **Security Scan bestanden**

