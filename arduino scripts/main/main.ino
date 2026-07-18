#include <avr/wdt.h> // Watchdog Timer library
#include <EEPROM.h>
#include <FastLED.h>
#include <Wire.h>
#include <Wire1.h>
#include <Adafruit_LIS3DH.h>
#include <Adafruit_Sensor.h>


#define SERIAL_SPEED 9600
#define SERIAL_CONF SERIAL_8O1
#define BUTTON_PIN 7
#define GREEN_LED_PIN 2
#define RED_LED_PIN 10
#define LED_PIN 9
#define NUM_LEDS 64
#define ACCELEROMETER_ADDRESS 0x18
#define MEM_BASE_ADDRESS 0x50

#define NWaterParticles 20


#define stsBootComplete   0x1F
#define stsReady          0xD1
#define stsWait           0xF0
#define stsAllOk          0x0F
#define stsError          0xEE
#define stsFatalError     0xFE
#define stsExecuting      0xE0

#define opReadMemory    0x83
#define opWriteMemory   0x87
#define opSetMode       0x29
#define opHardReset     0x20
#define opSoftReset     0x24
#define opShowFrame     0x04

#define errUnknown                        0x00
#define errRangeOutsideOfMemoryCapacity   0x01
#define errUnknownOperation               0x02
#define errArgsTooLong                    0x03
#define errInvalidArgs                    0x04
#define errNoAccelerometer                0x05


#define usb Serial
#define fled FastLED
#define mem1 Wire1
#define mem2 Wire
#define imem EEPROM



uint8_t op = 0;
uint8_t arg1 = 0;
uint8_t arg2 = 0;
uint8_t arg3 = 0;

uint8_t bytecount = 0;
uint8_t msgLength = 0;
uint8_t serialXOR = 0;

bool mode = true;


CRGB leds[NUM_LEDS];
Adafruit_LIS3DH lis = Adafruit_LIS3DH();


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
  MCUSR = 0;wdt_disable();
  mem1.begin();
  mem2.begin();
  usb.begin(SERIAL_SPEED, SERIAL_CONF);
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(3, OUTPUT);
  analogWrite(GREEN_LED_PIN, 10);

  // initialize leds
  fled.addLeds<WS2812B, LED_PIN, GRB>(leds, NUM_LEDS);
  fled.setBrightness(5);
  fill_solid(leds, NUM_LEDS, CRGB::Purple);
  fled.show();
  delay(50);
  digitalWrite(3, LOW);

  // initialise accelerometer
  if (!lis.begin(0x18)) {
    error(errNoAccelerometer);
    while (1) yield();
  }
  lis.setRange(LIS3DH_RANGE_2_G);

  // initilide water particles
  for (uint8_t i = 0; i < NWaterParticles; i++) {
    uint8_t x = i % 8;
    uint8_t y = i / 8;
    waterParticles[i].x = x;
    waterParticles[i].y = y;
    setCell0(x, y);
  }

  // done
  analogWrite(GREEN_LED_PIN, 5);
  usb.write(stsBootComplete);
  usb.write(stsAllOk);
  usb.write(stsReady);
  /*
  while (usb.available()) {
    handleSerial(usb.read());
    bytecount++;
    if (msgLength != 0 && bytecount == msgLength +1) {
      executePayload();
    }
  }
  digitalWrite(GREEN_LED_PIN, mode);*/
}





void loop() {
  if (mode) {
    tickWaterSimulation();
  }
  delay(50);
}







// h





// full reboot
void hardReset() {
  if (mode) return
  usb.write(stsExecuting);
  usb.write(op);
  usb.write(stsAllOk);
  usb.write(stsWait);
  wdt_enable(WDTO_15MS);
  while (1) {}
}


void waitForSerial() {
  while (usb.available() == 0) {}
}



