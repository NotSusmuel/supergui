from flask import Flask, render_template, jsonify, request, session
from datetime import datetime, timedelta
import pytz
import csv
import requests
import os
from pathlib import Path
from dotenv import load_dotenv
import re
from threading import Lock
import time as time_module
import google.generativeai as genai
import jwt
from functools import wraps

# Load configuration from config.py (or config.py.example if config.py doesn't exist)
try:
    import config
    ICS_URL = config.ICS_URL if hasattr(config, 'ICS_URL') and config.ICS_URL else None
    OPENWEATHER_API_KEY = config.OPENWEATHER_API_KEY if hasattr(config, 'OPENWEATHER_API_KEY') and config.OPENWEATHER_API_KEY else None
    GOOGLE_AI_API_KEY = config.GOOGLE_AI_API_KEY if hasattr(config, 'GOOGLE_AI_API_KEY') and config.GOOGLE_AI_API_KEY else None
    FLASK_ENV = config.FLASK_ENV if hasattr(config, 'FLASK_ENV') else 'development'
except ImportError:
    # If config.py doesn't exist, try importing from config.py.example
    try:
        import sys
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import importlib.util
        spec = importlib.util.spec_from_file_location("config", "config.py.example")
        config = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(config)
        ICS_URL = config.ICS_URL if hasattr(config, 'ICS_URL') and config.ICS_URL else None
        OPENWEATHER_API_KEY = config.OPENWEATHER_API_KEY if hasattr(config, 'OPENWEATHER_API_KEY') and config.OPENWEATHER_API_KEY else None
        GOOGLE_AI_API_KEY = config.GOOGLE_AI_API_KEY if hasattr(config, 'GOOGLE_AI_API_KEY') and config.GOOGLE_AI_API_KEY else None
        FLASK_ENV = config.FLASK_ENV if hasattr(config, 'FLASK_ENV') else 'development'
    except Exception:
        # Final fallback to environment variables
        load_dotenv()
        if not os.path.exists('.env'):
            load_dotenv('.env.example')
        ICS_URL = os.getenv('ICS_URL')
        OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY')
        GOOGLE_AI_API_KEY = os.getenv('GOOGLE_AI_API_KEY')
        FLASK_ENV = os.getenv('FLASK_ENV', 'development')

# Configure Google AI
if GOOGLE_AI_API_KEY:
    genai.configure(api_key=GOOGLE_AI_API_KEY)

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['ICS_URL'] = ICS_URL
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')

# ISY.KSR.CH Configuration
ISY_BASE_URL = 'https://isy.ksr.ch'
ISY_API_URL = 'https://isy-api.ksr.ch/graphql'
ISY_DASHBOARD_URL = f'{ISY_BASE_URL}/dashboard'

# Ensure upload folder exists
Path(app.config['UPLOAD_FOLDER']).mkdir(exist_ok=True)

# Cache for timetable data to speed up loading
_timetable_cache = {
    'events': None,
    'timestamp': 0,
    'lock': Lock()
}
CACHE_DURATION = 300  # 5 minutes cache

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
# IMPORTANT: Replace these with YOUR OWN OneNote notebook URLs
# You can find these links by:
# 1. Opening OneNote
# 2. Right-clicking on the notebook
# 3. Selecting "Copy Link to Notebook"
# 4. Paste the link here in the format: 'onenote:https://...'
# 
# Example format:
# 'Subject Name': 'onenote:https://YOUR-SCHOOL.sharepoint.com/sites/YOUR-CLASS/SiteAssets/YOUR-NOTEBOOK',
#
ONENOTE_LINKS = {
    # Add your subject OneNote links here
    # Example:
    # 'Französisch': 'onenote:https://your-school.sharepoint.com/sites/YOUR-CLASS/SiteAssets/YOUR-NOTEBOOK',
    # 'Mathematik': 'onenote:https://your-school.sharepoint.com/sites/YOUR-CLASS/SiteAssets/YOUR-NOTEBOOK',
    # 'Deutsch': 'onenote:https://your-school.sharepoint.com/sites/YOUR-CLASS/SiteAssets/YOUR-NOTEBOOK',
    # Add more subjects as needed...
}

