# SuperGUI Setup Guide

This guide will help you configure SuperGUI with your personal credentials.

## ⚠️ Important: Privacy Notice

**DO NOT** commit your personal API keys or timetable URLs to Git! These files contain placeholders that you must replace with your own credentials.

## 📋 Setup Steps

### 1. Configure Timetable URL

You need to get your personal timetable URL from the ISY portal:

1. Log in to the ISY portal (https://isy.ksr.ch)
2. Navigate to "Stundenplan" (Timetable)
3. Find the "ICS Export" or "iCal Export" option
4. Copy your personal timetable URL
   - It should look like: `https://isy-api.ksr.ch/pagdDownloadTimeTableIcal/YOUR_ID/timetable.ics`
   - The `YOUR_ID` part is unique to you

**Where to paste it:**

**Option A - Using .env file (Recommended):**
1. Copy `.env.example` to `.env`: `cp .env.example .env`
2. Open `.env` in a text editor
3. Replace `YOUR_TIMETABLE_ID_HERE` with your actual ID
4. Save the file

**Option B - Using config.py:**
1. Copy `config.py.example` to `config.py`: `cp config.py.example config.py`
2. Open `config.py` in a text editor
3. Replace `YOUR_TIMETABLE_ID_HERE` with your actual ID
4. Save the file

### 2. Configure Weather API Key

To display weather information, you need an OpenWeather API key:

1. Go to https://openweathermap.org/api
2. Click "Sign Up" (it's free!)
3. Verify your email address
4. Go to your API keys page
5. Copy your API key (it looks like: `abc123def456ghi789jkl012mno345pq`)

**Where to paste it:**

**In .env file:**
- Replace `YOUR_OPENWEATHER_API_KEY_HERE` with your actual API key

**In config.py:**
- Replace `YOUR_OPENWEATHER_API_KEY_HERE` with your actual API key

### 3. Configure OneNote Notebook Links (Optional)

If you want to quickly open your subject notebooks:

1. Open OneNote (web or desktop)
2. Right-click on a notebook
3. Select "Copy Link to Notebook"
4. Open `app.py` in a text editor
5. Find the `ONENOTE_LINKS` dictionary (around line 82)
6. Add your subject links following the example format:

```python
ONENOTE_LINKS = {
    'Mathematik': 'onenote:https://your-school.sharepoint.com/sites/YOUR-CLASS/...',
    'Deutsch': 'onenote:https://your-school.sharepoint.com/sites/YOUR-CLASS/...',
    'Englisch': 'onenote:https://your-school.sharepoint.com/sites/YOUR-CLASS/...',
    # Add more subjects...
}
```

**Important:** The subject names must match exactly with the names in your timetable!

## 🔒 Security Best Practices

### Keep Your Credentials Private

**Add these files to .gitignore:**

```bash
# Add to .gitignore if not already there
echo ".env" >> .gitignore
echo "config.py" >> .gitignore
```

**Never share:**
- Your timetable URL (it contains your personal ID)
- Your API keys
- Your OneNote links (they may contain personal information)

### Verify Your Configuration

After setup, check that sensitive data is not tracked by Git:

```bash
git status
```

You should NOT see `.env` or `config.py` in the list.

## 🧪 Testing Your Configuration

1. Start the application:
   ```bash
   python app.py
   ```

2. Open your browser to `http://localhost:5000`

3. Check that:
   - ✅ Your timetable loads correctly
   - ✅ Weather displays for your city
   - ✅ OneNote links work when you click "Notizbuch öffnen"

## ❓ Troubleshooting

### Timetable doesn't load
- Check that your timetable URL is correct
- Make sure you copied the entire URL including `https://`
- Verify you have internet connection

### Weather shows error
- Check that your API key is valid
- Wait a few minutes after signing up (API key activation can take time)
- Verify the API key doesn't have extra spaces

### OneNote links don't work
- Make sure the subject name in `ONENOTE_LINKS` matches your timetable exactly
- Check that the OneNote URL is complete
- Try opening the URL in a browser first to verify it works

## 📝 Example Configuration

**`.env` file example:**
```bash
ICS_URL=https://isy-api.ksr.ch/pagdDownloadTimeTableIcal/abc123xyz456/timetable.ics
OPENWEATHER_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
FLASK_ENV=development
```

**`config.py` example:**
```python
ICS_URL = 'https://isy-api.ksr.ch/pagdDownloadTimeTableIcal/abc123xyz456/timetable.ics'
OPENWEATHER_API_KEY = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
WEATHER_CITY = 'Romanshorn'
FLASK_ENV = 'development'
```

## 🎉 You're All Set!

Your SuperGUI is now configured with your personal data. Enjoy your optimized timetable dashboard!

---

For more information, see the main [README.md](README.md).
