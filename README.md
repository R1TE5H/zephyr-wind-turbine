# Zephyr Wind Turbine - Arduino to Next.js Integration

This project connects an Arduino-based wind turbine monitoring system to a Next.js web dashboard for real-time data visualization.

## Quick Start

```bash
# 1. Install PlatformIO
pip install -U platformio

# 2. Setup robot firmware
cd robot
pio run --target upload    # Builds, installs dependencies, and uploads to Arduino

# 3. Setup web dashboard
cd ../app
nvm use                    # Switch to Node 20
npm install                # Install dependencies
npm run dev                # Start server at http://localhost:3000

# 4. Connect in browser: Select Arduino port and click "Connect"
```

## Architecture

### Arduino Side

- **Hardware**: Arduino with multiple sensors
  - Hall Effect Sensor (RPM/revolutions)
  - Wind Sensor (speed and temperature)
  - Power Monitor (INA260 - voltage, current, power)
  - Load Cell (HX711 - force and torque)
  - OLED Display (SSD1306)

- **Communication**: Sends JSON-formatted sensor data over serial at 9600 baud, every 1 second

### Next.js Side

- **API Routes**:
  - `GET /api/serial/ports` - Lists available serial ports
  - `GET /api/serial/stream?port=/dev/tty...` - Opens SSE stream for real-time data

- **Dashboard**: React component with real-time sensor data display

## Prerequisites

