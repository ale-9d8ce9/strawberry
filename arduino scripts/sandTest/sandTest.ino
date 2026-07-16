#include <Wire.h>
#include <Adafruit_LIS3DH.h>
#include <Adafruit_Sensor.h>
#include <FastLED.h>

#define NsandParticles 12

Adafruit_LIS3DH lis = Adafruit_LIS3DH();
CRGB leds[64];

int8_t gravityDirectionX = 0;
int8_t gravityDirectionY = 0;
struct sandParticle {
  int8_t x;
  int8_t y;
};
struct sandParticle sand[NsandParticles];
uint8_t cells[8] = {0xff,0xff,0xff,0xff, 0xff,0xff,0xff,0xff};
uint8_t myrandom = 0;

void setup() {
  Serial.begin(9600);

  FastLED.addLeds<WS2812B, 9, GRB>(leds, 64);
  FastLED.setBrightness(5);
  FastLED.clear();
  FastLED.show();

  pinMode(3, OUTPUT);
  delay(50);
  digitalWrite(3, LOW);

  if (!lis.begin(0x18)) {
    Serial.println("Could not find a valid LIS3DH sensor!");
    while (1) yield();
  }
  lis.setRange(LIS3DH_RANGE_2_G);
  delay(500);
  Serial.println("BOOTED");
  for (uint8_t i = 0; i < NsandParticles/2; i++) {
    sand[i].x = i+1;
    sand[i].y = 3;
    setCell0(i+1, 3);
  }
  for (uint8_t i = NsandParticles/2; i < NsandParticles; i++) {
    sand[i].x = i-5;
    sand[i].y = 4;
    setCell0(i-5, 4);
  }
}



void loop() {
  sensors_event_t event; 
  lis.getEvent(&event);
  
  float x = event.acceleration.x;
  float y = event.acceleration.y;
  calculateSandDirection(x, y);
  myupdateRandom(x,y);


  simulate();

  delay(50); 
}


uint8_t getLSB(float f) {
    uint32_t bits;
    memcpy(&bits, &f, sizeof(bits));
    return (uint8_t)(bits & 0xFF);
}
void myupdateRandom(float f1, float f2) {
  myrandom ^= getLSB(f1);
  myrandom ^= getLSB(f2);
}

void calculateSandDirection(float x, float y) {
  gravityDirectionX = 0;
  gravityDirectionY = 0;

  if (x > 4) {
    gravityDirectionX = +1;
  }
  if (y > 4) {
    gravityDirectionY = +1;
  }
  if (x < -4) {
    gravityDirectionX = -1;
  }
  if (y < -4) {
    gravityDirectionY = -1;
  }
}


void movecell(uint8_t i) {
  if (gravityDirectionY == 0 && gravityDirectionX == 0) return;

  if (gravityDirectionY != 0 && gravityDirectionX != 0) { // 45 deg
    moveParticle45(i);
  }

  if (gravityDirectionX == 0) {
    moveParticleY(i);
  } 
  if (gravityDirectionY == 0) {
    moveParticleX(i);
  }
}

void setCell0(uint8_t x, uint8_t y) {
  uint8_t mask = 255 - (1 << x);
  cells[y] &= mask;
}
void setCell1(uint8_t x, uint8_t y) {
  cells[y] |= 1 << x;
}

void moveParticle45(uint8_t i) {
  int8_t x = sand[i].x;
  int8_t y = sand[i].y;

  y += gravityDirectionY;
  if (y == -1 || y == 8) {
    y = sand[i].y;
  }
  uint8_t rowDown = cells[y];

  x += gravityDirectionX;
  if (x == -1 || x == 8) {
    x = sand[i].x;
  }
  bool cell = (rowDown >> x) & 1;

  if (cell) {
    setCell1(sand[i].x, sand[i].y);
    sand[i].y = y;
    sand[i].x = x;
    setCell0(x, y);
  }
}


void moveParticleY(uint8_t i) {
  int8_t& x = sand[i].x;
  int8_t& y = sand[i].y;

  int8_t n = y + gravityDirectionY;
  if (n == -1 || n == 8) return;
  uint8_t rowDown = cells[n];

  bool cell = (rowDown >> x) & 1; // directly down
  if (cell) {
    setCell1(x, y);
    y += gravityDirectionY;
    setCell0(x, y);
    return;
  }

  // down right
  if (x != 7) {
    cell = (rowDown >> (x+1)) & 1;
    if (cell) {
      setCell1(x, y);
      y += gravityDirectionY;
      x += 1;
      setCell0(x, y);
      return;
    }
  }

  // down left
  if (x != 0) {
    cell = (rowDown >> (x-1)) & 1;
    if (cell) {
      setCell1(x, y);
      y += gravityDirectionY;
      x -= 1;
      setCell0(x, y);
      return;
    }
  }
  if ((myrandom^i) & 3 != 0) {
    return;
  }
  // side
  rowDown = cells[y];
  if (x != 7) {
    cell = (rowDown >> (x+1)) & 1;
    if (cell) {
      setCell1(x, y);
      x += 1;
      setCell0(x, y);
      return;
    }
  }
  if (x != 0) {
    cell = (rowDown >> (x-1)) & 1;
    if (cell) {
      setCell1(x, y);
      x -= 1;
      setCell0(x, y);
      return;
    }
  }
}

void moveParticleX(uint8_t i) {
  int8_t& x = sand[i].x;
  int8_t& y = sand[i].y;

  uint8_t rowDown = cells[y];
  int8_t n = x + gravityDirectionX;
  if (n == -1 || n == 8) return;

  bool cell = (rowDown >> n) & 1; // directly down
  if (cell) {
    setCell1(x, y);
    x += gravityDirectionX;
    setCell0(x, y);
    return;
  }

  // down right
  if (y != 7) {
    rowDown = cells[y+1];
    cell = (rowDown >> n) & 1;
    if (cell) {
      setCell1(x, y);
      y += 1;
      x += gravityDirectionX;
      setCell0(x, y);
      return;
    }
  }

  // down left
  if (y != 0) {
    rowDown = cells[y-1];
    cell = (rowDown >> n) & 1;
    if (cell) {
      setCell1(x, y);
      y -= 1;
      x += gravityDirectionX;
      setCell0(x, y);
    }
  }
  if ((myrandom^i) & 3 != 0) {
    return;
  }
  // side
  if (y != 7) {
    rowDown = cells[y+1];
    cell = (rowDown >> x) & 1;
    if (cell) {
      setCell1(x, y);
      y += 1;
      setCell0(x, y);
      return;
    }
  }
  if (y != 0) {
    rowDown = cells[y-1];
    cell = (rowDown >> x) & 1;
    if (cell) {
      setCell1(x, y);
      y -= 1;
      setCell0(x, y);
    }
  }
}



uint8_t ledIndexFromXY(uint8_t x, uint8_t y) {
  if (y+1 & 0x01) { // if y is odd flip x
    x = 7 - x;
  }
  return y*8 +x;
}

void simulate() {
  FastLED.clear();
  for (uint8_t i = 0; i < NsandParticles; i++) {
    movecell(i);
    uint8_t led = ledIndexFromXY(sand[i].x, sand[i].y);
    leds[led] = CRGB(50, 255, 255);
  }
  FastLED.show();
}

