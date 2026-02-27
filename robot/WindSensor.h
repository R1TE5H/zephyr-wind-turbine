#pragma once

#include <Arduino.h>

class WindSensor {
 public:
  WindSensor(uint8_t windPin, uint8_t tempPin, uint8_t windLedPin, uint8_t tempLedPin);

  void begin();
  bool update(unsigned long now);

  float windSpeedMs() const;
  float windSpeedKmh() const;
  float temperatureC() const;

 private:
  static constexpr unsigned long UPDATE_MS = 500;
  static constexpr float ADC_REF_VOLT = 5.17f;
  static constexpr int ADC_MAX = 1023;
  static constexpr float ZERO_WIND_V = 1.2207f;

  static constexpr int WIND_LOW_THRESHOLD = 200;
  static constexpr int TEMP_LOW_THRESHOLD = 180;

  uint8_t windOutPin;
  uint8_t tempOutPin;
  uint8_t windLowLedPin;
  uint8_t tempLowLedPin;

  unsigned long lastUpdate;

  float windMph;
  float windMs;
  float windKmh;
  float tempC;
};