# ISY Authentication Functions
# =============================

def verify_isy_token(token):
    """
    Verify ISY JWT token
    Returns decoded token data if valid, None otherwise
    """
    try:
        # Decode without verification (we trust ISY's signature)
        # In production, you might want to verify the signature with ISY's public key
        decoded = jwt.decode(token, options={"verify_signature": False})
        
        # Check if token is expired
        if 'exp' in decoded:
            exp_timestamp = decoded['exp']
            if datetime.utcnow().timestamp() > exp_timestamp:
                return None
        
        return decoded
    except Exception as e:
        print(f"Error verifying token: {e}")
        return None

def isy_login_required(f):
    """
    Decorator to require ISY authentication for routes
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check if user has ISY token in session
        isy_token = session.get('isy_token')
        
        if not isy_token:
            return jsonify({'error': 'ISY login required', 'login_required': True}), 401
        
        # Verify token is still valid
        token_data = verify_isy_token(isy_token)
        if not token_data:
            session.pop('isy_token', None)
            return jsonify({'error': 'ISY session expired', 'login_required': True}), 401
        
        # Store username in request context
        request.isy_username = token_data.get('username')
        
        return f(*args, **kwargs)
    return decorated_function

def get_isy_person_id(token):
    """
    Get the person ID (IRI) for the authenticated user
    Uses GraphQL to query the current user's person information
    """
    try:
        # GraphQL query to get current user's person info
        graphql_query = """
        query {
          me {
            id
            person {
              id
              loginid
              firstname
              lastname
            }
          }
        }
        """
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'Accept': '*/*'
        }
        
        payload = {
            'query': graphql_query
        }
        
        response = requests.post(ISY_API_URL, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract person ID from response
        if 'data' in data and 'me' in data['data']:
            person = data['data']['me'].get('person')
            if person and 'id' in person:
                return person['id']
        
        return None
        
    except Exception as e:
        print(f"Error getting ISY person ID: {e}")
        import traceback
        traceback.print_exc()
        return None

def fetch_isy_messages(token, person_id):
    """
    Fetch messages from ISY using GraphQL API with authenticated session
    Returns list of messages or None on error
    
    Uses ISY's GraphQL API to fetch messages with full details
    """
    try:
        # GraphQL query for fetching messages with all important fields
        graphql_query = """
        query fetchMessages($me: String!, $first: Int, $after: String) {
          messages(
            context: {iri: $me}
            first: $first
            after: $after
            order: {visibleTo: "DESC"}
          ) {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              node {
                _id
                id
                title
                subject
                body
                status
                priority
                dtFrom
                dtTo
                visibleFrom
                visibleTo
                dtDue
                shownIn
                authLevel
                accomplished
                me {
                  id
                  readWhen
                  seenWhen
                  archivedWhen
                  priorityTodo
                  positionTodo
                  completedWhen
                  modified
                }
              }
            }
          }
        }
        """
        
        # GraphQL variables
        variables = {
            "me": person_id,
            "first": 100,
            "after": None
        }
        
        # Make GraphQL request
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'Accept': '*/*'
        }
        
        payload = {
            'operationName': 'fetchMessages',
            'variables': variables,
            'query': graphql_query
        }
        
        print(f"Fetching ISY messages for person: {person_id}")
        response = requests.post(ISY_API_URL, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        print(f"ISY API Response: {data}")
        
        # Check for GraphQL errors
        if 'errors' in data:
            print(f"GraphQL errors: {data['errors']}")
            return None
        
        # Extract messages from GraphQL response
        messages = []
        if 'data' in data and 'messages' in data['data']:
            edges = data['data']['messages'].get('edges', [])
            print(f"Found {len(edges)} messages")
            for edge in edges:
                node = edge.get('node', {})
                me = node.get('me', {})
                messages.append({
                    'id': node.get('_id'),
                    'title': node.get('title', 'Keine Titel'),
                    'subject': node.get('subject'),
                    'body': node.get('body'),
                    'priority': node.get('priority', 0),
                    'status': node.get('status'),
                    'dtFrom': node.get('dtFrom'),
                    'dtTo': node.get('dtTo'),
                    'visibleFrom': node.get('visibleFrom'),
                    'visibleTo': node.get('visibleTo'),
                    'dtDue': node.get('dtDue'),
                    'shownIn': node.get('shownIn'),
                    'accomplished': node.get('accomplished'),
                    'completed': me.get('completedWhen') is not None,
                    'completedWhen': me.get('completedWhen'),
                    'readWhen': me.get('readWhen'),
                    'seenWhen': me.get('seenWhen'),
                    'archivedWhen': me.get('archivedWhen'),
                    'priorityTodo': me.get('priorityTodo'),
                    'positionTodo': me.get('positionTodo')
                })
        else:
            print(f"No messages data in response: {data}")
        
        return messages
        
    except Exception as e:
        print(f"Error fetching ISY messages: {e}")
        import traceback
        traceback.print_exc()
        return None

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
    """Get all lessons for today that haven't ended yet"""
    zurich_tz = pytz.timezone('Europe/Zurich')
    now = datetime.now(zurich_tz)
    today_str = now.strftime('%Y%m%d')
    
    todays = []
    for event in events:
        # Check if the event starts on the same day (compare YYYYMMDD format)
        event_date_str = event['start'].strftime('%Y%m%d')
        if event_date_str == today_str:
            # Only include lessons that haven't ended yet
            if event['end'] > now:
                todays.append(event)
    
    return todays

