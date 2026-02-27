//#include <ArduinoJson.h>
//#include <SoftwareSerial.h>
#include <Adafruit_INA260.h>
#include <Adafruit_HX711.h>

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Fonts/TomThumb.h>

// ---- OLED SETUP                     
  #define SCREEN_WIDTH 128
  #define SCREEN_HEIGHT 64
  #define OLED_RESET   -1   // No dedicated reset pin
  Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

  void typeText(int16_t x, int16_t y, const char* text, uint16_t speedMs) {
    display.setCursor(x, y);
    for (int i = 0; text[i] != '\0'; i++) {
      display.write(text[i]);   // print one character
      display.display();        // push to screen
      delay(speedMs);           // typing speed in ms
    }
  }

//SoftwareSerial btSerial(10, 11);   // RX, TX example

// ============================
//HALL_effect sensor  
  volatile bool pulseDetected = false;   // interrupt flag
  const int LED_PIN = 7;        // debug LED output
 

  
  constexpr uint8_t HALL_Pin = 3;      // interrupt-capable | Vcc should be 3.3V
  
  constexpr int HALL_MS = 2000;   // 4 seconds
  unsigned long lastHallUpdate = 0;
  
  volatile unsigned long Pulse_counter = 0;  // updated in ISR
  
  void  countPulses() {      // on Uno just: void countPulses()
    Pulse_counter++; 
    pulseDetected = true;   // flag for LED blink                   // keep it tiny
  }
  volatile unsigned long REVs = 0;
  volatile unsigned long RPM  = 0;

// ============================
//WindSensor_RevP
  unsigned long lastWindUpdate    = 0;
  constexpr unsigned long WIND_MS = 500;  // update wind sensor every 2 sec

  constexpr uint8_t  Wind_OutPin    = A2;   // wind sensor analog pin  hooked up to Wind P sensor "OUT" pin
  constexpr uint8_t  TempPin        = A3;   // temp sesnsor analog pin hooked up to Wind P sensor "TMP" pin

  constexpr float    zeroWind_V     = 1.2207f;   // tweak this number after calibrating the sensor, manually

  float windSpeedMPH; 

  float windSpeedMS=5;
  float windSpeedKMH=5;
  float tempC=24;

  // ---------- ADC & sensor constants ----------
  constexpr float ADC_REF_VOLT = 5.17f;     // Uno uses 5.0V reference by default
  constexpr int   ADC_MAX      = 1023;     // 10-bit ADC (0–1023)

  constexpr float C_adc = ADC_REF_VOLT/ADC_MAX;

  // int windSampleIndex = 0;
  // float windSumInBatch = 0;
  // float windDisplayValue = 0;

  constexpr uint8_t WIND_LOW_LED_PIN = 6;   // D6
  constexpr int WIND_LOW_THRESHOLD = 200;   // raw ADC count

  constexpr uint8_t TEMP_LOW_LED_PIN = 5;   // D6
  constexpr int TEMP_LOW_THRESHOLD = 180;   // raw ADC count

 
// ============================
//LoadCell + HX711

  constexpr uint8_t DATA_Pin = A0;
  constexpr uint8_t SCK_Pin = A1;

  Adafruit_HX711 hx711(DATA_Pin, SCK_Pin);

  // !!!!!!!!!!!!!!!!! change these after calibration !!!!!!!!!!!
  const float N_per_count   = 0.0005;   // <-- A coefficient factor used to convert the load cell reading to Newtons, we have to find it manualy
  const float ARM_RADIUS_M  = 0.10;     // # meters from shaft to load-cell line of action

  constexpr unsigned long LoadCell_MS = 200; // Update LoadCell readings every 0.2s
  unsigned long lastLoadCellUpdate = 0; 
  

// ============================
//INA260 - VA
  
  Adafruit_INA260 ina260;
  
  constexpr unsigned long  INA260__MS = 500; //update every 0.5s
  unsigned long lastINA260Update = 0;
 
  float busVoltage = 0; // Voltage
  float current    = 0; // Amps
  float power      = 0; // Watts

