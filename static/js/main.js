// Language and Notification Support
let currentLanguage = 'de';
let translations = {};
let notificationsEnabled = false;
let notifiedExams = new Set();

// Load translations
async function loadTranslations(lang) {
    try {
        const response = await fetch(`/static/lang/${lang}.json`);
        translations = await response.json();
        currentLanguage = lang;
        updatePageLanguage();
        localStorage.setItem('language', lang);
    } catch (error) {
        console.error('Error loading translations:', error);
    }
}

// Update all text on page
function updatePageLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[key]) {
            if (element.tagName === 'INPUT') {
                element.placeholder = translations[key];
            } else {
                element.textContent = translations[key];
            }
        }
    });
    
    // Update date format based on language
    updateClock();
}

// Toggle language
function toggleLanguage() {
    const newLang = currentLanguage === 'de' ? 'en' : 'de';
    loadTranslations(newLang);
    document.getElementById('currentLang').textContent = newLang.toUpperCase();
}

// Toggle notifications
function toggleNotifications() {
    notificationsEnabled = !notificationsEnabled;
    const btn = document.querySelector('.notify-btn');
    
    if (notificationsEnabled) {
        btn.classList.add('active');
        requestNotificationPermission();
        localStorage.setItem('notifications', 'enabled');
    } else {
        btn.classList.remove('active');
        localStorage.setItem('notifications', 'disabled');
    }
}

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Show notification
function showNotification(title, message) {
    if (!notificationsEnabled) return;
    
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: '/static/favicon.ico',
            badge: '/static/favicon.ico'
        });
    }
    
    // Toast notification
    showToast(title, message);
    
    // Play sound
    const audio = document.getElementById('notificationSound');
    if (audio) {
        audio.play().catch(() => {});
    }
}

// Show toast notification
function showToast(title, message) {
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Check for upcoming exams and notify
function checkExamNotifications(exams) {
    if (!notificationsEnabled || !exams) return;
    
    const now = new Date();
    exams.forEach(exam => {
        const examDate = new Date(exam.start);
        const daysDiff = Math.floor((examDate - now) / (1000 * 60 * 60 * 24));
        const examKey = `${exam.summary}-${exam.start}`;
        
        // Notify 7 days, 3 days, 1 day, and 1 hour before
        if (!notifiedExams.has(examKey)) {
            if (daysDiff === 7 || daysDiff === 3 || daysDiff === 1) {
                const daysText = translations.days || 'd';
                showNotification(
                    translations.exam_notification || 'Prüfung in',
                    `${exam.summary} ${translations.starts_in || 'in'} ${daysDiff}${daysText}`
                );
                notifiedExams.add(examKey);
            }
        }
    });
}

// Clock Update
function updateClock() {
    const now = new Date();
    
    // Format time (HH:MM:SS)
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeString = `${hours}:${minutes}:${seconds}`;
    
    // Format date based on language
    const locale = currentLanguage === 'de' ? 'de-DE' : 'en-US';
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dateString = now.toLocaleDateString(locale, options);
    
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
        // No current lesson - use same card style as next lesson
        notebookDiv.innerHTML = `
            <div class="lesson-card current-lesson-card">
                <div class="lesson-status">Gerade kein Unterricht</div>
            </div>
        `;
        // Clear current lesson end time
        currentLessonEndTime = null;
        return;
    }
    
    const subject = currentLesson.subject;
    const onenoteLink = currentLesson.onenote_link;
    const location = currentLesson.location || '';
    
    // Set current lesson end time for countdown
    if (currentLesson.end) {
        currentLessonEndTime = new Date(currentLesson.end);
        currentLessonEndTimeForRefresh = new Date(currentLesson.end);
    }
    
    const locationHtml = location ? 
        `<div class="lesson-location">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            ${location}
        </div>` : '';
    
    if (!onenoteLink) {
        // No notebook for this subject - card style
        notebookDiv.innerHTML = `
            <div class="lesson-card current-lesson-card">
                <div class="lesson-title">${subject}</div>
                ${locationHtml}
                <div class="lesson-countdown" id="currentLessonEndCountdown">Berechne...</div>
                <p class="no-notebook-text">Fach hat kein Notizbuch</p>
            </div>
        `;
        // Trigger countdown update
        updateCountdown();
        return;
    }
    
    // Has a notebook link - card style
    notebookDiv.innerHTML = `
        <div class="lesson-card current-lesson-card">
            <div class="lesson-title">${subject}</div>
            ${locationHtml}
            <div class="lesson-countdown" id="currentLessonEndCountdown">Berechne...</div>
            <button class="notebook-btn" onclick="window.location.href='${onenoteLink}'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h17c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM7 17V7h3v10H7zm12 0h-9V7h9v10z"/>
                </svg>
                Notizbuch öffnen
            </button>
        </div>
    `;
    // Trigger countdown update
    updateCountdown();
}