- **Node.js**: Version 20.x (required for serialport native bindings)
  - Install via [nvm](https://github.com/nvm-sh/nvm) for easy version management
  - The project includes `.nvmrc` - run `nvm use` in the `app/` folder
- **PlatformIO**: For Arduino development and dependency management
  - Install via: `pip install -U platformio` or VS Code extension

## Setup Instructions

### 1. Arduino Setup

**Using PlatformIO (Recommended - like npm for Arduino):**

```bash
cd robot

# Install PlatformIO if not already installed
pip install -U platformio

# One command to install dependencies, build, and upload
pio run --target upload

# Open serial monitor to verify (Ctrl+C to exit)
pio device monitor
```

**Useful PlatformIO Commands:**

```bash
# List all connected devices
pio device list

# Only build (don't upload)
pio run

# Clean build files
pio run --target clean

# Update all libraries
pio lib update

# Manually specify upload port
pio run --target upload --upload-port /dev/tty.usbmodem14201
```

**Or manually via Arduino IDE:**

1. Install required libraries via Library Manager:
   - Adafruit GFX Library
   - Adafruit SSD1306
   - Adafruit HX711
   - Adafruit INA260 Library
   - Adafruit BusIO
2. Open `robot/main.ino`
3. Upload to your Arduino

### 2. Next.js Setup

```bash
cd app

# Switch to Node 20 (if using nvm)
nvm use

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:3000 in your browser

### 3. Connect to Arduino

1. In the dashboard, select your Arduino's serial port from the dropdown
2. Click "Connect"
3. Real-time sensor data will start appearing on the dashboard

## Data Format

The Arduino sends JSON data every second:

```json
{
  "timestamp": 12345,
  "hall": {
    "revs": 10,
    "rpm": 300
  },
  "wind": {
    "speed": 5.23,
    "temp": 22.5
  },
  "power": {
    "voltage": 5000.0,
    "current": 150.0,
    "power": 750.0
  },
  "load": {
    "force": 2.5,
    "torque": 0.25
  }
}
```

## Hardware Configuration

### Pin Assignments

| Component | Pin | Description |
|-----------|-----|-------------|
| Hall Sensor | D3 | Digital input for RPM measurement |
| Hall LED | D7 | Status indicator for hall effect |
| Wind Sensor Output | A2 | Analog wind speed reading |
| Temperature Sensor | A3 | Analog temperature reading |
| Wind Low LED | D6 | Wind speed warning indicator |
| Temp Low LED | D5 | Temperature warning indicator |
| HX711 Data | A0 | Load cell data line |
| HX711 Clock | A1 | Load cell clock line |
| I2C Display (SDA) | A4 | OLED display data |
| I2C Display (SCL) | A5 | OLED display clock |
| INA260 (SDA) | A4 | Power monitor data (shared I2C) |
| INA260 (SCL) | A5 | Power monitor clock (shared I2C) |

### Project Structure

```
sd/
├── app/                        # Next.js web dashboard
│   ├── app/
│   │   ├── api/
│   │   │   └── serial/        # Serial port API endpoints
│   │   │       ├── ports/     # List available ports
│   │   │       └── stream/    # SSE data stream
│   │   ├── components/
│   │   │   └── Dashboard.tsx  # Main UI component
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── package.json
│   ├── next.config.ts
│   └── .nvmrc               # Node version 20
│
├── robot/                     # Arduino firmware
│   ├── platformio.ini        # PlatformIO config (auto-installs deps)
│   ├── main.ino             # Main application
│   ├── DisplayManager.h/cpp  # OLED display management
│   ├── HallSensor.h/cpp     # RPM measurement
│   ├── WindSensor.h/cpp     # Wind speed/temperature
│   ├── LoadCellSensor.h/cpp # Force/torque measurement
│   └── PowerMonitor.h/cpp   # Voltage/current/power
│
└── INTEGRATION_README.md     # This file
```

## Troubleshooting

### Arduino/PlatformIO Issues

**Upload fails - port not found:**
```bash
# List available ports first
pio device list

# Then specify the port explicitly
pio run --target upload --upload-port /dev/tty.usbmodem14201
```

**Library installation errors:**
```bash
# Force reinstall all libraries
pio lib install --force

# Or clean and rebuild
pio run --target clean
pio run
```

**Permission denied on upload (macOS/Linux):**
```bash
# Option 1: Run with sudo (not recommended)
sudo pio run --target upload

# Option 2: Add user to dialout group (recommended)
sudo usermod -a -G dialout $USER
# Then log out and log back in
```

**Wrong board detected:**
- Check `platformio.ini` has correct board type
- Default is `board = uno` - change if using Mega, Nano, etc.

### Serialport Native Binding Errors

If you see errors about missing native builds:

```bash
cd app
nvm use 20              # Switch to Node 20
rm -rf node_modules .next package-lock.json
npm install             # Reinstall with correct Node version
npm run dev
```

### Port Access Issues (macOS/Linux)

If you get permission errors, add your user to the dialout group:

```bash
sudo usermod -a -G dialout $USER
```

### No Ports Found

- Ensure Arduino is connected via USB
- Check that drivers are installed (especially for CH340/FTDI chips)
- Try unplugging and replugging the Arduino

### Connection Drops

- Check the baud rate matches (9600)
- Ensure the Arduino sketch is running
- Look at the browser console and terminal for error messages

## Development

### VS Code Integration

For the best Arduino development experience, install the PlatformIO IDE extension in VS Code:

1. Open VS Code
2. Install "PlatformIO IDE" extension
3. Open the `robot/` folder
4. Use the status bar buttons:
   - ✓ Build
   - → Upload
   - 🔌 Serial Monitor
   - 🗑️ Clean

Or use Command Palette (Cmd+Shift+P):
- "PlatformIO: Build"
- "PlatformIO: Upload"
- "PlatformIO: Serial Monitor"

### Arduino

- Pin configurations are in `robot/main.ino` namespace block
- Sensor classes are modular and can be modified independently
- Serial output format can be customized in the `loop()` function

### Next.js

- Dashboard component: `app/app/components/Dashboard.tsx`
- API routes: `app/app/api/serial/`
- Modify styling using Tailwind CSS classes

## Future Enhancements

- Data logging to database
- Historical data visualization with charts
- Alert thresholds and notifications
- Multiple Arduino support
- Mobile-responsive optimizations
- Export data to CSV
