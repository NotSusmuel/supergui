# Automatic Startup Guide for SuperGUI

This guide explains how to configure SuperGUI to automatically run in the background on system startup for different operating systems.

---

## Table of Contents
- [Windows](#windows)
- [macOS](#macos)
- [Linux (systemd)](#linux-systemd)
- [Verification](#verification)

---

## Windows

### Method 1: Task Scheduler (Recommended)

1. **Create a Batch Script**
   
   Create a file named `start_supergui.bat` in the SuperGUI directory:
   ```batch
   @echo off
   cd /d "%~dp0"
   python app.py
   ```

2. **Open Task Scheduler**
   - Press `Win + R`, type `taskschd.msc`, press Enter
   - Click "Create Basic Task" in the right panel

3. **Configure the Task**
   - **Name**: SuperGUI Dashboard
   - **Description**: Automatically starts SuperGUI on login
   - **Trigger**: When I log on
   - **Action**: Start a program
   - **Program/script**: Browse to your `start_supergui.bat` file
   - **Start in**: Enter the full path to your SuperGUI directory

4. **Advanced Settings**
   - Check "Run whether user is logged on or not" (optional)
   - Check "Run with highest privileges" (optional)
   - Uncheck "Stop the task if it runs longer than"

### Method 2: Startup Folder

1. **Create Shortcut**
   - Right-click `start_supergui.bat` → "Create shortcut"

2. **Move to Startup Folder**
   - Press `Win + R`, type `shell:startup`, press Enter
   - Move the shortcut to this folder

3. **Configure Shortcut (Optional)**
   - Right-click shortcut → Properties
   - Set "Run" to "Minimized" to hide the console window

---

## macOS

### Method 1: LaunchAgent (Recommended)

1. **Create a plist file**
   
   Create `~/Library/LaunchAgents/com.supergui.dashboard.plist`:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
       <key>Label</key>
       <string>com.supergui.dashboard</string>
       <key>ProgramArguments</key>
       <array>
           <string>/usr/local/bin/python3</string>
           <string>/full/path/to/supergui/app.py</string>
       </array>
       <key>WorkingDirectory</key>
       <string>/full/path/to/supergui</string>
       <key>RunAtLoad</key>
       <true/>
       <key>KeepAlive</key>
       <true/>
       <key>StandardOutPath</key>
       <string>/tmp/supergui.log</string>
       <key>StandardErrorPath</key>
       <string>/tmp/supergui.err</string>
   </dict>
   </plist>
   ```

2. **Update Paths**
   - Replace `/full/path/to/supergui` with your actual path
   - Find Python path: `which python3`

3. **Load the Service**
   ```bash
   launchctl load ~/Library/LaunchAgents/com.supergui.dashboard.plist
   ```

4. **Enable at Login**
   ```bash
   launchctl enable gui/$(id -u)/com.supergui.dashboard
   ```

### Method 2: Login Items

1. **Create Application Script**
   - Open "Script Editor"
   - Paste:
     ```applescript
     do shell script "cd /full/path/to/supergui && /usr/local/bin/python3 app.py"
     ```
   - Save as Application: `SuperGUI.app`

2. **Add to Login Items**
   - System Preferences → Users & Groups → Login Items
   - Click "+" and add `SuperGUI.app`
   - Check "Hide" to run in background

---

## Linux (systemd)

### Method 1: User Service (Recommended)

1. **Create Service File**
   
   Create `~/.config/systemd/user/supergui.service`:
   ```ini
   [Unit]
   Description=SuperGUI Dashboard
   After=network.target

   [Service]
   Type=simple
   WorkingDirectory=/full/path/to/supergui
   ExecStart=/usr/bin/python3 /full/path/to/supergui/app.py
   Restart=always
   RestartSec=10

   # Environment variables
   Environment="FLASK_ENV=production"
   Environment="OPENWEATHER_API_KEY=d17171ee9448bce13619200a03aa5a02"

   # Logging
   StandardOutput=journal
   StandardError=journal

   [Install]
   WantedBy=default.target
   ```

2. **Update Paths**
   - Replace `/full/path/to/supergui` with your actual path
   - Update Python path if needed: `which python3`

3. **Reload systemd**
   ```bash
   systemctl --user daemon-reload
   ```

4. **Enable and Start Service**
   ```bash
   systemctl --user enable supergui.service
   systemctl --user start supergui.service
   ```

5. **Enable Lingering (Optional)**
   
   To run even when not logged in:
   ```bash
   sudo loginctl enable-linger $USER
   ```

### Method 2: System Service (Root)

1. **Create Service File**
   
   Create `/etc/systemd/system/supergui.service`:
   ```ini
   [Unit]
   Description=SuperGUI Dashboard
   After=network.target

   [Service]
   Type=simple
   User=yourusername
   WorkingDirectory=/full/path/to/supergui
   ExecStart=/usr/bin/python3 /full/path/to/supergui/app.py
   Restart=always
   RestartSec=10

   Environment="FLASK_ENV=production"
   Environment="OPENWEATHER_API_KEY=d17171ee9448bce13619200a03aa5a02"

   StandardOutput=journal
   StandardError=journal

   [Install]
   WantedBy=multi-user.target
   ```

2. **Enable and Start**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable supergui.service
   sudo systemctl start supergui.service
   ```

### Method 3: Crontab (Simple Alternative)

1. **Edit Crontab**
   ```bash
   crontab -e
   ```

2. **Add Entry**
   ```cron
   @reboot cd /full/path/to/supergui && /usr/bin/python3 app.py >> /tmp/supergui.log 2>&1 &
   ```

---

## Verification

### Check if Service is Running

**Windows (Task Scheduler):**
```cmd
tasklist | findstr python
```

**macOS:**
```bash
launchctl list | grep supergui
# Or check process
ps aux | grep app.py
```

**Linux (systemd):**
```bash
# User service
systemctl --user status supergui.service

# System service
sudo systemctl status supergui.service

# View logs
journalctl --user -u supergui.service -f
```

### Access the Dashboard

Open your browser and navigate to:
```
http://localhost:5000
```

### Check Logs

**Windows:**
- Console output if running in foreground
- Check Event Viewer for Task Scheduler errors

**macOS (LaunchAgent):**
```bash
tail -f /tmp/supergui.log
tail -f /tmp/supergui.err
```

**Linux (systemd):**
```bash
# User service
journalctl --user -u supergui.service -n 50

# System service
sudo journalctl -u supergui.service -n 50
```

---

## Troubleshooting

### Service Won't Start

1. **Check Python Path**
   ```bash
   which python3  # Linux/macOS
   where python   # Windows
   ```

2. **Test Manual Start**
   ```bash
   cd /path/to/supergui
   python3 app.py
   ```

3. **Check Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Verify Permissions**
   ```bash
   ls -la /path/to/supergui  # Linux/macOS
   ```

### Port Already in Use

If port 5000 is occupied, modify `app.py`:
```python
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)
```

### Environment Variables Not Working

**Linux systemd:** Add to service file:
```ini
[Service]
EnvironmentFile=/path/to/supergui/.env
```

**Windows:** Set in batch script:
```batch
@echo off
set FLASK_ENV=production
set OPENWEATHER_API_KEY=d17171ee9448bce13619200a03aa5a02
cd /d "%~dp0"
python app.py
```

---

## Stopping/Disabling Autostart

### Windows
- Task Scheduler: Right-click task → Disable/Delete
- Startup Folder: Delete the shortcut

### macOS
```bash
launchctl unload ~/Library/LaunchAgents/com.supergui.dashboard.plist
launchctl disable gui/$(id -u)/com.supergui.dashboard
```

### Linux
```bash
# User service
systemctl --user stop supergui.service
systemctl --user disable supergui.service

# System service
sudo systemctl stop supergui.service
sudo systemctl disable supergui.service
```

---

## Security Notes

⚠️ **Important Security Considerations:**

1. **API Keys**: Never commit `.env` files with API keys to Git
2. **Firewall**: By default, Flask binds to `0.0.0.0` which is accessible from network
3. **Production Mode**: Always set `FLASK_ENV=production` for autostart
4. **HTTPS**: Consider using HTTPS in production (see DEPLOYMENT.md)

---

## Additional Resources

- [Flask Deployment Options](https://flask.palletsprojects.com/en/latest/deploying/)
- [systemd Documentation](https://www.freedesktop.org/software/systemd/man/systemd.service.html)
- [Windows Task Scheduler Guide](https://docs.microsoft.com/en-us/windows/win32/taskschd/task-scheduler-start-page)
- [macOS LaunchAgent Documentation](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html)

---

**Need Help?**
If you encounter issues, check the logs first and ensure all paths are absolute (not relative).
