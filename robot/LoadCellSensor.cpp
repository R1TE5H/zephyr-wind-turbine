#include "LoadCellSensor.h"

LoadCellSensor::LoadCellSensor(uint8_t dataPin, uint8_t sckPin, float nPerCount, float armRadiusM)
    : hx711(dataPin, sckPin),
      nPerCount(nPerCount),
      armRadiusM(armRadiusM),
      lastUpdate(0),
      forceValueN(0.0f),
      torqueValueNm(0.0f) {}

void LoadCellSensor::begin() {
  hx711.begin();

  for (uint8_t t = 0; t < 5; t++) {
    hx711.tareA(hx711.readChannelRaw(CHAN_A_GAIN_128));
  }

  lastUpdate = millis();
}

bool LoadCellSensor::update(unsigned long now) {
  if (now - lastUpdate < UPDATE_MS) {
    return false;
  }

  lastUpdate = now;

  const int32_t raw = hx711.readChannelBlocking(CHAN_A_GAIN_128) - 150;
  forceValueN = static_cast<float>(raw) * nPerCount;
  torqueValueNm = forceValueN * armRadiusM;

  return true;
}

float LoadCellSensor::forceN() const {
  return forceValueN;
}

float LoadCellSensor::torqueNm() const {
  return torqueValueNm;
}
