#include "DisplayManager.h"

DisplayManager::DisplayManager() : display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1) {}

bool DisplayManager::begin() {
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    return false;
  }

  display.clearDisplay();
  display.setFont(&TomThumb);
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  return true;
}

void DisplayManager::typeText(int16_t x, int16_t y, const char* text, uint16_t speedMs) {
  display.setCursor(x, y);
  for (int i = 0; text[i] != '\0'; i++) {
    display.write(text[i]);
    display.display();
    delay(speedMs);
  }
}

void DisplayManager::showStartup() {
  display.clearDisplay();
  typeText(0, 6, "Hello There,", 40);

  display.clearDisplay();
  typeText(0, 8, "Zephyr is Ready", 50);
  display.clearDisplay();
}

void DisplayManager::drawFrame(unsigned long hallWindowMs) {
  display.clearDisplay();

  display.setCursor(0, 6);
  display.print(F("Pulses:"));
  display.setCursor(38, 6);
  display.print(F("/"));
  display.print(hallWindowMs / 1000UL);
  display.print(F(" sec"));
  display.setCursor(70, 6);
  display.print(F(" |  RPM:"));

  display.setCursor(0, 22);
  display.print(F("Wind:"));
  display.setCursor(40, 22);
  display.println(F("m/s"));
  display.setCursor(60, 22);
  display.print(F("|   Temp:"));
  display.setCursor(115, 22);
  display.println(F("C"));

  display.setCursor(0, 36);
  display.print(F("V:"));
  display.setCursor(40, 36);
  display.print(F("I:"));
  display.setCursor(75, 36);
  display.println(F("mA"));
  display.setCursor(90, 36);
  display.print(F("P:"));

  display.setCursor(0, 50);
  display.print(F("Force:"));
  display.setCursor(48, 50);
  display.print(F("N "));
  display.print(F(" | Torque:"));
  display.setCursor(110, 50);
  display.println(F("N*m"));
}

void DisplayManager::renderHall(unsigned long revs, unsigned long rpm) {
  display.setCursor(30, 6);
  display.print(revs);
  display.setCursor(100, 6);
  display.println(rpm);
}

void DisplayManager::renderWind(float windSpeedMs, float tempC) {
  display.setCursor(20, 22);
  display.print(windSpeedMs, 2);
  display.setCursor(95, 22);
  display.print(tempC, 1);
}

void DisplayManager::renderPower(float busVoltageMv, float currentMa, float powerMw) {
  if (busVoltageMv <= 99.0f) {
    display.setCursor(10, 36);
    display.print(busVoltageMv, 2);
    display.println(F(" mV"));
  } else {
    display.setCursor(10, 36);
    display.print(busVoltageMv / 1000.0f, 2);
    display.println(F(" V"));
  }

  display.setCursor(50, 36);
  display.print(currentMa);

  if (powerMw <= 999.0f) {
    display.setCursor(100, 36);
    display.print(powerMw);
    display.println(F(" mW"));
  } else {
    display.setCursor(100, 36);
    display.print(powerMw / 1000.0f);
    display.println(F(" W"));
  }
}

void DisplayManager::renderLoad(float forceN, float torqueNm) {
  display.setCursor(25, 50);
  display.print(forceN, 2);
  display.setCursor(90, 50);
  display.print(torqueNm, 2);
}

void DisplayManager::present() {
  display.display();
}