void setup() {
//btSerial.begin(9600);
Serial.begin(9600);

// ============================
//OLED DISPLAY
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {  // try 0x3D if no image
  Serial.println(F("SSD1306 allocation failed"));
  //   while (true) {} // hard stop – no display, no point continuing
  }

  display.clearDisplay();
  display.setFont(&TomThumb);
  display.setTextSize(1);                // 1 = small text, 2 = bigger
  display.setTextColor(SSD1306_WHITE);

  // // ---- Startup text ----
  typeText(0, 6,  "Hello There,", 40);  // 40 ms per char
  //delay(1000);
  Serial.println(F("Hello There,"));

// ============================
//HALL_effect sensor   
  pinMode(HALL_Pin, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(HALL_Pin), countPulses, FALLING);
  lastHallUpdate = millis();// start stopwatch

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  // // Typing effect for Hall sensor
  // typeText(0, 6,  "Hall Effect Sensor:", 40);  // 40 ms per char
  // typeText(0, 24, "......READY",        80);
  // //delay(1000);


  // Serial.println(F("Hall_Effect sensor: ......READY"));

// ============================
//WindSensor_RevP
  pinMode(WIND_LOW_LED_PIN, OUTPUT);
  digitalWrite(WIND_LOW_LED_PIN, LOW);

  pinMode(TEMP_LOW_LED_PIN, OUTPUT);
  digitalWrite(TEMP_LOW_LED_PIN, LOW);

  display.clearDisplay();

  // // Typing effect for Wind sensor
  // typeText(0, 6,  "WindSensor_RevP:", 40);
  // typeText(0, 24, "......READY",      80);
  // //delay(1000);

  Serial.println(F("WindSensor_RevP: ......READY"));
// ============================
//LoadCell + HX711
  
  hx711.begin();

  
  for (uint8_t t = 0; t < 5; t++) { // tare channel A, we use it to zero down the scale; we do 5 readings to be more precise 
    hx711.tareA(hx711.readChannelRaw(CHAN_A_GAIN_128));
  }
  
  display.clearDisplay();

  // // Typing effect for Wind sensor
  // typeText(0, 6,  "LoadCell/HX711:", 40);
  // typeText(0, 24, "......READY",      80);

  //delay(1000);
  Serial.println(F("HX711: ......READY"));
  
// ============================
//INA260 - VA
  
  if (!ina260.begin()) {
      Serial.println("INA260 not found!");
      while (1);
    }

  // set the number of samples to average
  ina260.setAveragingCount(INA260_COUNT_128);
  // set the time over which to measure the current and bus voltage
  ina260.setVoltageConversionTime(INA260_TIME_588_us);
  ina260.setCurrentConversionTime(INA260_TIME_588_us);
  display.clearDisplay();
  
  // Typing effect for Wind sensor
  // typeText(0, 6,  "INA260-VA:", 40);
  // typeText(0, 24, "......READY",      80);

  Serial.println("INA260 ready");
  
// ============================

display.clearDisplay();
typeText(0, 8, "Zephyr is Ready", 50);
//delay(1000);
display.clearDisplay();


//delay(1000);
Serial.println(F("Zephyr is Ready"));
delay(250);
display.clearDisplay();



}

