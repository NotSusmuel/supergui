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

// Countdown Timer
let nextLessonStartTime = null;
let currentLessonEndTime = null;

function updateCountdown() {
    // Update next lesson countdown
    if (nextLessonStartTime) {
        const now = new Date();
        const diff = nextLessonStartTime - now;
        
        if (diff <= 0) {
            // Lesson has started or passed
            const countdownDiv = document.getElementById('lessonCountdown');
            if (countdownDiv) {
                countdownDiv.textContent = 'Lektion beginnt jetzt!';
            }
        } else {
            // Calculate time remaining
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            // Format countdown
            let countdownText = 'Beginnt in ';
            if (days > 0) {
                countdownText += `${days}d ${hours}h ${minutes}m`;
            } else if (hours > 0) {
                countdownText += `${hours}h ${minutes}m ${seconds}s`;
            } else if (minutes > 0) {
                countdownText += `${minutes}m ${seconds}s`;
            } else {
                countdownText += `${seconds}s`;
            }
            
            const countdownDiv = document.getElementById('lessonCountdown');
            if (countdownDiv) {
                countdownDiv.textContent = countdownText;
            }
        }
    }
    
    // Update current lesson end countdown
    if (currentLessonEndTime) {
        const now = new Date();
        const diff = currentLessonEndTime - now;
        
        if (diff <= 0) {
            // Lesson has ended
            const endCountdownDiv = document.getElementById('currentLessonEndCountdown');
            if (endCountdownDiv) {
                endCountdownDiv.textContent = 'Lektion ist zu Ende!';
            }
        } else {
            // Calculate time remaining
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            // Format countdown
            let countdownText = 'Endet in ';
            if (hours > 0) {
                countdownText += `${hours}h ${minutes}m ${seconds}s`;
            } else if (minutes > 0) {
                countdownText += `${minutes}m ${seconds}s`;
            } else {
                countdownText += `${seconds}s`;
            }
            
            const endCountdownDiv = document.getElementById('currentLessonEndCountdown');
            if (endCountdownDiv) {
                endCountdownDiv.textContent = countdownText;
            }
        }
    }
}

// Update countdown every second
setInterval(updateCountdown, 1000);

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

// Update Current Lesson OneNote Link
function updateCurrentNotebook(currentLesson) {
    const notebookDiv = document.getElementById('currentNotebook');
    
    if (!currentLesson) {
        // No current lesson
        notebookDiv.innerHTML = `
            <div class="no-lesson">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.5">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <p>Gerade kein Unterricht</p>
            </div>
        `;
        // Clear current lesson end time
        currentLessonEndTime = null;
        return;
    }
    
    const subject = currentLesson.subject;
    const onenoteLink = currentLesson.onenote_link;
    
    // Set current lesson end time for countdown
    if (currentLesson.end) {
        currentLessonEndTime = new Date(currentLesson.end);
    }
    
    if (!onenoteLink) {
        // No notebook for this subject
        notebookDiv.innerHTML = `
            <div class="no-notebook">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.5">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                </svg>
                <p class="current-subject">${subject}</p>
                <p class="no-notebook-text">Fach hat kein Notizbuch</p>
                <div class="lesson-countdown" id="currentLessonEndCountdown">Berechne...</div>
            </div>
        `;
        // Trigger countdown update
        updateCountdown();
        return;
    }
    
    // Has a notebook link
    notebookDiv.innerHTML = `
        <div class="has-notebook">
            <p class="current-subject-small">Aktuelles Fach:</p>
            <p class="current-subject">${subject}</p>
            <div class="lesson-countdown" id="currentLessonEndCountdown">Berechne...</div>
            <button class="notebook-btn" onclick="window.location.href='${onenoteLink}'">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h17c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM7 17V7h3v10H7zm12 0h-9V7h9v10z"/>
                </svg>
                Notizbuch öffnen
            </button>
        </div>
    `;
    // Trigger countdown update
    updateCountdown();
}

