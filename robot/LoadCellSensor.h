#pragma once

#include <Adafruit_HX711.h>
#include <Arduino.h>

class LoadCellSensor {
 public:
  LoadCellSensor(uint8_t dataPin, uint8_t sckPin, float nPerCount, float armRadiusM);

  void begin();
  bool update(unsigned long now);

  float forceN() const;
  float torqueNm() const;

 private:
  static constexpr unsigned long UPDATE_MS = 200;

  Adafruit_HX711 hx711;
  float nPerCount;
  float armRadiusM;

  unsigned long lastUpdate;
  float forceValueN;
  float torqueValueNm;
};
