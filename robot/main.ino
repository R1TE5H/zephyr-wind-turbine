#include <Arduino.h>

#include "DisplayManager.h"
#include "HallSensor.h"
#include "LoadCellSensor.h"
#include "PowerMonitor.h"
#include "WindSensor.h"

namespace {
constexpr uint8_t HALL_PIN = 3;
constexpr uint8_t HALL_LED_PIN = 7;
constexpr unsigned long HALL_SAMPLE_MS = 2000;

constexpr uint8_t WIND_OUT_PIN = A2;
constexpr uint8_t TEMP_PIN = A3;
constexpr uint8_t WIND_LOW_LED_PIN = 6;
constexpr uint8_t TEMP_LOW_LED_PIN = 5;

constexpr uint8_t HX711_DATA_PIN = A0;
constexpr uint8_t HX711_SCK_PIN = A1;
constexpr float N_PER_COUNT = 0.0005f;
constexpr float ARM_RADIUS_M = 0.10f;

DisplayManager displayManager;
HallSensor hallSensor(HALL_PIN, HALL_LED_PIN, HALL_SAMPLE_MS);
WindSensor windSensor(WIND_OUT_PIN, TEMP_PIN, WIND_LOW_LED_PIN, TEMP_LOW_LED_PIN);
LoadCellSensor loadCellSensor(HX711_DATA_PIN, HX711_SCK_PIN, N_PER_COUNT, ARM_RADIUS_M);
PowerMonitor powerMonitor;
}  // namespace

void setup() {
	Serial.begin(9600);

	displayManager.begin();
	displayManager.showStartup();

	hallSensor.begin();
	Serial.println(F("Hall_Effect sensor: ......READY"));

	windSensor.begin();
	Serial.println(F("WindSensor_RevP: ......READY"));

	loadCellSensor.begin();
	Serial.println(F("HX711: ......READY"));

	if (!powerMonitor.begin()) {
		Serial.println(F("INA260 not found!"));
		while (true) {
			delay(100);
		}
	}
	Serial.println(F("INA260 ready"));

	Serial.println(F("Zephyr is Ready"));
	delay(250);
}

void loop() {
	const unsigned long now = millis();
	static unsigned long lastSerialSend = 0;
	constexpr unsigned long SERIAL_INTERVAL_MS = 1000; // Send data every second

	hallSensor.update(now);
	const bool windUpdated = windSensor.update(now);
	loadCellSensor.update(now);
	powerMonitor.update(now);

	displayManager.drawFrame(hallSensor.sampleWindowMs());
	displayManager.renderHall(hallSensor.revs(), hallSensor.rpm());
	displayManager.renderWind(windSensor.windSpeedMs(), windSensor.temperatureC());
	displayManager.renderPower(powerMonitor.busVoltageMv(), powerMonitor.currentMa(), powerMonitor.powerMw());
	displayManager.renderLoad(loadCellSensor.forceN(), loadCellSensor.torqueNm());
	displayManager.present();

	// Send JSON data over serial at regular intervals
	if (now - lastSerialSend >= SERIAL_INTERVAL_MS) {
		lastSerialSend = now;
		
		Serial.print(F("{\"timestamp\":"));
		Serial.print(now);
		Serial.print(F(",\"hall\":{\"revs\":"));
		Serial.print(hallSensor.revs());
		Serial.print(F(",\"rpm\":"));
		Serial.print(hallSensor.rpm());
		Serial.print(F("},\"wind\":{\"speed\":"));
		Serial.print(windSensor.windSpeedMs(), 2);
		Serial.print(F(",\"temp\":"));
		Serial.print(windSensor.temperatureC(), 2);
		Serial.print(F("},\"power\":{\"voltage\":"));
		Serial.print(powerMonitor.busVoltageMv(), 2);
		Serial.print(F(",\"current\":"));
		Serial.print(powerMonitor.currentMa(), 2);
		Serial.print(F(",\"power\":"));
		Serial.print(powerMonitor.powerMw(), 2);
		Serial.print(F("},\"load\":{\"force\":"));
		Serial.print(loadCellSensor.forceN(), 2);
		Serial.print(F(",\"torque\":"));
		Serial.print(loadCellSensor.torqueNm(), 2);
		Serial.println(F("}}"));
	}
}
