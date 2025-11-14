# Configuration Setup Guide

## Quick Setup

1. **Copy the configuration template:**
   ```bash
   cp config.py.example config.py
   ```

2. **Edit `config.py`** with your personal settings:
   ```python
   # Add your personal KSR timetable URL
   ICS_URL = 'https://isy-api.ksr.ch/pagdDownloadTimeTableIcal/YOUR_ID_HERE/timetable.ics'
   
   # Add your OpenWeather API key (get one free at openweathermap.org)
   OPENWEATHER_API_KEY = 'your_api_key_here'
   ```

3. **Run the application:**
   ```bash
   python app.py
   ```

## Important Security Notes

⚠️ **The `config.py` file is automatically excluded from version control (.gitignore) to protect your personal data:**
- Your timetable URL contains your personal schedule
- Your API key should remain private

✅ **Safe to commit:**
- `config.py.example` (template with empty values)
- All other files

❌ **Never commit:**
- `config.py` (your personal configuration)
- `.env` files with secrets

## Configuration Options

### ICS_URL
Your personal timetable URL from the KSR ISY portal. This link is unique to you and gives access to your schedule.

**Where to find it:**
1. Log into ISY portal
2. Go to "Stundenplan"
3. Copy the ICS download link

### OPENWEATHER_API_KEY  
Free API key from OpenWeatherMap for weather data.

**How to get one:**
1. Visit https://openweathermap.org/api
2. Sign up for a free account
3. Verify your email
4. Copy your API key from the dashboard

### FLASK_ENV
- `development` - Shows detailed errors, auto-reloads on code changes
- `production` - Optimized for deployment, hides error details

## Troubleshooting

**"No such file: config.py"**
→ Copy `config.py.example` to `config.py` and fill in your settings

**"ICS_URL not configured"**
→ Make sure you've added your timetable URL to `config.py`

**"OpenWeather API key not configured"**
→ Add your API key to `config.py` (get one free from openweathermap.org)

**Weather not loading**
→ Check your API key is correct and has been activated (can take a few minutes after signup)
