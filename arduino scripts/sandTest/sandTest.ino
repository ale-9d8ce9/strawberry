#include <Wire.h>
#include <Adafruit_LIS3DH.h>
#include <Adafruit_Sensor.h>
#include <FastLED.h>

#define NWaterParticles 20

Adafruit_LIS3DH lis = Adafruit_LIS3DH();
CRGB leds[64];

int8_t gravityStrongDirectionX = 0;
int8_t gravityStrongDirectionY = 0;
int8_t gravityWeakDirectionY = 0;
int8_t gravityWeakDirectionX = 0;
struct particle {
  uint8_t x;
  uint8_t y;
};
struct particle waterParticles[NWaterParticles];
uint8_t cells[8] = {0xff,0xff,0xff,0xff, 0xff,0xff,0xff,0xff};
uint8_t myrandom = 0;

void setup() {
  Serial.begin(9600);

  FastLED.addLeds<WS2812B, 9, GRB>(leds, 64);
  FastLED.setBrightness(10);
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
  for (uint8_t i = 0; i < NWaterParticles; i++) {
    uint8_t x = i % 8;
    uint8_t y = i / 8;
    waterParticles[i].x = x;
    waterParticles[i].y = y;
    setCell0(x, y);
  }
}



void loop() {
  sensors_event_t event; 
  lis.getEvent(&event);
  
  float x = event.acceleration.x;
  float y = event.acceleration.y;
  elaborateGravityDirection(x, y);
  myupdateRandom(x,y);

  simulate();
  uint8_t d = x + y;
  d = 50 - d*2;
  delay(d); 
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

void elaborateGravityDirection(float x, float y) {
  gravityStrongDirectionX = (x > 1) - (x < -1);
  gravityStrongDirectionY = (y > 1) - (y < -1);

  if (fabs(y) > fabs(x)) {
    gravityWeakDirectionX = (x < 0) ? -1 : 1;
    gravityWeakDirectionY = 0;
  } else {
    gravityWeakDirectionY = (y < 0) ? -1 : 1;
    gravityWeakDirectionX = 0;
  }
}


void movecell(uint8_t i) {
  if (gravityStrongDirectionY == 0 && gravityStrongDirectionX == 0) return;

  if (gravityStrongDirectionY != 0 && gravityStrongDirectionX != 0) {
    moveParticle45(i);
    return;
  }

  if (gravityStrongDirectionX == 0) {
    moveParticleY(i);
  } else {
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
  uint8_t& x = waterParticles[i].x;
  uint8_t& y = waterParticles[i].y;

  uint8_t YplusG = y + gravityStrongDirectionY;
  uint8_t XplusG = x + gravityStrongDirectionX;
  if (YplusG > 7) YplusG = y;
  if (XplusG > 7) XplusG = x;
  
  uint8_t rowDown = cells[YplusG];

  bool cell = (rowDown >> XplusG) & 1;
  if (cell) { // directly down
    setCell1(x, y);
    y = YplusG;
    x = XplusG;
    setCell0(XplusG, YplusG);
    return;
  }

  cell = (rowDown >> x) & 1; // down side 1
  if (cell) {
    setCell1(x, y);
    y = YplusG;
    setCell0(x, YplusG);
    return;
  }

  rowDown = cells[y]; // down side 2
  cell = (rowDown >> XplusG) & 1;
  if (cell) {
    setCell1(x, y);
    x = XplusG;
    setCell0(XplusG, y);
    return;
  }

  if (((myrandom^i) & 3) != 0) return;

  uint8_t XminusG = x - gravityStrongDirectionX;
  uint8_t YminusG = y - gravityStrongDirectionY;
  if (XminusG > 7) XminusG = x;
  if (YminusG > 7) YminusG = y;

  rowDown = cells[YplusG];
  cell = (rowDown >> XminusG) & 1; // side 1
  if (cell && (y != 0 && y != 7)) {
    setCell1(x, y);
    x = XminusG;
    y = YplusG;
    setCell0(XminusG, YplusG);
    return;
  }

  rowDown = cells[YminusG];
  cell = (rowDown >> XplusG) & 1; // side 2
  if (cell && (x != 0 && x != 7)) {
    setCell1(x, y);
    y = YminusG;
    x = XplusG;
    setCell0(XplusG, YminusG);
    return;
  }
}



void moveParticleY(uint8_t i) {
  uint8_t& x = waterParticles[i].x;
  uint8_t& y = waterParticles[i].y;

  uint8_t n = y + gravityStrongDirectionY;
  if (n > 7) return;
  uint8_t rowDown = cells[n];

  bool cell = (rowDown >> x) & 1; // directly down
  if (cell) {
    setCell1(x, y);
    y += gravityStrongDirectionY;
    setCell0(x, y);
    return;
  }
  
  //if (x + gravityWeakDirectionX > 7) return; // apparently it's not needed (not having it makes water not stick to borders)

  // down side
  cell = (rowDown >> (x + gravityWeakDirectionX)) & 1;
  if (cell) {
    setCell1(x, y);
    y += gravityStrongDirectionY;
    x += gravityWeakDirectionX;
    setCell0(x, y);
    return;
  }
  cell = (rowDown >> (x - gravityWeakDirectionX)) & 1;
  if (cell) {
    setCell1(x, y);
    y += gravityStrongDirectionY;
    x -= gravityWeakDirectionX;
    setCell0(x, y);
    return;
  }
  
  // side
  rowDown = cells[y];
  cell = (rowDown >> (x + gravityWeakDirectionX)) & 1;
  if (cell) {
    setCell1(x, y);
    x += gravityWeakDirectionX;
    setCell0(x, y);
    return;
  }
  if (((myrandom^i) & 3) != 0) return;
  cell = (rowDown >> (x - gravityWeakDirectionX)) & 1;
  if (cell) {
    setCell1(x, y);
    x -= gravityWeakDirectionX;
    setCell0(x, y);
    return;
  }
}

void moveParticleX(uint8_t i) {
  uint8_t& x = waterParticles[i].x;
  uint8_t& y = waterParticles[i].y;

  uint8_t n = x + gravityStrongDirectionX;
  if (n > 7) return;
  uint8_t rowDown = cells[y];

  bool cell = (rowDown >> n) & 1; // directly down
  if (cell) {
    setCell1(x, y);
    x += gravityStrongDirectionX;
    setCell0(x, y);
    return;
  }

  //if (y + gravityWeakDirectionY > 7) return; // apparently it's not needed (not having it makes water not stick to borders)

  // down side
  rowDown = cells[y + gravityWeakDirectionY];
  cell = (rowDown >> n) & 1;
  if (cell) {
    setCell1(x, y);
    y += gravityWeakDirectionY;
    x += gravityStrongDirectionX;
    setCell0(x, y);
    return;
  } 
  rowDown = cells[y - gravityWeakDirectionY];
  cell = (rowDown >> n) & 1;
  if (cell) {
    setCell1(x, y);
    y -= gravityWeakDirectionY;
    x += gravityStrongDirectionX;
    setCell0(x, y);
  }

  // side
  rowDown = cells[y + gravityWeakDirectionY];
  cell = (rowDown >> x) & 1;
  if (cell) {
    setCell1(x, y);
    y += gravityWeakDirectionY;
    setCell0(x, y);
    return;
  } 
  if (((myrandom^i) & 3) != 0) return;
  rowDown = cells[y - gravityWeakDirectionY];
  cell = (rowDown >> x) & 1;
  if (cell) {
    setCell1(x, y);
    y -= gravityWeakDirectionY;
    setCell0(x, y);
  }
}



uint8_t ledIndexFromXY(uint8_t x, uint8_t y) {
  if (y+1 & 1) { // if y is odd flip x
    x = 7 - x;
  }
  return y*8 +x;
}

void simulate() {
  FastLED.clear();
  for (uint8_t i = 0; i < NWaterParticles; i++) {
    movecell(i);
    uint8_t led = ledIndexFromXY(waterParticles[i].x, waterParticles[i].y);
    leds[led] = CRGB(0, 0, 255);
  }
  FastLED.show();
}