// Track when next lesson starts for auto-refresh
let nextLessonStartTimeForRefresh = null;
let currentLessonEndTimeForRefresh = null;
let autoRefreshInterval = null;

// Load Timetable Data
async function loadTimetable(useFastLoad = false) {
    try {
        let response, data;
        
        if (useFastLoad) {
            // Fast initial load with static minimal data
            response = await fetch('/static/fast_timetable.json');
            data = await response.json();
            
            // Start background fetch for real data
            setTimeout(() => loadTimetable(false), 100);
        } else {
            // Full load from API
            response = await fetch(`/api/timetable?mode=auto`);
            data = await response.json();
        }
        
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
            nextLessonStartTimeForRefresh = new Date(lesson.start);
            
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
                <div class="lesson-card next-lesson-card ${cancelledClass}">
                    <div class="lesson-title">${lesson.summary}</div>
                    ${locationHtml}
                    <div class="lesson-countdown" id="lessonCountdown">Berechne...</div>
                    ${lesson.description ? `<div class="lesson-description">${lesson.description}</div>` : ''}
                    ${specialBadge}
                </div>
            `;
            nextLessonDiv.className = 'lesson-info compact';
            
            // Trigger initial countdown update
            updateCountdown();
        } else {
            nextLessonDiv.innerHTML = `<p class="no-data">Keine kommenden Lektionen gefunden.</p>`;
            nextLessonStartTime = null;
            nextLessonStartTimeForRefresh = null;
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
        
        // Check for exam notifications
        checkExamNotifications(data.exams);
        
        // Setup auto-refresh when lesson starts/ends
        setupAutoRefresh();
        
    } catch (error) {
        console.error('Error loading timetable:', error);
        document.getElementById('nextLesson').innerHTML = 
            `<p class="error-message">Fehler beim Laden des Stundenplans: ${error.message}</p>`;
        document.getElementById('examsList').innerHTML = 
            `<p class="error-message">Fehler beim Laden der Prüfungen</p>`;
    }
}

// Setup auto-refresh when lesson starts or ends
function setupAutoRefresh() {
    // Clear existing interval
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
    
    // Check every second if we need to refresh
    autoRefreshInterval = setInterval(() => {
        const now = new Date();
        
        // Refresh when next lesson starts (becomes current lesson)
        if (nextLessonStartTimeForRefresh && now >= nextLessonStartTimeForRefresh) {
            console.log('Next lesson started - refreshing timetable');
            loadTimetable(false);
            nextLessonStartTimeForRefresh = null;
        }
        
        // Refresh when current lesson ends
        if (currentLessonEndTimeForRefresh && now >= currentLessonEndTimeForRefresh) {
            console.log('Current lesson ended - refreshing timetable');
            loadTimetable(false);
            currentLessonEndTimeForRefresh = null;
        }
    }, 1000); // Check every second
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

// Weekly View Functions
let weeklyViewOpen = false;

async function toggleWeeklyView() {
    const modal = document.getElementById('weeklyModal');
    
    if (!weeklyViewOpen) {
        // Open modal and load data
        modal.style.display = 'block';
        weeklyViewOpen = true;
        document.body.style.overflow = 'hidden'; // Prevent scrolling
        
        // Update button text
        const btn = document.getElementById('showMoreBtn');
        const span = btn.querySelector('span');
        span.textContent = translations.show_less || 'Weniger anzeigen';
        
        await loadWeeklySchedule();
    } else {
        closeWeeklyView();
    }
}

function closeWeeklyView() {
    const modal = document.getElementById('weeklyModal');
    modal.style.display = 'none';
    weeklyViewOpen = false;
    document.body.style.overflow = ''; // Restore scrolling
    
    // Update button text
    const btn = document.getElementById('showMoreBtn');
    const span = btn.querySelector('span');
    span.textContent = translations.show_more || 'Mehr anzeigen';
}

async function loadWeeklySchedule() {
    const weeklyContent = document.getElementById('weeklyContent');
    weeklyContent.innerHTML = '<p class="loading">Lade Wochenübersicht...</p>';
    
    try {
        const response = await fetch('/api/weekly?mode=auto');
        const data = await response.json();
        
        if (data.message) {
            weeklyContent.innerHTML = `<p class="no-data">${data.message}</p>`;
            return;
        }
        
        if (!data.weekly_schedule || data.weekly_schedule.length === 0) {
            weeklyContent.innerHTML = '<p class="no-data">Keine Lektionen für diese Woche gefunden.</p>';
            return;
        }
        
        // Build HTML for weekly schedule
        let html = '<div class="weekly-days">';
        
        data.weekly_schedule.forEach(day => {
            // Format date more compactly for column view
            // Extract weekday and date from "Monday, 18. November 2025" format
            const dateParts = day.date.split(', ');
            const weekday = dateParts[0];
            const dateNum = dateParts[1] ? dateParts[1].split('.')[0] : '';
            const compactDate = dateNum ? `${weekday}<br>${dateNum}.` : weekday;
            
            html += `
                <div class="weekly-day">
                    <h3 class="weekly-day-header">${compactDate}</h3>
                    <div class="weekly-day-lessons">
            `;
            
            if (day.lessons.length === 0) {
                html += '<p class="no-lessons">Keine Lektionen</p>';
            } else {
                day.lessons.forEach(lesson => {
                    const startTime = extractTimeFromISO(lesson.start);
                    const endTime = lesson.end ? extractTimeFromISO(lesson.end) : '';
                    const timeString = endTime ? `${startTime} - ${endTime}` : startTime;
                    
                    const locationHtml = lesson.location ? 
                        `<span class="weekly-location">${lesson.location}</span>` : '';
                    
                    const examBadge = lesson.is_exam ? 
                        `<span class="weekly-exam-badge">Prüfung</span>` : '';
                    
                    const specialBadge = lesson.special_note ? 
                        `<span class="weekly-special-badge">${lesson.special_note}</span>` : '';
                    
                    const cancelledClass = lesson.is_cancelled ? 'weekly-lesson-cancelled' : '';
                    
                    html += `
                        <div class="weekly-lesson-item ${cancelledClass}">
                            <div class="weekly-lesson-time">${timeString}</div>
                            <div class="weekly-lesson-info">
                                <div class="weekly-lesson-title">${lesson.summary}</div>
                                <div class="weekly-lesson-meta">
                                    ${locationHtml}
                                    ${examBadge}
                                    ${specialBadge}
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
            
            html += `
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        weeklyContent.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading weekly schedule:', error);
        weeklyContent.innerHTML = `<p class="error-message">Fehler beim Laden der Wochenübersicht: ${error.message}</p>`;
    }
}

// AI Chat Functions
let aiChatOpen = false;
let aiConversationHistory = [];

function openAIChat() {
    const modal = document.getElementById('aiModal');
    modal.style.display = 'block';
    aiChatOpen = true;
    document.body.style.overflow = 'hidden';
    
    // Initialize with welcome message if empty
    const messagesDiv = document.getElementById('aiMessages');
    if (messagesDiv.children.length === 0) {
        addAIMessage('assistant', translations.ai_welcome || 'Hallo! Wie kann ich dir helfen? Ich kann Fragen zu deinem Stundenplan, Prüfungen und mehr beantworten.');
    }
    
    // Focus input
    document.getElementById('aiInput').focus();
}

function closeAIChat() {
    const modal = document.getElementById('aiModal');
    modal.style.display = 'none';
    aiChatOpen = false;
    document.body.style.overflow = '';
}

function addAIMessage(role, content) {
    const messagesDiv = document.getElementById('aiMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${role}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = 'ai-avatar';
    avatar.innerHTML = role === 'user' ? 
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>' :
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'ai-message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    messagesDiv.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function sendAIMessage() {
    const input = document.getElementById('aiInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    addAIMessage('user', message);
    input.value = '';
    
    // Show typing indicator
    const messagesDiv = document.getElementById('aiMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-message assistant-message typing-indicator';
    typingDiv.innerHTML = `
        <div class="ai-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
        </div>
        <div class="ai-message-content">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        </div>
    `;
    messagesDiv.appendChild(typingDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    try {
        // Send message to backend
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                history: aiConversationHistory
            })
        });
        
        const data = await response.json();
        
        // Remove typing indicator
        typingDiv.remove();
        
        if (data.error) {
            // Show detailed error message
            let errorMsg = data.error;
            if (data.response) {
                errorMsg = data.response; // Use the response field which has the German message
            }
            addAIMessage('assistant', errorMsg);
        } else if (data.response) {
            addAIMessage('assistant', data.response);
            
            // Update conversation history
            aiConversationHistory.push({
                role: 'user',
                content: message
            });
            aiConversationHistory.push({
                role: 'assistant',
                content: data.response
            });
            
            // Keep only last 10 messages to avoid token limits
            if (aiConversationHistory.length > 20) {
                aiConversationHistory = aiConversationHistory.slice(-20);
            }
        } else {
            addAIMessage('assistant', 'Entschuldigung, keine Antwort erhalten.');
        }
    } catch (error) {
        typingDiv.remove();
        console.error('Error sending AI message:', error);
        addAIMessage('assistant', 'Entschuldigung, es gab einen Verbindungsfehler. Bitte versuche es später erneut.');
    }
}

// Allow Enter to send message (Shift+Enter for new line)
document.addEventListener('DOMContentLoaded', function() {
    const aiInput = document.getElementById('aiInput');
    if (aiInput) {
        aiInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAIMessage();
            }
        });
    }
});

// Close modals when clicking outside
window.addEventListener('click', function(event) {
    const weeklyModal = document.getElementById('weeklyModal');
    const aiModal = document.getElementById('aiModal');
    
    if (event.target === weeklyModal) {
        closeWeeklyView();
    }
    if (event.target === aiModal) {
        closeAIChat();
    }
});

// Initialize data on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load saved language preference
    const savedLang = localStorage.getItem('language') || 'de';
    loadTranslations(savedLang);
    document.getElementById('currentLang').textContent = savedLang.toUpperCase();
    
    // Load notification preference
    const savedNotif = localStorage.getItem('notifications');
    if (savedNotif === 'enabled') {
        notificationsEnabled = true;
        document.querySelector('.notify-btn').classList.add('active');
    }
    
    // Use fast load for instant UI
    loadTimetable(true);
    loadWeather();
    
    // Refresh full data periodically (every 5 minutes)
    setInterval(() => loadTimetable(false), 5 * 60 * 1000);
    setInterval(loadWeather, 10 * 60 * 1000);  // Every 10 minutes
});

// ISY Authentication Functions
// =============================

let isyAuthenticated = false;
let isyUsername = null;

async function checkISYStatus() {
    try {
        const response = await fetch('/api/isy/status');
        const data = await response.json();
        
        isyAuthenticated = data.authenticated;
        isyUsername = data.username;
        
        updateISYButton();
        
        if (isyAuthenticated) {
            // Load messages if authenticated
            loadISYMessages();
            loadISYDashboardMessages();
        } else {
            // Clear dashboard messages if not authenticated
            const dashboardDiv = document.getElementById('isyDashboardMessages');
            if (dashboardDiv) {
                dashboardDiv.innerHTML = '<p class="info-message" data-i18n="isy_login_required">Bitte anmelden für Mitteilungen</p>';
            }
        }
    } catch (error) {
        console.error('Error checking ISY status:', error);
    }
}

function updateISYButton() {
    const btn = document.getElementById('isyBtn');
    if (isyAuthenticated) {
        btn.classList.add('active');
        btn.title = `ISY: ${isyUsername}`;
    } else {
        btn.classList.remove('active');
        btn.title = 'ISY Login';
    }
}

function toggleISYLogin() {
    const modal = document.getElementById('isyModal');
    if (modal.style.display === 'block') {
        closeISYLogin();
    } else {
        openISYLogin();
    }
}

function openISYLogin() {
    const modal = document.getElementById('isyModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    updateISYLoginUI();
}

function closeISYLogin() {
    const modal = document.getElementById('isyModal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

function updateISYLoginUI() {
    const statusDiv = document.getElementById('isyStatus');
    const loginBtn = document.querySelector('.isy-login-btn');
    const logoutBtn = document.querySelector('.isy-logout-btn');
    const usernameInput = document.getElementById('isyUsername');
    const passwordInput = document.getElementById('isyPassword');
    const messagesDiv = document.getElementById('isyMessages');
    
    if (isyAuthenticated) {
        statusDiv.innerHTML = `<p>✅ Angemeldet als: <strong>${isyUsername}</strong></p>`;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        usernameInput.disabled = true;
        passwordInput.disabled = true;
        messagesDiv.style.display = 'block';
    } else {
        statusDiv.innerHTML = '<p>Nicht angemeldet</p>';
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        usernameInput.disabled = false;
        passwordInput.disabled = false;
        messagesDiv.style.display = 'none';
    }
}

async function submitISYLogin() {
    const username = document.getElementById('isyUsername').value.trim();
    const password = document.getElementById('isyPassword').value;
    const staySignedIn = document.getElementById('isyStaySignedIn').checked;
    const errorDiv = document.getElementById('isyError');
    
    if (!username || !password) {
        errorDiv.textContent = 'Bitte Benutzername und Passwort eingeben';
        errorDiv.style.display = 'block';
        return;
    }
    
    errorDiv.style.display = 'none';
    
    // Disable button during login
    const loginBtn = document.querySelector('.isy-login-btn');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Anmelden...';
    
    try {
        const response = await fetch('/api/isy/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password,
                staySignedIn: staySignedIn
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            isyAuthenticated = true;
            isyUsername = data.username;
            
            // Clear password field
            document.getElementById('isyPassword').value = '';
            
            // Update UI
            updateISYButton();
            updateISYLoginUI();
            
            // Load messages
            loadISYMessages();
            
            showToast('ISY Login', 'Erfolgreich angemeldet!');
        } else {
            errorDiv.textContent = data.error || 'Anmeldung fehlgeschlagen';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('ISY login error:', error);
        errorDiv.textContent = 'Verbindungsfehler. Bitte später versuchen.';
        errorDiv.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Anmelden';
    }
}

async function submitISYLogout() {
    try {
        const response = await fetch('/api/isy/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            isyAuthenticated = false;
            isyUsername = null;
            
            // Clear form
            document.getElementById('isyUsername').value = '';
            document.getElementById('isyPassword').value = '';
            document.getElementById('isyStaySignedIn').checked = false;
            
            // Update UI
            updateISYButton();
            updateISYLoginUI();
            
            showToast('ISY Logout', 'Erfolgreich abgemeldet');
        }
    } catch (error) {
        console.error('ISY logout error:', error);
    }
}

async function loadISYMessages() {
    if (!isyAuthenticated) return;
    
    const messagesList = document.getElementById('isyMessagesList');
    messagesList.innerHTML = '<p class="loading">Lade Mitteilungen...</p>';
    
    try {
        const response = await fetch('/api/isy/messages');
        const data = await response.json();
        
        console.log('ISY Messages Response:', data);
        
        if (response.ok) {
            if (data.messages && data.messages.length > 0) {
                messagesList.innerHTML = data.messages.map(msg => {
                    const priorityText = ['Niedrig', 'Normal', 'Hoch', 'Dringend'][msg.priority] || 'Normal';
                    const priorityClass = ['low', 'normal', 'high', 'urgent'][msg.priority] || 'normal';
                    
                    let dateInfo = '';
                    if (msg.dtDue) {
                        dateInfo = `<div class="isy-message-date">📅 Fällig: ${new Date(msg.dtDue).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>`;
                    } else if (msg.visibleTo) {
                        dateInfo = `<div class="isy-message-date">📅 Bis: ${new Date(msg.visibleTo).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>`;
                    }
                    
                    const statusBadges = [];
                    if (msg.completed) {
                        statusBadges.push('<span class="isy-badge completed">✅ Erledigt</span>');
                    }
                    if (msg.readWhen) {
                        statusBadges.push('<span class="isy-badge read">👁️ Gelesen</span>');
                    }
                    if (msg.archivedWhen) {
                        statusBadges.push('<span class="isy-badge archived">📦 Archiviert</span>');
                    }
                    
                    return `
                        <div class="isy-message-item priority-${priorityClass}" data-message-id="${msg.id}">
                            <div class="isy-message-header">
                                <div class="isy-message-title">${msg.title || 'Keine Titel'}</div>
                                <div class="isy-message-priority priority-${priorityClass}">
                                    <span class="priority-dot"></span>${priorityText}
                                </div>
                            </div>
                            ${dateInfo}
                            ${msg.body ? `<div class="isy-message-body">${msg.body.substring(0, 200)}${msg.body.length > 200 ? '...' : ''}</div>` : ''}
                            ${statusBadges.length > 0 ? `<div class="isy-message-badges">${statusBadges.join('')}</div>` : ''}
                        </div>
                    `;
                }).join('');
            } else {
                messagesList.innerHTML = '<p class="no-data">Keine Mitteilungen vorhanden</p>';
            }
        } else {
            // Check if token expired
            if (data.login_required) {
                // Token expired - clear auth state and prompt re-login
                isyAuthenticated = false;
                localStorage.removeItem('isyAuthenticated');
                messagesList.innerHTML = '<p class="error-message">Sitzung abgelaufen - bitte erneut anmelden</p>';
                
                // Update UI to show login button
                const isyButton = document.getElementById('isyLoginBtn');
                if (isyButton) {
                    isyButton.textContent = translations[currentLanguage].isyLogin;
                    isyButton.classList.remove('authenticated');
                }
            } else {
                // Show error details for debugging
                const errorMsg = data.error || 'Fehler beim Laden der Mitteilungen';
                const errorDetail = data.message ? `<br><small>${data.message}</small>` : '';
                messagesList.innerHTML = `<p class="error-message">${errorMsg}${errorDetail}</p>`;
            }
            console.error('ISY messages error:', data);
        }
    } catch (error) {
        console.error('Error loading ISY messages:', error);
        messagesList.innerHTML = `<p class="error-message">Verbindungsfehler: ${error.message}</p>`;
    }
}

// Load dashboard messages (full archive) for the 5th column
async function loadISYDashboardMessages() {
    if (!isyAuthenticated) return;
    
    const dashboardDiv = document.getElementById('isyDashboardMessages');
    if (!dashboardDiv) return;
    
    dashboardDiv.innerHTML = '<p class="loading">Lade Mitteilungen...</p>';
    
    try {
        const response = await fetch('/api/isy/dashboard-messages');
        const data = await response.json();
        
        console.log('ISY Dashboard Messages Response:', data);
        
        if (response.ok) {
            if (data.messages && data.messages.length > 0) {
                // Show only first 10 messages for dashboard
                const displayMessages = data.messages.slice(0, 10);
                
                dashboardDiv.innerHTML = displayMessages.map(msg => {
                    const priorityText = ['Niedrig', 'Normal', 'Hoch', 'Dringend'][msg.priority] || 'Normal';
                    const priorityClass = ['low', 'normal', 'high', 'urgent'][msg.priority] || 'normal';
                    
                    let dateInfo = '';
                    if (msg.visibleTo) {
                        const date = new Date(msg.visibleTo);
                        dateInfo = `<div class="dashboard-msg-date">📅 ${date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</div>`;
                    }
                    
                    const readIndicator = msg.iHaveReadIt ? '' : '<span class="unread-dot">●</span>';
                    
                    return `
                        <div class="dashboard-message-item priority-${priorityClass}" data-message-id="${msg.id}" data-message-full='${JSON.stringify(msg).replace(/'/g, "&#39;")}' style="cursor: pointer;">
                            <div class="dashboard-msg-header">
                                <div class="dashboard-msg-title">
                                    ${readIndicator}
                                    ${msg.title}
                                </div>
                                <span class="dashboard-priority-dot ${priorityClass}"></span>
                            </div>
                            ${msg.author ? `<div class="dashboard-msg-author">👤 ${msg.author}</div>` : ''}
                            ${msg.previewText ? `<div class="dashboard-msg-preview">${msg.previewText.substring(0, 100)}${msg.previewText.length > 100 ? '...' : ''}</div>` : ''}
                            ${dateInfo}
                        </div>
                    `;
                }).join('');
                
                // Add click event listeners
                document.querySelectorAll('.dashboard-message-item').forEach(item => {
                    item.addEventListener('click', function() {
                        const msgData = JSON.parse(this.getAttribute('data-message-full').replace(/&#39;/g, "'"));
                        showMessageModal(msgData);
                    });
                });
            } else {
                dashboardDiv.innerHTML = '<p class="no-data">Keine Mitteilungen vorhanden</p>';
            }
        } else {
            // Check if token expired
            if (data.login_required) {
                // Token expired - clear auth state
                isyAuthenticated = false;
                localStorage.removeItem('isyAuthenticated');
                dashboardDiv.innerHTML = '<p class="error-message">Sitzung abgelaufen - bitte erneut anmelden</p>';
                
                // Update UI to show login button
                const isyButton = document.getElementById('isyLoginBtn');
                if (isyButton) {
                    isyButton.textContent = translations[currentLanguage].isyLogin;
                    isyButton.classList.remove('authenticated');
                }
            } else {
                const errorMsg = data.error || 'Fehler beim Laden';
                dashboardDiv.innerHTML = `<p class="error-message">${errorMsg}</p>`;
            }
            console.error('ISY dashboard messages error:', data);
        }
    } catch (error) {
        console.error('Error loading ISY dashboard messages:', error);
        dashboardDiv.innerHTML = `<p class="error-message">Verbindungsfehler: ${error.message}</p>`;
    }
}

// Show message modal with full details
async function showMessageModal(msg) {
    const modal = document.getElementById('messageModal');
    if (!modal) return;
    
    const priorityText = ['Niedrig', 'Normal', 'Hoch', 'Dringend'][msg.priority] || 'Normal';
    const priorityClass = ['low', 'normal', 'high', 'urgent'][msg.priority] || 'normal';
    
    // Show loading state
    modal.querySelector('.modal-content').innerHTML = `
        <div class="message-modal-header priority-${priorityClass}">
            <h2>${msg.title}</h2>
            <button class="close-btn" onclick="closeMessageModal()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </button>
        </div>
        <div class="message-modal-body">
            <div class="loading">Lade Nachricht...</div>
        </div>
    `;
    modal.style.display = 'flex';
    
    try {
        // Fetch full message details from API
        const response = await fetch(`/api/isy/message/${msg.id.split('/')[2]}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.message) {
            const fullMsg = data.message;
            
            let dateInfo = '';
            if (fullMsg.visibleTo) {
                const date = new Date(fullMsg.visibleTo);
                dateInfo = `Sichtbar bis: ${date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
            }
            
            const modalContent = `
                <div class="message-modal-header priority-${priorityClass}">
                    <h2>${fullMsg.calculatedExtendedTitle || fullMsg.title || msg.title}</h2>
                    <button class="close-btn" onclick="closeMessageModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
                <div class="message-modal-body">
                    <div class="message-meta">
                        ${fullMsg.primaryAuthor && fullMsg.primaryAuthor.person ? `<div class="message-author">👤 <strong>${fullMsg.primaryAuthor.person.firstname} ${fullMsg.primaryAuthor.person.lastname}</strong></div>` : ''}
                        ${dateInfo ? `<div class="message-date">📅 ${dateInfo}</div>` : ''}
                        <div class="message-priority">Priorität: <span class="priority-badge ${priorityClass}">${priorityText}</span></div>
                    </div>
                    <div class="message-content">
                        ${fullMsg.body || fullMsg.subject || msg.previewText || 'Kein Inhalt verfügbar'}
                    </div>
                </div>
            `;
            
            modal.querySelector('.modal-content').innerHTML = modalContent;
        } else {
            throw new Error(data.error || 'Fehler beim Laden der Nachricht');
        }
    } catch (error) {
        console.error('Error loading full message:', error);
        // Fallback to preview data
        let dateInfo = '';
        if (msg.visibleTo) {
            const date = new Date(msg.visibleTo);
            dateInfo = `Sichtbar bis: ${date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
        }
        
        const modalContent = `
            <div class="message-modal-header priority-${priorityClass}">
                <h2>${msg.title}</h2>
                <button class="close-btn" onclick="closeMessageModal()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
            <div class="message-modal-body">
                <div class="message-meta">
                    ${msg.author ? `<div class="message-author">👤 <strong>${msg.author}</strong></div>` : ''}
                    ${dateInfo ? `<div class="message-date">📅 ${dateInfo}</div>` : ''}
                    <div class="message-priority">Priorität: <span class="priority-badge ${priorityClass}">${priorityText}</span></div>
                </div>
                <div class="message-content">
                    ${msg.previewText || 'Kein Inhalt verfügbar'}
                </div>
            </div>
        `;
        
        modal.querySelector('.modal-content').innerHTML = modalContent;
    }
}

function closeMessageModal() {
    const modal = document.getElementById('messageModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Check ISY status on page load
document.addEventListener('DOMContentLoaded', function() {
    checkISYStatus();
    
    // Allow Enter key in ISY login form
    const isyPassword = document.getElementById('isyPassword');
    if (isyPassword) {
        isyPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                submitISYLogin();
            }
        });
    }
});
