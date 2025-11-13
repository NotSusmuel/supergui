# Deployment Guide

## Production Deployment mit Gunicorn

### 1. Gunicorn installieren

```bash
pip install gunicorn
```

### 2. Umgebungsvariablen setzen

Erstellen Sie eine `.env` Datei:

```env
FLASK_ENV=production
OPENWEATHER_API_KEY=ihr_echter_api_key
```

### 3. Anwendung starten

```bash
# Mit Gunicorn (empfohlen für Produktion)
gunicorn -w 4 -b 0.0.0.0:5000 app:app

# Oder mit mehreren Workern und Logging
gunicorn -w 4 -b 0.0.0.0:5000 --access-logfile - --error-logfile - app:app
```

## Docker Deployment (Optional)

### Dockerfile erstellen

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .

EXPOSE 5000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

### Docker Image bauen und starten

```bash
# Image bauen
docker build -t supergui .

# Container starten
docker run -d -p 5000:5000 \
  -e FLASK_ENV=production \
  -e OPENWEATHER_API_KEY=ihr_api_key \
  --name supergui-app \
  supergui
```

## Nginx Reverse Proxy (Optional)

### Nginx Konfiguration

```nginx
server {
    listen 80;
    server_name ihre-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static {
        alias /pfad/zu/supergui/static;
        expires 30d;
    }
}
```

## Systemd Service (Linux)

### Service Datei erstellen

`/etc/systemd/system/supergui.service`:

```ini
[Unit]
Description=SuperGUI Flask Application
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/pfad/zu/supergui
Environment="PATH=/pfad/zu/supergui/venv/bin"
Environment="FLASK_ENV=production"
Environment="OPENWEATHER_API_KEY=ihr_api_key"
ExecStart=/pfad/zu/supergui/venv/bin/gunicorn -w 4 -b 127.0.0.1:5000 app:app

[Install]
WantedBy=multi-user.target
```

### Service starten

```bash
sudo systemctl daemon-reload
sudo systemctl enable supergui
sudo systemctl start supergui
sudo systemctl status supergui
```

## Sicherheits-Checkliste

- [ ] `FLASK_ENV=production` gesetzt
- [ ] API-Keys in `.env` Datei (nicht im Code)
- [ ] Gunicorn oder anderer Production-Server verwendet
- [ ] Firewall konfiguriert
- [ ] HTTPS aktiviert (Let's Encrypt empfohlen)
- [ ] Regelmäßige Updates der Dependencies
- [ ] Backup-Strategie implementiert
- [ ] Monitoring eingerichtet

## Leistungsoptimierung

### Caching aktivieren

Fügen Sie in `app.py` hinzu:

```python
from flask_caching import Cache

cache = Cache(app, config={'CACHE_TYPE': 'simple'})

@app.route('/api/weather')
@cache.cached(timeout=600)  # Cache für 10 Minuten
def get_weather():
    # ... existing code
```

### Static Files mit CDN

Erwägen Sie die Verwendung eines CDN für statische Dateien in Produktion.

## Monitoring

### Logs überwachen

```bash
# Gunicorn Logs
tail -f /var/log/supergui/access.log
tail -f /var/log/supergui/error.log

# Systemd Logs
journalctl -u supergui -f
```

### Health Check Endpoint

Fügen Sie einen Health-Check-Endpoint hinzu:

```python
@app.route('/health')
def health():
    return jsonify({'status': 'healthy'}), 200
```
