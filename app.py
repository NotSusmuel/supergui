from flask import Flask, render_template, jsonify, request
from datetime import datetime, timedelta
import pytz
import csv
import requests
import os
from pathlib import Path
from dotenv import load_dotenv
import re

# Load environment variables from .env file
load_dotenv()

# Fallback: if .env doesn't exist, try .env.example
if not os.path.exists('.env'):
    load_dotenv('.env.example')

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['ICS_URL'] = 'https://isy-api.ksr.ch/pagdDownloadTimeTableIcal/dmbphs0g5i58gpwo7fxkja/timetable.ics'

# Ensure upload folder exists
Path(app.config['UPLOAD_FOLDER']).mkdir(exist_ok=True)

# Subject abbreviation mapping
SUBJECT_MAPPING = {
    'IF': 'Informatik',
    'F': 'Französisch',
    'MU': 'Musik',
    'M': 'Mathematik',
    'D': 'Deutsch',
    'WR': 'Wirtschaft und Recht',
    'SP05': 'Sport',
    'BG08': 'Bildnerisches Gestalten',
    'E': 'Englisch',
    'GG': 'Geografie',
    'BIO': 'Biologie',
    'BIO1': 'Biologie',
    'G': 'Geschichte',
    'CH': 'Chemie',
    'CH1': 'Chemie',
    # Legacy mappings for sample data
    'MA': 'Mathematik',
    'DE': 'Deutsch',
    'EN': 'Englisch',
    'PH': 'Physik',
    'IN': 'Informatik'
}

# OneNote notebook links for each subject
ONENOTE_LINKS = {
    'Französisch': 'onenote:https://kantonsschuleromanshorn.sharepoint.com/sites/Franais1-4Mfz25-29/SiteAssets/Fran%C3%A7ais%201-4Mfz%2025-29-Notizbuch',
    'Chemie': 'onenote:https://kantonsschuleromanshorn.sharepoint.com/sites/Chemie_bshMfz2025-29/SiteAssets/Chemie_bsh%20Mfz%202025-29-Notizbuch',
    'Mathematik': 'onenote:https://kantonsschuleromanshorn.sharepoint.com/sites/MathematikMfz2025-2029/SiteAssets/Mathematik%20Mfz%202025%20-%202029-Notizbuch',
    'Wirtschaft und Recht': 'onenote:https://kantonsschuleromanshorn.sharepoint.com/sites/WRMfz2025-2026/SiteAssets/WR%20Mfz%202025-2026-Notizbuch',
    'Geschichte': 'onenote:https://kantonsschuleromanshorn-my.sharepoint.com/personal/eng_ksr_ch/Documents/Kursnotizb%C3%BCcher/Geschichte%20Mfz%202025-2029',
    'Biologie': 'onenote:https://kantonsschuleromanshorn-my.sharepoint.com/personal/sn_ksr_ch/Documents/Kursnotizb%C3%BCcher/Bio%20Mfz%202025-29',
    'Englisch': 'onenote:https://kantonsschuleromanshorn-my.sharepoint.com/personal/wus_ksr_ch/Documents/Kursnotizb%C3%BCcher/Englisch%20Mf%202025-2029',
    'Deutsch': 'onenote:https://kantonsschuleromanshorn.sharepoint.com/sites/DeutschMf2025-2029/SiteAssets/Deutsch%20Mf%202025-2029-Notizbuch',
    'Informatik': 'onenote:https://kantonsschuleromanshorn.sharepoint.com/sites/InformatikMf2025-2029/SiteAssets/Informatik%20Mf%202025-2029-Notizbuch',
    'Musik': 'onenote:https://kantonsschuleromanshorn.sharepoint.com/sites/MusicMf2025-2029/SiteAssets/Music%20Mf%202025-2029-Notizbuch',
    'Geografie': 'onenote:https://kantonsschuleromanshorn.sharepoint.com/sites/GeographieMf2025-2029/SiteAssets/Geographie%20Mf%202025-2029-Notizbuch',
    # Klassen-Team is general, not subject-specific
}

