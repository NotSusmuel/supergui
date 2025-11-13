from flask import Flask, render_template, jsonify, request
from datetime import datetime, timedelta
import pytz
from icalendar import Calendar
import requests
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['ICS_URL'] = 'https://isy-api.ksr.ch/pagdDownloadTimeTableIcal/dmbphs0g5i58gpwo7fxkja/timetable.ics'

# Ensure upload folder exists
Path(app.config['UPLOAD_FOLDER']).mkdir(exist_ok=True)

def fetch_ics_from_url(url):
    """Fetch ICS file from URL"""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.content
    except Exception as e:
        print(f"Error fetching ICS from URL: {e}")
        return None

def parse_ics_content(ics_content):
    """Parse ICS content and extract events"""
    try:
        cal = Calendar.from_ical(ics_content)
        
        events = []
        now = datetime.now(pytz.UTC)
        
        for component in cal.walk():
            if component.name == "VEVENT":
                summary = str(component.get('summary', 'No Title'))
                dtstart = component.get('dtstart')
                dtend = component.get('dtend')
                description = str(component.get('description', ''))
                location = str(component.get('location', ''))
                
                if dtstart:
                    start_dt = dtstart.dt
                    # Convert to datetime if it's a date
                    if isinstance(start_dt, datetime):
                        if start_dt.tzinfo is None:
                            start_dt = pytz.UTC.localize(start_dt)
                    else:
                        # It's a date, convert to datetime at midnight
                        start_dt = datetime.combine(start_dt, datetime.min.time())
                        start_dt = pytz.UTC.localize(start_dt)
                    
                    end_dt = None
                    if dtend:
                        end_dt = dtend.dt
                        if isinstance(end_dt, datetime):
                            if end_dt.tzinfo is None:
                                end_dt = pytz.UTC.localize(end_dt)
                        else:
                            end_dt = datetime.combine(end_dt, datetime.min.time())
                            end_dt = pytz.UTC.localize(end_dt)
                    
                    # Check if it's an exam by looking for "(Prüfung)" at the end of the SUMMARY
                    is_exam = summary.strip().endswith('(Prüfung)')
                    
                    # Check for special events (cancelled, etc.)
                    is_cancelled = any(keyword in summary.lower() or keyword in description.lower() 
                                     for keyword in ['ausgefallen', 'cancelled', 'abgesagt', 'entfällt'])
                    
                    special_note = ''
                    if is_cancelled:
                        special_note = 'Ausgefallen'
                    elif 'verschoben' in summary.lower() or 'verschoben' in description.lower():
                        special_note = 'Verschoben'
                    elif 'raumwechsel' in summary.lower() or 'raumwechsel' in description.lower():
                        special_note = 'Raumwechsel'
                    
                    events.append({
                        'summary': summary,
                        'start': start_dt,
                        'end': end_dt,
                        'description': description,
                        'location': location,
                        'is_exam': is_exam,
                        'is_cancelled': is_cancelled,
                        'special_note': special_note
                    })
        
        # Sort events by start time
        events.sort(key=lambda x: x['start'])
        return events
    except Exception as e:
        print(f"Error parsing ICS content: {e}")
        return []

def parse_ics_file(filepath):
    """Parse ICS file and extract events"""
    try:
        with open(filepath, 'rb') as f:
            return parse_ics_content(f.read())
    except Exception as e:
        print(f"Error reading ICS file: {e}")
        return []

def get_next_lesson(events):
    """Get the next upcoming lesson"""
    now = datetime.now(pytz.UTC)
    
    for event in events:
        if event['start'] > now:
            return event
    
    return None

def get_upcoming_exams(events, days=14):
    """Get exams in the next specified days"""
    now = datetime.now(pytz.UTC)
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
    # First, try to fetch from URL
    ics_content = fetch_ics_from_url(app.config['ICS_URL'])
    
    if ics_content:
        events = parse_ics_content(ics_content)
    else:
        # Fallback to local file
        ics_files = list(Path(app.config['UPLOAD_FOLDER']).glob('*.ics'))
        
        if not ics_files:
            return jsonify({
                'next_lesson': None,
                'exams': [],
                'message': 'Keine Stundenplan-Daten verfügbar. Automatische Aktualisierung fehlgeschlagen.'
            })
        
        # Use the first ICS file found
        events = parse_ics_file(ics_files[0])
    
    next_lesson = get_next_lesson(events)
    exams = get_upcoming_exams(events)
    
    # Format data for JSON response
    next_lesson_data = None
    if next_lesson:
        next_lesson_data = {
            'summary': next_lesson['summary'],
            'start': next_lesson['start'].isoformat(),
            'end': next_lesson['end'].isoformat() if next_lesson['end'] else None,
            'description': next_lesson['description'],
            'location': next_lesson['location'],
            'is_cancelled': next_lesson['is_cancelled'],
            'special_note': next_lesson['special_note']
        }
    
    exams_data = []
    for exam in exams:
        exams_data.append({
            'summary': exam['summary'],
            'start': exam['start'].isoformat(),
            'end': exam['end'].isoformat() if exam['end'] else None,
            'description': exam['description'],
            'location': exam['location'],
            'special_note': exam['special_note']
        })
    
    return jsonify({
        'next_lesson': next_lesson_data,
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
    """Upload ICS file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and file.filename.endswith('.ics'):
        # Remove old ICS files
        for old_file in Path(app.config['UPLOAD_FOLDER']).glob('*.ics'):
            old_file.unlink()
        
        # Save new file
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], 'timetable.ics')
        file.save(filepath)
        
        return jsonify({'message': 'File uploaded successfully'})
    
    return jsonify({'error': 'Invalid file type. Please upload an ICS file.'}), 400

if __name__ == '__main__':
    # Use environment variable to control debug mode
    # In production, set FLASK_ENV=production
    debug_mode = os.environ.get('FLASK_ENV', 'production') != 'production'
    app.run(debug=debug_mode, host='0.0.0.0', port=5000)
