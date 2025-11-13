// Clock Update
function updateClock() {
    const now = new Date();
    
    // Format time (HH:MM:SS)
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeString = `${hours}:${minutes}:${seconds}`;
    
    // Format date
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dateString = now.toLocaleDateString('de-DE', options);
    
    document.getElementById('time').textContent = timeString;
    document.getElementById('date').textContent = dateString;
}

// Update clock every second
setInterval(updateClock, 1000);
updateClock(); // Initial call

// Search Functions
function search(engine) {
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query) {
        alert('Bitte geben Sie einen Suchbegriff ein.');
        return;
    }
    
    const encodedQuery = encodeURIComponent(query);
    let url;
    
    switch(engine) {
        case 'google':
            url = `https://www.google.com/search?q=${encodedQuery}`;
            break;
        case 'chatgpt':
            url = `https://chat.openai.com/?q=${encodedQuery}`;
            break;
        case 'github':
            url = `https://github.com/search?q=${encodedQuery}`;
            break;
        case 'brave':
            url = `https://search.brave.com/search?q=${encodedQuery}`;
            break;
    }
    
    window.open(url, '_blank');
}

// Allow Enter key to trigger search
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    
    searchInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            // Default to Google search
            search('google');
        }
    });
});

// OneNote Functions
function openOneNote(type) {
    // These URLs should be configured by the user
    // For now, we'll show an alert with instructions
    const links = {
        'school': 'onenote:https://example.com/school-notebook',
        'personal': 'onenote:https://example.com/personal-notebook',
        'projects': 'onenote:https://example.com/projects-notebook'
    };
    
    // Try to open OneNote URL
    // Note: Users need to configure their actual OneNote URLs
    alert(`OneNote Link für "${type}" würde hier geöffnet.\n\nBitte konfigurieren Sie Ihre OneNote-Links in der JavaScript-Datei (main.js).`);
    
    // Uncomment and configure when you have actual OneNote links:
    // window.open(links[type], '_blank');
}

// Load Timetable Data
async function loadTimetable() {
    try {
        const response = await fetch('/api/timetable');
        const data = await response.json();
        
        // Display next lesson
        const nextLessonDiv = document.getElementById('nextLesson');
        
        if (data.message) {
            nextLessonDiv.innerHTML = `<p class="no-data">${data.message}</p>`;
        } else if (data.next_lesson) {
            const lesson = data.next_lesson;
            const startDate = new Date(lesson.start);
            const endDate = lesson.end ? new Date(lesson.end) : null;
            
            const timeString = formatDateTime(startDate, endDate);
            
            nextLessonDiv.innerHTML = `
                <div class="lesson-title">${lesson.summary}</div>
                <div class="lesson-time">${timeString}</div>
                ${lesson.description ? `<div class="lesson-description">${lesson.description}</div>` : ''}
            `;
        } else {
            nextLessonDiv.innerHTML = `<p class="no-data">Keine kommenden Lektionen gefunden.</p>`;
        }
        
        // Display exams
        const examsListDiv = document.getElementById('examsList');
        
        if (data.exams && data.exams.length > 0) {
            examsListDiv.innerHTML = data.exams.map(exam => {
                const startDate = new Date(exam.start);
                const endDate = exam.end ? new Date(exam.end) : null;
                const timeString = formatDateTime(startDate, endDate);
                
                return `
                    <div class="exam-item">
                        <div class="exam-title">${exam.summary}</div>
                        <div class="exam-time">${timeString}</div>
                        ${exam.description ? `<div class="exam-description">${exam.description}</div>` : ''}
                    </div>
                `;
            }).join('');
        } else {
            examsListDiv.innerHTML = `<p class="no-data">Keine kommenden Prüfungen in den nächsten 14 Tagen.</p>`;
        }
    } catch (error) {
        console.error('Error loading timetable:', error);
        document.getElementById('nextLesson').innerHTML = 
            `<p class="error-message">Fehler beim Laden des Stundenplans: ${error.message}</p>`;
        document.getElementById('examsList').innerHTML = 
            `<p class="error-message">Fehler beim Laden der Prüfungen</p>`;
    }
}

// Load Weather Data
async function loadWeather() {
    try {
        const response = await fetch('/api/weather');
        const data = await response.json();
        
        const weatherDiv = document.getElementById('weatherContent');
        
        if (data.error) {
            weatherDiv.innerHTML = `
                <p class="error-message">${data.error}</p>
                <p class="no-data">${data.message}</p>
            `;
            return;
        }
        
        const iconUrl = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;
        
        weatherDiv.innerHTML = `
            <div class="weather-main">
                <div>
                    <div class="weather-temp">${data.temperature}°C</div>
                    <div class="weather-description">${data.description}</div>
                </div>
                <img src="${iconUrl}" alt="${data.description}" class="weather-icon">
            </div>
            <div class="weather-details">
                <div class="weather-detail-item">
                    <div class="weather-detail-label">Gefühlt</div>
                    <div class="weather-detail-value">${data.feels_like}°C</div>
                </div>
                <div class="weather-detail-item">
                    <div class="weather-detail-label">Luftfeuchtigkeit</div>
                    <div class="weather-detail-value">${data.humidity}%</div>
                </div>
                <div class="weather-detail-item">
                    <div class="weather-detail-label">Windgeschwindigkeit</div>
                    <div class="weather-detail-value">${data.wind_speed} m/s</div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading weather:', error);
        document.getElementById('weatherContent').innerHTML = 
            `<p class="error-message">Fehler beim Laden der Wetterdaten: ${error.message}</p>`;
    }
}

// Upload ICS File
async function uploadICS() {
    const fileInput = document.getElementById('icsFile');
    const file = fileInput.files[0];
    
    if (!file) {
        return;
    }
    
    if (!file.name.endsWith('.ics')) {
        alert('Bitte wählen Sie eine ICS-Datei aus.');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('ICS-Datei erfolgreich hochgeladen!');
            // Reload timetable data
            loadTimetable();
        } else {
            alert(`Fehler: ${data.error}`);
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        alert('Fehler beim Hochladen der Datei.');
    }
    
    // Clear file input
    fileInput.value = '';
}

// Helper function to format date/time
function formatDateTime(startDate, endDate) {
    const dateOptions = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    const timeOptions = { 
        hour: '2-digit', 
        minute: '2-digit' 
    };
    
    const dateStr = startDate.toLocaleDateString('de-DE', dateOptions);
    const startTimeStr = startDate.toLocaleTimeString('de-DE', timeOptions);
    
    if (endDate) {
        const endTimeStr = endDate.toLocaleTimeString('de-DE', timeOptions);
        return `${dateStr}, ${startTimeStr} - ${endTimeStr}`;
    } else {
        return `${dateStr}, ${startTimeStr}`;
    }
}

// Initialize data on page load
document.addEventListener('DOMContentLoaded', function() {
    loadTimetable();
    loadWeather();
    
    // Refresh data periodically
    setInterval(loadTimetable, 5 * 60 * 1000); // Every 5 minutes
    setInterval(loadWeather, 10 * 60 * 1000);  // Every 10 minutes
});
