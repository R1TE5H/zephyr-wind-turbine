#pragma once

#include <Arduino.h>

class HallSensor {
 public:
  HallSensor(uint8_t hallPin, uint8_t ledPin, unsigned long sampleWindowMs);

  void begin();
  void update(unsigned long now);

  unsigned long revs() const;
  unsigned long rpm() const;
  unsigned long sampleWindowMs() const;

 private:
  uint8_t hallPin;
  uint8_t ledPin;
  unsigned long sampleMs;

  volatile unsigned long pulseCounter;
  volatile bool pulseDetected;

  unsigned long lastUpdate;
  unsigned long revCount;
  unsigned long rpmValue;

  static HallSensor* activeInstance;
  static void isrRouter();
  void onPulse();
};