void loop() {

  //Frame for OLED
   display.clearDisplay();
    // Hall Sensor
      display.setCursor(0, 6);
      display.print(F("Pulses:"));
      display.setCursor(38, 6);
      display.print(F("/"));
      display.print(HALL_MS / 1000UL);
      display.print(F(" sec"));
      display.setCursor(70, 6);
      display.print(F(" |  RPM:"));

    //Wind Sensor
      display.setCursor(0, 22);
      display.print(F("Wind:"));
      display.setCursor(40, 22);
      display.println(F("m/s"));
      display.setCursor(60,22);
      display.print(F("|   Temp:"));
      display.setCursor(115, 22);
      display.println(F("C"));
    
    //INA 260
      display.setCursor(0, 36);
      display.print(F("V:"));
      display.setCursor(40, 36);
      display.print(F("I:"));
      display.setCursor(75, 36);
      display.println(F("mA"));
      display.setCursor(90, 36);
      display.print(F("P:"));

    //LoadCell
    display.setCursor(0, 50);
    display.print(F("Force:"));
    display.setCursor(48, 50);
    display.print(F("N "));
    display.print(F(" | Torque:"));
    display.setCursor(110, 50);
    display.println(F("N*m"));

    display.display();

unsigned long now = millis();  // <--- one snapshot for all timers

// ============================
// HALL EFFECT SENSOR --> It's woorking fully!!!!!!
 
  // ====== LED C: blink on each hall pulse ======
  if (pulseDetected) {
    digitalWrite(LED_PIN, HIGH);
    delay(20);                  // short visible blink; 20 ms won't hurt your 2–4 s timing
    digitalWrite(LED_PIN, LOW);
    pulseDetected = false;      // reset flag
  }

  if (now - lastHallUpdate >= HALL_MS) {
  lastHallUpdate = now;

    
  noInterrupts();
  REVs = Pulse_counter;
  Pulse_counter = 0;
  interrupts();

  // compute RPM: REVs per 2s -> per minute  | in 2 seconds: RPM = (REVs * 60) / 2 
  RPM = (REVs * 60UL) / (HALL_MS / 1000UL);

    }

    // Serial.print("Pulses in ");
    // Serial.print(HALL_MS / 1000UL);
    // Serial.print(" s = ");
    // Serial.print(REVs);
    // Serial.print("  --> RPM = ");
    // Serial.println(RPM);

    display.setCursor(30, 6);
    display.print(REVs);
    display.setCursor(100, 6);
    display.println(RPM);
   

// ============================
//LoadCell + HX711 --> It's woorking fully!!!!!!

   if (now - lastLoadCellUpdate >= LoadCell_MS) {
      lastLoadCellUpdate = now;
  
    int32_t raw = hx711.readChannelBlocking(CHAN_A_GAIN_128) - 150; // Substract a adjusting (to zero) factor

    // convert to force in Newtons
    float force_N = raw * N_per_count;

    // convert to torque about the shaft
    float torque_Nm = force_N * ARM_RADIUS_M;
      

      display.setCursor(25, 50);
      display.print(force_N, 2);
      display.setCursor(90, 50);
      display.print(torque_Nm, 2);


      // Serial.print(F("Raw: "));
      // Serial.print(raw);
      // Serial.print(F("  || Force: "));
      // Serial.print(force_N, 2);
      // Serial.print(F(" N  || Torque: "));
      // Serial.print(torque_Nm, 2);
      // Serial.println(F(" N*m"));
   }

// ============================
//WindSensr_RevP
  if (now - lastWindUpdate >= WIND_MS) {
    lastWindUpdate = now;


    // ---------- Read raw ADC values ----------
    int windRaw = analogRead(Wind_OutPin);
    int tempRaw = analogRead(TempPin);
    
      // Wind Safety
      if (windRaw < WIND_LOW_THRESHOLD) {
        digitalWrite(WIND_LOW_LED_PIN, HIGH);
        } 
      else {
        digitalWrite(WIND_LOW_LED_PIN, LOW);
        }
      
      

    float windVolts = static_cast<float>(windRaw) * C_adc;
    float tempVolts = static_cast<float>(tempRaw) * C_adc;
    
    
    tempC = (tempVolts - 0.390f) / 0.0195f; // Tambient = (Vout - 0.400) / 0.0195   (°C)


  if (windVolts > zeroWind_V) {
    
    // Avoid negative inside pow()
    float tempFactor = 3.038517f * powf(tempC, 0.115157f);
    float num = (windVolts - zeroWind_V);
    float den = tempFactor * 0.087288f;
    float x = num / den;
    
      // Safty trigger for wrong readings
    if (x < 0.0f) {
      x = 0.0f;
      }

    windSpeedMPH = powf(x,3.1095964f);
  }

  // below zeroWind_V → treat as no wind
  else {
    windSpeedMPH = 0.0f;
    }

  // Convert to other units
  windSpeedMS  = windSpeedMPH * 0.44704f;   // mph → m/s
  windSpeedKMH = windSpeedMPH * 1.60934f;   // mph → km/h

// // LOGIC CHANGE: Add to total Sum
//   windSumInBatch += windSpeedMS;  // Accumulate the speed
  
//   windSampleIndex++;

//   // Process batch of 10
//   if (windSampleIndex >= 10) {
//     windDisplayValue = windSumInBatch / 10.0f; // Divide by 10 to get Average
    
//     // Reset for next batch
//     windSumInBatch = 0;
//     windSampleIndex = 0;
//   }

  }
// ============================
//INA260 - VA
 
  if (now - lastINA260Update >= INA260__MS) {
    lastINA260Update = now;

      busVoltage = ina260.readBusVoltage(); // mV
      current    = ina260.readCurrent();    // mA
      power      = ina260.readPower();      // mW

    }
//Display INA260 & Wind
  // Serial.print(F("V: "));    Serial.print(busVoltage);
  // Serial.print(F("| I: "));  Serial.print(current);
  // Serial.print(F("| P: "));  Serial.println(power);

    if(busVoltage <= 99){
    display.setCursor(10, 36);
    display.print(busVoltage, 2);
    display.println(F(" mV"));
  }

  if(busVoltage >= 100){
    display.setCursor(10, 36);
    display.print(busVoltage/1000, 2);
    display.println(F(" V"));
  }
    
    display.setCursor(50, 36);
    display.print(current);
  
  if(power <=999){
  display.setCursor(100, 36);
  display.print(power);
  display.println(" mW");
  }

  if(power >=1000){
  display.setCursor(100, 36);
  display.print(power/1000);
  display.println(" W");
  }

  Serial.print(F("Wind: "));
  Serial.print(windSpeedMS, 2);
  Serial.print(F(" m/s  |  "));
  Serial.print(tempC, 2);
  Serial.println(F(" C"));

  display.setCursor(20, 22);
  display.print(windSpeedMS, 2);
  display.setCursor(95,22);
  display.print(tempC, 1);
  display.display();

}





