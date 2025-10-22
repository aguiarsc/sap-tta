# SAP SuccessFactors Time Tracking Automation

Automates time entry in SAP SuccessFactors with TOTP authentication. Automatically detects weekday type and filters events based on current time.

## Features

- Automatic day detection (Friday vs regular schedule)
- Smart filtering: only creates past/present events
- TOTP authentication
- Robust navigation with direct URL fallback

## Quick Start

```bash
# Install dependencies
pnpm install

# Configure credentials
cp .env.example .env
# Edit .env with your credentials

# Validate configuration
pnpm validate

# Run
pnpm start
```

## Configuration

### Environment Variables (.env)

```env
SAP_USERNAME=your.email@company.com
SAP_PASSWORD=your_password
TOTP_SECRET=your_totp_secret
SAP_USER_ID=your_user_id
CHROME_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe
HEADLESS=true
```

**Chrome paths by OS:**
- Windows: `C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`
- Linux: `/usr/bin/google-chrome`
- macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`

**Getting SAP_USER_ID:** Navigate to your timesheet and copy the ID from the URL: `https://.../timerecords/YOUR_USER_ID/2025-10-22`

**Note:** The SAP URL is configured in `config.json` and is the same for all users in your organization.

### Schedules (config.json)

```json
{
  "schedules": {
    "friday": [
      { "time": "08:00", "type": "Entrada" },
      { "time": "14:00", "type": "Salida" }
    ],
    "regular": [
      { "time": "08:00", "type": "Entrada" },
      { "time": "14:00", "type": "Salida" },
      { "time": "14:45", "type": "Entrada" },
      { "time": "17:30", "type": "Salida" }
    ]
  }
}
```

**Event types:** Use `"Entrada"` for clock-in and `"Salida"` for clock-out (Spanish terms required by SAP).

## Usage

### Manual Execution

```bash
pnpm start
```

### Smart Behavior

The script only creates events that have already occurred:
- **9:00 AM**: Creates only 8:00 clock-in
- **4:00 PM**: Creates 8:00 clock-in, 2:00 PM clock-out, 2:45 PM clock-in (skips 5:30 PM)
- **6:00 PM**: Creates all events for the day

**Recommendation:** Schedule for 6:00 PM to ensure all events are created.

### Automated Execution

**Windows Task Scheduler:**
1. Open Task Scheduler
2. Create basic task with daily trigger at 6:00 PM
3. Action: Start program `node` with arguments `C:\path\to\project\dist\index.js`

**Linux/macOS Cron:**
```bash
crontab -e
# Add: 0 18 * * 1-5 cd /path/to/project && node dist/index.js >> /var/log/autoclock.log 2>&1
```

## Debug Mode

Set `HEADLESS=false` in `.env` to see the browser in action.