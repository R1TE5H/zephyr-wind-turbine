#include "PowerMonitor.h"

PowerMonitor::PowerMonitor()
    : lastUpdate(0), busVoltageValueMv(0.0f), currentValueMa(0.0f), powerValueMw(0.0f) {}

bool PowerMonitor::begin() {
  if (!ina260.begin()) {
    return false;
  }

  ina260.setAveragingCount(INA260_COUNT_128);
  ina260.setVoltageConversionTime(INA260_TIME_588_us);
  ina260.setCurrentConversionTime(INA260_TIME_588_us);

  lastUpdate = millis();
  return true;
}

bool PowerMonitor::update(unsigned long now) {
  if (now - lastUpdate < UPDATE_MS) {
    return false;
  }

  lastUpdate = now;
  busVoltageValueMv = ina260.readBusVoltage();
  currentValueMa = ina260.readCurrent();
  powerValueMw = ina260.readPower();

  return true;
}

float PowerMonitor::busVoltageMv() const {
  return busVoltageValueMv;
}

float PowerMonitor::currentMa() const {
  return currentValueMa;
}

float PowerMonitor::powerMw() const {
  return powerValueMw;
}
