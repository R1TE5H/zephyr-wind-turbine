#pragma once

#include <Adafruit_INA260.h>
#include <Arduino.h>

class PowerMonitor {
 public:
  PowerMonitor();

  bool begin();
  bool update(unsigned long now);

  float busVoltageMv() const;
  float currentMa() const;
  float powerMw() const;

 private:
  static constexpr unsigned long UPDATE_MS = 500;

  Adafruit_INA260 ina260;
  unsigned long lastUpdate;

  float busVoltageValueMv;
  float currentValueMa;
  float powerValueMw;
};
