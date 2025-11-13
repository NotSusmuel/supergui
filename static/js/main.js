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
const oneNoteLinks = {
    'Mathematik': 'onenote:https://example.com/math-notebook',
    'Deutsch': 'onenote:https://example.com/german-notebook',
    'Englisch': 'onenote:https://example.com/english-notebook',
    'Physik': 'onenote:https://example.com/physics-notebook',
    'Chemie': 'onenote:https://example.com/chemistry-notebook',
    'Biologie': 'onenote:https://example.com/biology-notebook',
    'Geschichte': 'onenote:https://example.com/history-notebook',
    'Geographie': 'onenote:https://example.com/geography-notebook',
    'Informatik': 'onenote:https://example.com/cs-notebook',
    'default': {
        'school': 'onenote:https://example.com/school-notebook',
        'personal': 'onenote:https://example.com/personal-notebook',
        'projects': 'onenote:https://example.com/projects-notebook'
    }
};

function updateOneNoteLinks(subject) {
    // This function could dynamically update OneNote button text or links
    // based on the current subject
    console.log('Current subject:', subject);
}

function openOneNote(type) {
    // Check if it's a direct subject link or a default category
    let link = oneNoteLinks.default[type];
    
    if (link) {
        // For actual OneNote links, use the onenote: protocol
        // Note: This requires OneNote to be installed on the desktop
        window.location.href = link;
        
        // Alternatively, show a message with configuration instructions
        // alert(`OneNote Link für "${type}" würde hier geöffnet.\n\nBitte konfigurieren Sie Ihre OneNote-Links in der JavaScript-Datei (main.js).`);
    }
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
            
            // Extract subject from summary (usually before any special characters)
            const subject = lesson.summary.split(/[-–]/)[0].trim();
            
            let specialBadge = '';
            if (lesson.special_note) {
                let badgeClass = 'cancelled';
                if (lesson.special_note.includes('Verschoben')) {
                    badgeClass = 'moved';
                } else if (lesson.special_note.includes('Raumwechsel')) {
                    badgeClass = 'room-change';
                }
                specialBadge = `<span class="special-badge ${badgeClass}">${lesson.special_note}</span>`;
            }
            
            const locationHtml = lesson.location ? 
                `<div class="lesson-location">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    ${lesson.location}
                </div>` : '';
            
            const cancelledClass = lesson.is_cancelled ? 'cancelled' : '';
            
            nextLessonDiv.innerHTML = `
                <div class="lesson-info ${cancelledClass}">
                    <div class="lesson-title">${lesson.summary}</div>
                    ${locationHtml}
                    <div class="lesson-time">${timeString}</div>
                    ${lesson.description ? `<div class="lesson-description">${lesson.description}</div>` : ''}
                    ${specialBadge}
                </div>
            `;
            
            // Update OneNote buttons based on subject
            updateOneNoteLinks(subject);
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
                
                const locationHtml = exam.location ? 
                    `<div class="exam-location">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                        ${exam.location}
                    </div>` : '';
                
                let specialBadge = '';
                if (exam.special_note) {
                    let badgeClass = 'moved';
                    if (exam.special_note.includes('Raumwechsel')) {
                        badgeClass = 'room-change';
                    }
                    specialBadge = `<span class="special-badge ${badgeClass}">${exam.special_note}</span>`;
                }
                
                return `
                    <div class="exam-item">
                        <div class="exam-title">${exam.summary}</div>
                        ${locationHtml}
                        <div class="exam-time">${timeString}</div>
                        ${exam.description ? `<div class="exam-description">${exam.description}</div>` : ''}
                        ${specialBadge}
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
