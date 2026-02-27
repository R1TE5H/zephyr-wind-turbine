#include "WindSensor.h"

#include <math.h>

WindSensor::WindSensor(uint8_t windPin, uint8_t tempPin, uint8_t windLedPin, uint8_t tempLedPin)
    : windOutPin(windPin),
      tempOutPin(tempPin),
      windLowLedPin(windLedPin),
      tempLowLedPin(tempLedPin),
      lastUpdate(0),
      windMph(0.0f),
      windMs(0.0f),
      windKmh(0.0f),
      tempC(24.0f) {}

void WindSensor::begin() {
  pinMode(windLowLedPin, OUTPUT);
  digitalWrite(windLowLedPin, LOW);

  pinMode(tempLowLedPin, OUTPUT);
  digitalWrite(tempLowLedPin, LOW);

  lastUpdate = millis();
}

bool WindSensor::update(unsigned long now) {
  if (now - lastUpdate < UPDATE_MS) {
    return false;
  }

  lastUpdate = now;

  const int windRaw = analogRead(windOutPin);
  const int tempRaw = analogRead(tempOutPin);

  digitalWrite(windLowLedPin, windRaw < WIND_LOW_THRESHOLD ? HIGH : LOW);
  digitalWrite(tempLowLedPin, tempRaw < TEMP_LOW_THRESHOLD ? HIGH : LOW);

  const float adcScale = ADC_REF_VOLT / ADC_MAX;
  const float windVolts = static_cast<float>(windRaw) * adcScale;
  const float tempVolts = static_cast<float>(tempRaw) * adcScale;

  tempC = (tempVolts - 0.390f) / 0.0195f;

  if (windVolts > ZERO_WIND_V) {
    const float tempFactor = 3.038517f * powf(tempC, 0.115157f);
    const float numerator = windVolts - ZERO_WIND_V;
    const float denominator = tempFactor * 0.087288f;
    float x = numerator / denominator;

    if (x < 0.0f) {
      x = 0.0f;
    }

    windMph = powf(x, 3.1095964f);
  } else {
    windMph = 0.0f;
  }

  windMs = windMph * 0.44704f;
  windKmh = windMph * 1.60934f;
  return true;
}

float WindSensor::windSpeedMs() const {
  return windMs;
}

float WindSensor::windSpeedKmh() const {
  return windKmh;
}

float WindSensor::temperatureC() const {
  return tempC;
}
