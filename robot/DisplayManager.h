#pragma once

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Fonts/TomThumb.h>

class DisplayManager {
 public:
  static constexpr int SCREEN_WIDTH = 128;
  static constexpr int SCREEN_HEIGHT = 64;

  DisplayManager();

  bool begin();
  void showStartup();

  void drawFrame(unsigned long hallWindowMs);
  void renderHall(unsigned long revs, unsigned long rpm);
  void renderWind(float windSpeedMs, float tempC);
  void renderPower(float busVoltageMv, float currentMa, float powerMw);
  void renderLoad(float forceN, float torqueNm);
  void present();

 private:
  Adafruit_SSD1306 display;

  void typeText(int16_t x, int16_t y, const char* text, uint16_t speedMs);
};
