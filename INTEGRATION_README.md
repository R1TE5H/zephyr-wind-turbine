# Zephyr Wind Turbine - Arduino to Next.js Integration

This project connects an Arduino-based wind turbine monitoring system to a Next.js web dashboard for real-time data visualization.

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

## Setup Instructions

### 1. Arduino Setup

1. Upload the `robot/main.ino` sketch to your Arduino
2. Connect all sensors according to the pin definitions in the code
3. Note the serial port path (e.g., `/dev/tty.usbserial-*` on Mac, `COM3` on Windows)

### 2. Next.js Setup

1. Install dependencies:

   ```bash
   cd app
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open http://localhost:3000 in your browser

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

## Troubleshooting

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