void closeUsbMsgAllOk() {
  usb.write(stsAllOk);
  usb.write(stsReady);
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



uint8_t ledIndexFromXY(uint8_t x, uint8_t y) {
  if (y+1 & 0x01) { // if y is odd flip x
    x = 7 - x;
  }
  return y*8 +x;
}



void error(uint8_t code) {
  usb.write(stsError);
  usb.write(code);
}
void fatalError(uint8_t code) {
  usb.write(stsFatalError);
  usb.write(code);
  delay(1500);
  hardReset();
}





// usb





void executePayload() {
  bytecount = 0;
  msgLength = 0;
  serialXOR = 0;

  switch (op) {
    case opHardReset:
      hardReset();
      break;
    case opSetMode:
      setMode();
      break;
    case opReadMemory:
      readMemory();
      break;
    case opWriteMemory:
      writeMemory();
      break;
    case opShowFrame:
      showFrame();
      break;
    default:
      fatalError(errUnknownOperation);
      break;
  }
}

void handleSerial(uint8_t input) {
  serialXOR ^= input;
  switch (bytecount) {
    case 0:
      op = input;
      msgLength = op & 0b00000011;
      msgLength++;
      break;
    case 1:
      arg1 = input;
      break;
    case 2:
      arg2 = input;
      break;
    case 3:
      arg3 = input;
      break;
    default:
      fatalError(errArgsTooLong);
      break;
  }
}




void showFrame() {
  usb.write(stsExecuting);
  usb.write(op);
  usb.write(64);
  usb.write(0);
  for (uint8_t i = 0; i < 64; i++) {
    waitForSerial();
    uint8_t value = usb.read();
    uint8_t r = value & 0b11000000;
    uint8_t g = value & 0b00110000;
    g = g << 2;
    uint8_t b = value & 0b00001100;
    b = b << 4;
    uint8_t index = ledIndexFromXY(i%8, i/8);
    leds[index] = CRGB(r, g, b);
  }
  fled.show();
  closeUsbMsgAllOk();
}





void setMode() {
  uint8_t newMode = arg1;
  if (newMode != 0x00 && newMode != 0x01) {
    error(errInvalidArgs);
    return;
  }
  usb.write(stsExecuting);
  usb.write(op);
  usb.write(0x00);
  usb.write(0x01);
  usb.write(mode);
  mode = newMode;
  digitalWrite(13, 0);
  closeUsbMsgAllOk();
}






// memory stuff







void readMemory() {
  if (mode) return;
  uint16_t start = arg1 << 8 + arg2;
  uint16_t end = start + arg3;

  if (imem.length() <= end) {
    fatalError(errRangeOutsideOfMemoryCapacity);
    return;
  }
  usb.write(stsExecuting);
  usb.write(op);
  usb.write(0);
  usb.write(end-start);
  for (uint16_t i = start; i < end; i++) {
    byte val = imem.read(i);
    usb.write(val);
  }
  closeUsbMsgAllOk();
}

void writeMemory() {
  if (mode) return;
  uint16_t start = arg1 << 8 + arg2;
  uint16_t end = start + arg3;

  if (imem.length() <= end) {
    fatalError(errRangeOutsideOfMemoryCapacity);
    return;
  }
  usb.write(stsExecuting);
  usb.write(op);
  usb.write(end-start);
  usb.write(0);
  for (uint16_t i = start; i < end; i++) {
    waitForSerial();
    byte value = usb.read();
    imem.update(i, value);
  }
  closeUsbMsgAllOk();
}







uint8_t readMem1(uint16_t fullAddress) {
  uint8_t segmentAddress = (fullAddress >> 8) & 0b00000111;
  segmentAddress += 0x50;
  uint8_t cellAddress = fullAddress & 0xff;

  mem1.beginTransmission(segmentAddress);
  mem1.write(cellAddress);
  mem1.endTransmission();

  mem1.requestFrom(segmentAddress, (uint8_t) 1);
  if (mem1.available()) {
    return mem1.read();

  } else {
    usb.println("Error reading mem1");
    return 0;
  }
}

void writeMem1(uint16_t fullAddress, uint8_t data) {
  uint8_t segmentAddress = (fullAddress >> 8) & 0b00000111;
  segmentAddress += 0x50;
  uint8_t cellAddress = fullAddress & 0xff;

  mem1.beginTransmission(segmentAddress);
  mem1.write(cellAddress);
  mem1.write(data);
  if (mem1.endTransmission() != 0) {
    usb.println("Error writing to mem1");
    return;
  }

  delay(5);
}





uint8_t readMem2(uint16_t fullAddress) {
  uint8_t segmentAddress = (fullAddress >> 8) & 0b00000111;
  segmentAddress += 0x50;
  uint8_t cellAddress = fullAddress & 0xff;

  mem2.beginTransmission(segmentAddress);
  mem2.write(cellAddress);
  mem2.endTransmission();

  mem2.requestFrom(segmentAddress, (uint8_t) 1);
  if (mem2.available()) {
    return mem2.read();

  } else {
    usb.println("Error reading mem2");
    return 0;
  }
}

void writeMem2(uint16_t fullAddress, uint8_t data) {
  uint8_t segmentAddress = (fullAddress >> 8) & 0b00000111;
  segmentAddress += 0x50;
  uint8_t cellAddress = fullAddress & 0xff;

  mem2.beginTransmission(segmentAddress);
  mem2.write(cellAddress);
  mem2.write(data);
  if (mem2.endTransmission() != 0) {
    usb.println("Error writing to mem2");
    return;
  }

  delay(5);
}












// water simulation code








void tickWaterSimulation() {
  sensors_event_t event; 
  lis.getEvent(&event);
  
  float x = event.acceleration.x;
  float y = event.acceleration.y;
  elaborateGravityDirection(x, y);
  myupdateRandom(x,y);

  simulate();
  uint8_t d = x + y;
  d = 50 - d*2;
  //delay(d); 
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




void simulate() {
  FastLED.clear();
  for (uint8_t i = 0; i < NWaterParticles; i++) {
    movecell(i);
    uint8_t led = ledIndexFromXY(waterParticles[i].x, waterParticles[i].y);
    leds[led] = CRGB(0, 0, 255);
  }
  FastLED.show();
}

