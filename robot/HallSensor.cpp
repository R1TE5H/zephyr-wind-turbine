#include "HallSensor.h"

HallSensor* HallSensor::activeInstance = nullptr;

HallSensor::HallSensor(uint8_t hallPin, uint8_t ledPin, unsigned long sampleWindowMs)
    : hallPin(hallPin),
      ledPin(ledPin),
      sampleMs(sampleWindowMs),
      pulseCounter(0),
      pulseDetected(false),
      lastUpdate(0),
      revCount(0),
      rpmValue(0) {}

void HallSensor::begin() {
  activeInstance = this;
  pinMode(hallPin, INPUT_PULLUP);
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, LOW);
  attachInterrupt(digitalPinToInterrupt(hallPin), isrRouter, FALLING);
  lastUpdate = millis();
}

void HallSensor::isrRouter() {
  if (activeInstance != nullptr) {
    activeInstance->onPulse();
  }
}

void HallSensor::onPulse() {
  pulseCounter++;
  pulseDetected = true;
}

void HallSensor::update(unsigned long now) {
  if (pulseDetected) {
    digitalWrite(ledPin, HIGH);
    delay(20);
    digitalWrite(ledPin, LOW);
    pulseDetected = false;
  }

  if (now - lastUpdate >= sampleMs) {
    lastUpdate = now;

    noInterrupts();
    revCount = pulseCounter;
    pulseCounter = 0;
    interrupts();

    rpmValue = (revCount * 60UL) / (sampleMs / 1000UL);
  }
}

unsigned long HallSensor::revs() const {
  return revCount;
}

unsigned long HallSensor::rpm() const {
  return rpmValue;
}

unsigned long HallSensor::sampleWindowMs() const {
  return sampleMs;
}