def get_subject_name(abbreviation):
    """Convert subject abbreviation to full name"""
    return SUBJECT_MAPPING.get(abbreviation, abbreviation)


def fetch_and_convert_ics_to_csv(url):
    """
    Fetch ICS from URL and convert to CSV format
    Returns CSV file path or None on error
    """
    try:
        # Download ICS
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        temp_ics = os.path.join(app.config['UPLOAD_FOLDER'], 'temp_timetable.ics')
        with open(temp_ics, 'wb') as f:
            f.write(response.content)
        
        # Parse ICS and convert to CSV
        events = []
        with open(temp_ics, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
        
        event = {}
        for line in lines:
            line = line.strip()
            if line.startswith("BEGIN:VEVENT"):
                event = {}
            elif line.startswith("SUMMARY:"):
                event["Subject"] = line.replace("SUMMARY:", "")
            elif line.startswith("DTSTART:"):
                dtstart = datetime.strptime(line.replace("DTSTART:", ""), "%Y%m%dT%H%M%SZ")
                event["Start Date"] = dtstart.strftime("%m/%d/%Y")
                event["Start Time"] = dtstart.strftime("%H:%M")
            elif line.startswith("DTEND:"):
                dtend = datetime.strptime(line.replace("DTEND:", ""), "%Y%m%dT%H%M%SZ")
                event["End Date"] = dtend.strftime("%m/%d/%Y")
                event["End Time"] = dtend.strftime("%H:%M")
            elif line.startswith("END:VEVENT"):
                if event:  # Only add if event has data
                    events.append(event)
        
        # Write to CSV
        csv_path = os.path.join(app.config['UPLOAD_FOLDER'], 'timetable.csv')
        with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ["Subject", "Start Date", "Start Time", "End Date", "End Time", "Description", "Location"]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            for e in events:
                writer.writerow({
                    "Subject": e.get("Subject", ""),
                    "Start Date": e.get("Start Date", ""),
                    "Start Time": e.get("Start Time", ""),
                    "End Date": e.get("End Date", ""),
                    "End Time": e.get("End Time", ""),
                    "Description": "",
                    "Location": ""
                })
        
        print(f"CSV file created: {csv_path}")
        return csv_path
        
    except Exception as e:
        print(f"Error converting ICS to CSV: {e}")
        return None


def parse_csv_timetable(csv_path):
    """
    Parse CSV timetable file
    Format: Subject,Start Date,Start Time,End Date,End Time,Description,Location
    Example: BIO sn 1Mf H1.03,10/22/2025,08:35,10/22/2025,09:20,,
    """
    events = []
    zurich_tz = pytz.timezone('Europe/Zurich')
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                summary = row['Subject'].strip()
                if not summary:
                    continue
                
                # Parse dates and times
                start_date_str = row['Start Date'].strip()
                start_time_str = row['Start Time'].strip()
                end_date_str = row['End Date'].strip()
                end_time_str = row['End Time'].strip()
                
                if not start_date_str or not start_time_str:
                    continue
                
                # Combine date and time
                start_datetime_str = f"{start_date_str} {start_time_str}"
                end_datetime_str = f"{end_date_str} {end_time_str}"
                
                # Parse datetime
                start_dt = datetime.strptime(start_datetime_str, "%m/%d/%Y %H:%M")
                end_dt = datetime.strptime(end_datetime_str, "%m/%d/%Y %H:%M")
                
                # Add 1 hour to correct timezone issue (ICS times are 1 hour too early)
                start_dt = start_dt + timedelta(hours=1)
                end_dt = end_dt + timedelta(hours=1)
                
                # Localize to Zurich timezone
                start_dt = zurich_tz.localize(start_dt)
                end_dt = zurich_tz.localize(end_dt)
                
                # Parse KSR format: "SUBJECT TEACHER CLASS ROOM"
                # Example: "BIO sn 1Mf H1.03" or "M sig 1Mf HL3.01 (Prüfung)"
                subject_display = summary  # Default to full summary
                location = row.get('Location', '').strip()
                description = row.get('Description', '').strip()
                
                # Extract room from SUMMARY if LOCATION is empty
                if not location and summary:
                    # Match KSR room format: 1-2 letters followed by digit(s).digit(s)
                    room_match = re.search(r'\b([A-Z]{1,2}\d+\.\d{2})\b', summary)
                    if room_match:
                        location = room_match.group(1)
                
                # Extract subject abbreviation (first word before any lowercase letters)
                # Format: "SUBJECT teacher class ROOM" or "SUBJECT class ROOM"
                parts = summary.split()
                if len(parts) > 0:
                    # First part is usually the subject abbreviation (uppercase)
                    subject_abbr = parts[0]
                    
                    # Get full subject name
                    subject_name = get_subject_name(subject_abbr)
                    
                    # Build display name: "Subject (Room)" or just "Subject" if no room
                    if location:
                        subject_display = f"{subject_name} ({location})"
                    else:
                        subject_display = subject_name
                
                # Check if it's an exam:
                # - Look for "(Prüfung)" anywhere in SUMMARY or DESCRIPTION
                # - Note: teacher abbreviations like "klk" are NOT exam indicators
                # - Note: "Nachprüfung" does NOT count as exam
                is_exam = (('(prüfung)' in summary.lower() or 
                           (description and '(prüfung)' in description.lower())) and
                          'nachprüfung' not in summary.lower() and
                          (not description or 'nachprüfung' not in description.lower()))
                
                # Check for special events (cancelled, etc.)
                is_cancelled = any(keyword in summary.lower() or (description and keyword in description.lower()) 
                                 for keyword in ['ausgefallen', 'cancelled', 'abgesagt', 'entfällt'])
                
                special_note = ''
                if is_cancelled:
                    special_note = 'Ausgefallen'
                elif 'verschoben' in summary.lower() or (description and 'verschoben' in description.lower()):
                    special_note = 'Verschoben'
                elif 'raumwechsel' in summary.lower() or (description and 'raumwechsel' in description.lower()):
                    special_note = 'Raumwechsel'
                
                events.append({
                    'summary': subject_display,
                    'original_summary': summary,  # Keep original for reference
                    'start': start_dt,
                    'end': end_dt,
                    'description': description if description and description != 'None' else '',
                    'location': location,
                    'is_exam': is_exam,
                    'is_cancelled': is_cancelled,
                    'special_note': special_note
                })
        
        # Sort events by start time
        events.sort(key=lambda x: x['start'])
        return events
    except Exception as e:
        print(f"Error parsing CSV: {e}")
        import traceback
        traceback.print_exc()
        return []

def get_next_lesson(events):
    """Get the next upcoming lesson"""
    zurich_tz = pytz.timezone('Europe/Zurich')
    now = datetime.now(zurich_tz)
    
    for event in events:
        if event['start'] > now:
            return event
    
    return None

def get_current_lesson(events):
    """Get the lesson that is currently happening (now between start and end time)"""
    zurich_tz = pytz.timezone('Europe/Zurich')
    now = datetime.now(zurich_tz)
    
    for event in events:
        if event['start'] <= now <= event['end']:
            return event
    
    return None

def get_todays_lessons(events):
    """Get all lessons for today"""
    zurich_tz = pytz.timezone('Europe/Zurich')
    now = datetime.now(zurich_tz)
    today_str = now.strftime('%Y%m%d')
    
    todays = []
    for event in events:
        # Check if the event starts on the same day (compare YYYYMMDD format)
        event_date_str = event['start'].strftime('%Y%m%d')
        if event_date_str == today_str:
            todays.append(event)
    
    return todays

def get_upcoming_exams(events, days=14):
    """Get exams in the next specified days"""
    zurich_tz = pytz.timezone('Europe/Zurich')
    now = datetime.now(zurich_tz)
    future = now + timedelta(days=days)
    
    exams = [e for e in events if e['is_exam'] and now <= e['start'] <= future]
    return exams

@app.route('/')
def index():
    """Render main page"""
    return render_template('index.html')

@app.route('/api/timetable')
def get_timetable():
    """API endpoint to get timetable data"""
    # Check for mode parameter (auto or manual)
    mode = request.args.get('mode', 'auto')
    
    events = []
    csv_path = os.path.join(app.config['UPLOAD_FOLDER'], 'timetable.csv')
    
    if mode == 'auto':
        # Try to fetch from URL and convert to CSV
        csv_file = fetch_and_convert_ics_to_csv(app.config['ICS_URL'])
        
        if csv_file and os.path.exists(csv_file):
            events = parse_csv_timetable(csv_file)
        elif os.path.exists(csv_path):
            # Auto fetch failed, fallback to existing local CSV
            events = parse_csv_timetable(csv_path)
    else:
        # Manual mode - use uploaded CSV file only
        if os.path.exists(csv_path):
            events = parse_csv_timetable(csv_path)
    
    if not events:
        return jsonify({
            'next_lesson': None,
            'current_lesson': None,
            'todays_lessons': [],
            'exams': [],
            'message': 'Keine Stundenplan-Daten verfügbar. Bitte CSV-Datei hochladen oder automatische Synchronisation aktivieren.'
        })
    
    next_lesson = get_next_lesson(events)
    current_lesson = get_current_lesson(events)
    todays_lessons = get_todays_lessons(events)
    exams = get_upcoming_exams(events)
    
    # Format data for JSON response
    next_lesson_data = None
    if next_lesson:
        next_lesson_data = {
            'summary': next_lesson['summary'],
            'start': next_lesson['start'].isoformat(),
            'end': next_lesson['end'].isoformat() if next_lesson['end'] else None,
            'description': next_lesson['description'] if next_lesson['description'] and next_lesson['description'] != 'None' else '',
            'location': next_lesson['location'],
            'is_cancelled': next_lesson['is_cancelled'],
            'special_note': next_lesson['special_note']
        }
    
    # Format current lesson data
    current_lesson_data = None
    if current_lesson:
        # Extract subject name from summary (e.g., "Mathematik (HL3.01)" -> "Mathematik")
        subject_name = current_lesson['summary'].split('(')[0].strip()
        onenote_link = ONENOTE_LINKS.get(subject_name, None)
        
        current_lesson_data = {
            'summary': current_lesson['summary'],
            'subject': subject_name,
            'start': current_lesson['start'].isoformat(),
            'end': current_lesson['end'].isoformat() if current_lesson['end'] else None,
            'location': current_lesson['location'],
            'onenote_link': onenote_link
        }
    
    # Format today's lessons
    todays_data = []
    for lesson in todays_lessons:
        todays_data.append({
            'summary': lesson['summary'],
            'start': lesson['start'].isoformat(),
            'end': lesson['end'].isoformat() if lesson['end'] else None,
            'description': lesson['description'] if lesson['description'] and lesson['description'] != 'None' else '',
            'location': lesson['location'],
            'is_exam': lesson['is_exam'],
            'special_note': lesson['special_note']
        })
    
    exams_data = []
    for exam in exams:
        exams_data.append({
            'summary': exam['summary'],
            'start': exam['start'].isoformat(),
            'end': exam['end'].isoformat() if exam['end'] else None,
            'description': exam['description'] if exam['description'] and exam['description'] != 'None' else '',
            'location': exam['location'],
            'special_note': exam['special_note']
        })
    
    return jsonify({
        'next_lesson': next_lesson_data,
        'current_lesson': current_lesson_data,
        'todays_lessons': todays_data,
        'exams': exams_data
    })

@app.route('/api/weather')
def get_weather():
    """API endpoint to get weather data for Romanshorn"""
    api_key = os.environ.get('OPENWEATHER_API_KEY', '')
    
    if not api_key:
        return jsonify({
            'error': 'OpenWeather API key not configured',
            'message': 'Please set OPENWEATHER_API_KEY environment variable'
        }), 500
    
    try:
        # Romanshorn coordinates
        lat = 47.5661
        lon = 9.3789
        
        url = f'https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric&lang=de'
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        weather_data = {
            'temperature': round(data['main']['temp'], 1),
            'feels_like': round(data['main']['feels_like'], 1),
            'humidity': data['main']['humidity'],
            'description': data['weather'][0]['description'],
            'icon': data['weather'][0]['icon'],
            'wind_speed': data['wind']['speed']
        }
        
        return jsonify(weather_data)
    
    except requests.exceptions.RequestException as e:
        # Don't expose detailed error messages in production
        return jsonify({
            'error': 'Failed to fetch weather data',
            'message': 'Unable to connect to weather service. Please check your API key and internet connection.'
        }), 500

@app.route('/upload', methods=['POST'])
def upload_file():
    """Upload ICS file and convert to CSV"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and (file.filename.endswith('.ics') or file.filename.endswith('.csv')):
        if file.filename.endswith('.ics'):
            # Save ICS file temporarily
            temp_ics = os.path.join(app.config['UPLOAD_FOLDER'], 'uploaded_timetable.ics')
            file.save(temp_ics)
            
            # Convert ICS to CSV
            try:
                events = []
                with open(temp_ics, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()
                
                event = {}
                for line in lines:
                    line = line.strip()
                    if line.startswith("BEGIN:VEVENT"):
                        event = {}
                    elif line.startswith("SUMMARY:"):
                        event["Subject"] = line.replace("SUMMARY:", "")
                    elif line.startswith("DTSTART:"):
                        dtstart = datetime.strptime(line.replace("DTSTART:", ""), "%Y%m%dT%H%M%SZ")
                        event["Start Date"] = dtstart.strftime("%m/%d/%Y")
                        event["Start Time"] = dtstart.strftime("%H:%M")
                    elif line.startswith("DTEND:"):
                        dtend = datetime.strptime(line.replace("DTEND:", ""), "%Y%m%dT%H%M%SZ")
                        event["End Date"] = dtend.strftime("%m/%d/%Y")
                        event["End Time"] = dtend.strftime("%H:%M")
                    elif line.startswith("END:VEVENT"):
                        if event:
                            events.append(event)
                
                # Write to CSV
                csv_path = os.path.join(app.config['UPLOAD_FOLDER'], 'timetable.csv')
                with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
                    fieldnames = ["Subject", "Start Date", "Start Time", "End Date", "End Time", "Description", "Location"]
                    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                    writer.writeheader()
                    for e in events:
                        writer.writerow({
                            "Subject": e.get("Subject", ""),
                            "Start Date": e.get("Start Date", ""),
                            "Start Time": e.get("Start Time", ""),
                            "End Date": e.get("End Date", ""),
                            "End Time": e.get("End Time", ""),
                            "Description": "",
                            "Location": ""
                        })
                
                return jsonify({'message': 'ICS file uploaded and converted to CSV successfully'})
            except Exception as e:
                return jsonify({'error': f'Error converting ICS to CSV: {str(e)}'}), 500
        
        else:  # CSV file
            # Save CSV directly
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], 'timetable.csv')
            file.save(filepath)
            return jsonify({'message': 'CSV file uploaded successfully'})
    
    return jsonify({'error': 'Invalid file type. Please upload an ICS or CSV file.'}), 400

if __name__ == '__main__':
    # Use environment variable to control debug mode
    # In production, set FLASK_ENV=production
    debug_mode = os.environ.get('FLASK_ENV', 'production') != 'production'
    app.run(debug=debug_mode, host='0.0.0.0', port=5000)