// Load Timetable Data
async function loadTimetable() {
    try {
        // Always use auto mode now (manual upload removed)
        const response = await fetch(`/api/timetable?mode=auto`);
        const data = await response.json();
        
        // Update Current Lesson OneNote Link
        updateCurrentNotebook(data.current_lesson);
        
        // Display next lesson
        const nextLessonDiv = document.getElementById('nextLesson');
        
        if (data.message) {
            nextLessonDiv.innerHTML = `<p class="no-data">${data.message}</p>`;
            nextLessonStartTime = null;
        } else if (data.next_lesson) {
            const lesson = data.next_lesson;
            
            // Set the next lesson start time for countdown
            nextLessonStartTime = new Date(lesson.start);
            
            const timeString = formatDateTime(lesson.start, lesson.end);
            
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
                <div class="lesson-title">${lesson.summary}</div>
                ${locationHtml}
                <div class="lesson-time">${timeString}</div>
                <div class="lesson-countdown" id="lessonCountdown">Berechne...</div>
                ${lesson.description ? `<div class="lesson-description">${lesson.description}</div>` : ''}
                ${specialBadge}
            `;
            nextLessonDiv.className = `lesson-info ${cancelledClass}`;
            
            // Trigger initial countdown update
            updateCountdown();
        } else {
            nextLessonDiv.innerHTML = `<p class="no-data">Keine kommenden Lektionen gefunden.</p>`;
            nextLessonStartTime = null;
        }
        
        // Display today's lessons
        const todaysListDiv = document.getElementById('todaysLessonsList');
        
        if (data.todays_lessons && data.todays_lessons.length > 0) {
            todaysListDiv.innerHTML = data.todays_lessons.map(lesson => {
                // Extract times directly from ISO strings
                const startTime = extractTimeFromISO(lesson.start);
                const endTime = lesson.end ? extractTimeFromISO(lesson.end) : '';
                const timeString = endTime ? `${startTime} - ${endTime}` : startTime;
                
                const locationHtml = lesson.location ? 
                    `<span class="lesson-location-inline">${lesson.location}</span>` : '';
                
                const examBadge = lesson.is_exam ? 
                    `<span class="exam-badge-inline">(Prüfung)</span>` : '';
                
                return `
                    <div class="today-lesson-item">
                        <span class="today-time">${timeString}</span>
                        <span class="today-subject">${lesson.summary}</span>
                        ${locationHtml}
                        ${examBadge}
                    </div>
                `;
            }).join('');
        } else {
            todaysListDiv.innerHTML = `<p class="no-data">Keine Lektionen für heute.</p>`;
        }
        
        // Display exams
        const examsListDiv = document.getElementById('examsList');
        
        if (data.exams && data.exams.length > 0) {
            examsListDiv.innerHTML = data.exams.map(exam => {
                const timeString = formatDateTime(exam.start, exam.end);
                
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
            examsListDiv.innerHTML = `<p class="no-data">Keine kommenden Prüfungen.</p>`;
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

// Helper function to extract time from ISO string without timezone conversion
function extractTimeFromISO(isoString) {
    // Extract time portion from ISO string like "2025-11-14T08:00:00+01:00"
    // We want to keep the 08:00 part as-is
    const match = isoString.match(/T(\d{2}):(\d{2})/);
    if (match) {
        return `${match[1]}:${match[2]}`;
    }
    return '';
}

// Helper function to format date/time from ISO strings
function formatDateTime(startISO, endISO) {
    // Parse the date portion for display
    const startDate = new Date(startISO);
    
    const dateOptions = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    
    const dateStr = startDate.toLocaleDateString('de-DE', dateOptions);
    const startTimeStr = extractTimeFromISO(startISO);
    
    if (endISO) {
        const endTimeStr = extractTimeFromISO(endISO);
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