def get_upcoming_exams(events, count=3):
    """Get the next specified number of upcoming exams (not limited by days)"""
    zurich_tz = pytz.timezone('Europe/Zurich')
    now = datetime.now(zurich_tz)
    
    # Get all future exams and sort by start time
    exams = [e for e in events if e['is_exam'] and e['start'] > now]
    exams.sort(key=lambda x: x['start'])
    
    # Return only the first 'count' exams
    return exams[:count]

def get_weekly_lessons(events):
    """Get all lessons for the current week (Monday to Sunday)"""
    zurich_tz = pytz.timezone('Europe/Zurich')
    now = datetime.now(zurich_tz)
    
    # Calculate start of week (Monday)
    start_of_week = now - timedelta(days=now.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Calculate end of week (Sunday)
    end_of_week = start_of_week + timedelta(days=7)
    
    # Filter events for this week
    weekly_lessons = []
    for event in events:
        if start_of_week <= event['start'] < end_of_week:
            weekly_lessons.append(event)
    
    # Group by day
    days = {}
    for lesson in weekly_lessons:
        day_key = lesson['start'].strftime('%Y-%m-%d')
        day_name = lesson['start'].strftime('%A, %d. %B %Y')
        
        if day_key not in days:
            days[day_key] = {
                'date': day_name,
                'lessons': []
            }
        days[day_key]['lessons'].append(lesson)
    
    # Sort days and return as list
    sorted_days = sorted(days.items(), key=lambda x: x[0])
    return [{'date': day[1]['date'], 'lessons': day[1]['lessons']} for day in sorted_days]

@app.route('/')
def index():
    """Render main page"""
    return render_template('index.html')

@app.route('/api/isy/login', methods=['POST'])
def isy_login():
    """
    ISY login endpoint
    Accepts username and password, authenticates with ISY, and stores session
    
    Uses ISY's authentication_token endpoint
    """
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        stay_signed_in = data.get('staySignedIn', False)
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        # ISY authentication endpoint
        auth_url = 'https://isy-api.ksr.ch/authentication_token'
        
        # Prepare login payload
        login_payload = {
            'loginid': username,
            'password': password
        }
        
        # Make login request to ISY
        headers = {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
            'Origin': 'https://isy.ksr.ch',
            'Referer': 'https://isy.ksr.ch/'
        }
        
        response = requests.post(auth_url, json=login_payload, headers=headers, timeout=10)
        
        if response.status_code != 200:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Extract token from response
        response_data = response.json()
        token = response_data.get('token')
        
        if not token:
            return jsonify({'error': 'Login failed - no token received'}), 500
        
        # Verify and decode token
        token_data = verify_isy_token(token)
        if not token_data:
            return jsonify({'error': 'Invalid token received'}), 500
        
        # Store token in session
        session['isy_token'] = token
        session['isy_username'] = token_data.get('username')
        session.permanent = stay_signed_in
        
        return jsonify({
            'success': True,
            'username': token_data.get('username'),
            'redirect': ISY_DASHBOARD_URL
        })
        
    except requests.exceptions.RequestException as e:
        print(f"ISY login request failed: {e}")
        return jsonify({'error': 'Could not connect to ISY server'}), 503
    except Exception as e:
        print(f"ISY login error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Login failed'}), 500

@app.route('/api/isy/logout', methods=['POST'])
def isy_logout():
    """ISY logout endpoint - clears session"""
    session.pop('isy_token', None)
    session.pop('isy_username', None)
    return jsonify({'success': True})

@app.route('/api/isy/status')
def isy_status():
    """Check ISY authentication status"""
    isy_token = session.get('isy_token')
    
    if not isy_token:
        return jsonify({'authenticated': False})
    
    token_data = verify_isy_token(isy_token)
    if not token_data:
        session.pop('isy_token', None)
        session.pop('isy_username', None)
        return jsonify({'authenticated': False})
    
    return jsonify({
        'authenticated': True,
        'username': token_data.get('username')
    })

@app.route('/api/isy/messages')
@isy_login_required
def isy_messages():
    """
    Fetch ISY messages/todos for authenticated user using GraphQL API
    """
    try:
        token = session.get('isy_token')
        
        # Get person ID for the authenticated user
        person_id = get_isy_person_id(token)
        
        if not person_id:
            return jsonify({
                'error': 'Could not get user person ID',
                'message': 'Failed to fetch person information from ISY. Please try logging in again.'
            }), 500
        
        # Fetch messages using GraphQL
        messages = fetch_isy_messages(token, person_id)
        
        if messages is None:
            return jsonify({
                'error': 'Failed to fetch messages',
                'message': 'Error communicating with ISY GraphQL API'
            }), 500
        
        return jsonify({'messages': messages})
        
    except Exception as e:
        print(f"Error in isy_messages endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@app.route('/api/timetable')
def get_timetable():
    """API endpoint to get timetable data with caching for performance"""
    # Check for mode parameter (auto or manual)
    mode = request.args.get('mode', 'auto')
    
    events = []
    csv_path = os.path.join(app.config['UPLOAD_FOLDER'], 'timetable.csv')
    
    # Check cache first for performance optimization
    current_time = time_module.time()
    with _timetable_cache['lock']:
        cache_age = current_time - _timetable_cache['timestamp']
        
        if _timetable_cache['events'] is not None and cache_age < CACHE_DURATION:
            # Use cached data
            events = _timetable_cache['events']
        else:
            # Cache expired or empty, fetch new data
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
            
            # Update cache
            _timetable_cache['events'] = events
            _timetable_cache['timestamp'] = current_time
    
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
    api_key = OPENWEATHER_API_KEY or os.environ.get('OPENWEATHER_API_KEY', '')
    
    if not api_key:
        return jsonify({
            'error': 'OpenWeather API key not configured',
            'message': 'Please set OPENWEATHER_API_KEY in config.py or environment variable'
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

@app.route('/api/weekly')
def get_weekly():
    """API endpoint to get weekly timetable data"""
    mode = request.args.get('mode', 'auto')
    
    events = []
    csv_path = os.path.join(app.config['UPLOAD_FOLDER'], 'timetable.csv')
    
    # Check cache first for performance optimization
    current_time = time_module.time()
    with _timetable_cache['lock']:
        cache_age = current_time - _timetable_cache['timestamp']
        
        if _timetable_cache['events'] is not None and cache_age < CACHE_DURATION:
            # Use cached data
            events = _timetable_cache['events']
        else:
            # Cache expired or empty, fetch new data
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
            
            # Update cache
            _timetable_cache['events'] = events
            _timetable_cache['timestamp'] = current_time
    
    if not events:
        return jsonify({
            'weekly_schedule': [],
            'message': 'Keine Stundenplan-Daten verfügbar.'
        })
    
    weekly_schedule = get_weekly_lessons(events)
    
    # Format data for JSON response
    weekly_data = []
    for day in weekly_schedule:
        day_lessons = []
        for lesson in day['lessons']:
            day_lessons.append({
                'summary': lesson['summary'],
                'start': lesson['start'].isoformat(),
                'end': lesson['end'].isoformat() if lesson['end'] else None,
                'description': lesson['description'] if lesson['description'] and lesson['description'] != 'None' else '',
                'location': lesson['location'],
                'is_exam': lesson['is_exam'],
                'is_cancelled': lesson['is_cancelled'],
                'special_note': lesson['special_note']
            })
        
        weekly_data.append({
            'date': day['date'],
            'lessons': day_lessons
        })
    
    return jsonify({
        'weekly_schedule': weekly_data
    })

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

@app.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    """AI chat endpoint using Google Gemini"""
    if not GOOGLE_AI_API_KEY:
        return jsonify({
            'error': 'Google AI API key not configured',
            'response': 'Der KI-Assistent ist nicht konfiguriert. Bitte setze GOOGLE_AI_API_KEY in der Konfiguration.'
        }), 500
    
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        history = data.get('history', [])
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Get current timetable data for context
        csv_path = os.path.join(app.config['UPLOAD_FOLDER'], 'timetable.csv')
        events = []
        
        with _timetable_cache['lock']:
            if _timetable_cache['events'] is not None:
                events = _timetable_cache['events']
            elif os.path.exists(csv_path):
                events = parse_csv_timetable(csv_path)
        
        # Prepare context about the timetable
        context = "Du bist ein hilfreicher Assistent für einen Schüler. Du hast Zugriff auf seinen Stundenplan.\n\n"
        
        if events:
            next_lesson = get_next_lesson(events)
            current_lesson = get_current_lesson(events)
            todays_lessons = get_todays_lessons(events)
            upcoming_exams = get_upcoming_exams(events)
            
            context += "AKTUELLE INFORMATIONEN:\n"
            
            if current_lesson:
                context += f"Aktuelle Lektion: {current_lesson['summary']}"
                if current_lesson['location']:
                    context += f" im Raum {current_lesson['location']}"
                context += f" (bis {current_lesson['end'].strftime('%H:%M')})\n"
            
            if next_lesson:
                context += f"Nächste Lektion: {next_lesson['summary']}"
                if next_lesson['location']:
                    context += f" im Raum {next_lesson['location']}"
                context += f" um {next_lesson['start'].strftime('%H:%M')}\n"
            
            if todays_lessons:
                context += f"\nHeutige Lektionen ({len(todays_lessons)}):\n"
                for lesson in todays_lessons[:5]:  # Limit to 5
                    context += f"- {lesson['start'].strftime('%H:%M')}: {lesson['summary']}"
                    if lesson['is_exam']:
                        context += " (PRÜFUNG)"
                    context += "\n"
            
            if upcoming_exams:
                context += f"\nKommende Prüfungen:\n"
                for exam in upcoming_exams:
                    context += f"- {exam['start'].strftime('%d.%m.%Y %H:%M')}: {exam['summary']}\n"
        
        context += "\nBeantworte die Frage des Schülers freundlich und hilfreich auf Deutsch. Bei Fragen zum Stundenplan verwende die oben genannten Informationen."
        
        # Use Gemini Flash Lite model (free tier)
        model = genai.GenerativeModel('gemini-2.5-flash-lite')
        
        # Build conversation history for the model
        chat_history = []
        for msg in history[-10:]:  # Keep last 10 messages
            chat_history.append({
                'role': 'user' if msg['role'] == 'user' else 'model',
                'parts': [msg['content']]
            })
        
        # Start chat with history
        chat = model.start_chat(history=chat_history)
        
        # Send message with context
        full_message = f"{context}\n\nFrage: {user_message}"
        response = chat.send_message(full_message)
        
        return jsonify({
            'response': response.text
        })
        
    except Exception as e:
        print(f"Error in AI chat: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'AI service error',
            'response': f'Entschuldigung, es gab einen Fehler: {str(e)}'
        }), 500

if __name__ == '__main__':
    # Use environment variable to control debug mode
    # In production, set FLASK_ENV=production
    debug_mode = os.environ.get('FLASK_ENV', 'production') != 'production'
    app.run(debug=debug_mode, host='0.0.0.0', port=5000)
