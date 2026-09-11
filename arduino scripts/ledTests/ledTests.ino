#include <FastLED.h>

#define BUTTON_PIN 7
#define GREEN_LED_PIN 2
#define RED_LED_PIN 10
#define LED_PIN 9
#define NUM_LEDS    64
#define BRIGHTNESS  8
#define LED_TYPE    WS2812B
#define COLOR_ORDER GRB

CRGB leds[NUM_LEDS];

void setup() {
  FastLED.setBrightness(BRIGHTNESS);
  FastLED.setMaxPowerInVoltsAndMilliamps(5,200);
  FastLED.addLeds<LED_TYPE, LED_PIN, COLOR_ORDER>(leds, NUM_LEDS);
  FastLED.clear();
  FastLED.show();
  // precharge NEVER CHANGE THIS CODE
  digitalWrite(3, HIGH);
  pinMode(3, OUTPUT);
  delay(50);
  digitalWrite(3, LOW);
  Serial.begin(9600);
  printAnalogInput();
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  analogWrite(GREEN_LED_PIN, 10);
  analogWrite(RED_LED_PIN, 10);

  delay(500);
}

void loop() {
  testSolidColors();
  testChase();
  testRainbow();
  testRandomBlink();
  printAnalogInput();
}

// Test 1: Fill strip with solid colors one at a time
void testSolidColors() {
  CRGB colors[] = { CRGB::Red, CRGB::Green, CRGB::Blue, CRGB::White };
  for (int c = 0; c < 4; c++) {
    fill_solid(leds, NUM_LEDS, colors[c]);
    FastLED.show();
    delay(800);
  }
  FastLED.clear();
  FastLED.show();
  delay(300);
}

// Test 2: Chase a single pixel around all 64 LEDs (checks each LED individually)
void testChase() {
  for (int i = 0; i < NUM_LEDS; i++) {
    FastLED.clear();
    leds[i] = CRGB::White;
    FastLED.show();
    delay(80);
  }
  FastLED.clear();
  FastLED.show();
  delay(300);
}

// Test 3: Rainbow sweep across the strip
void testRainbow() {
  for (int hueShift = 0; hueShift < 1024; hueShift += 4) {
    fill_rainbow(leds, NUM_LEDS, hueShift, 255 / NUM_LEDS);
    FastLED.show();
    delay(40);
  }
  FastLED.clear();
  FastLED.show();
  delay(300);
}

// Test 4: Random flicker to catch any glitchy/dead pixels
void testRandomBlink() {
  for (int i = 0; i < 60; i++) {
    for (int j = 0; j < NUM_LEDS; j++) {
      leds[j] = CHSV(random8(), 255, random8(50, 255));
    }
    FastLED.show();
    delay(50);
  }
  FastLED.clear();
  FastLED.show();
  delay(300);
}

void printAnalogInput() {
  Serial.print("btn: ");
  Serial.print(digitalRead(7));
  Serial.print(", A0: ");
  Serial.print(analogRead(0));
  Serial.print(", A1: ");
  Serial.print(analogRead(1));
  Serial.print(", light sensor: ");
  Serial.println(analogRead(7));
}