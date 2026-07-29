#include <avr/wdt.h> // Watchdog Timer library
#include <EEPROM.h>
#include <FastLED.h>
#include <Wire.h>
#include <Wire1.h>
#include <Adafruit_LIS3DH.h>
#include <Adafruit_Sensor.h>


#define SERIAL_SPEED 115200
#define SERIAL_CONF SERIAL_8O1
#define BUTTON_PIN 7
#define GREEN_LED_PIN 2
#define RED_LED_PIN 10
#define LED_PIN 9
#define NUM_LEDS 64
#define BRIGHTNESS 12
#define PROJECT_HEADER_SIZE 4

#define NWaterParticles 20


#define stsBootComplete   0xBD
#define stsBooting        0xB1
#define stsReady          0xD1
#define stsWait           0xF0
#define stsAllOk          0x0F
#define stsError          0xEE
#define stsFatalError     0xFE
#define stsExecuting      0xE0
#define stsDownloadMode   0xD8

#define opReadMemory    0x83
#define opWriteMemory   0x87
#define opSetMode       0x29
#define opHardReset     0x20
#define opShowFrame     0x04

#define errUnknown                        0x00
#define errRangeOutsideOfMemoryCapacity   0x01
#define errUnknownOperation               0x02
#define errArgsTooLong                    0x03
#define errInvalidArgs                    0x04
#define errNoAccelerometer                0x05
#define errNoMem1                         0x06
#define errNoMem2                         0x07
#define errNoIMem                         0x08
#define errInvalidXOR                     0x09


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

typedef enum {waterSimulation, animation, serial} MODE;
MODE mode = waterSimulation;


CRGB leds[NUM_LEDS];
Adafruit_LIS3DH lis = Adafruit_LIS3DH();


uint8_t myrandom = 0;



void setup() {
  MCUSR = 0;wdt_disable();
  usb.begin(SERIAL_SPEED, SERIAL_CONF);
  usb.write(stsBooting);

  mem1.begin();
  mem2.begin();
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  analogWrite(GREEN_LED_PIN, BRIGHTNESS/2);

  // initialize leds
  fled.addLeds<WS2812B, LED_PIN, GRB>(leds, NUM_LEDS);
  fled.setBrightness(BRIGHTNESS);
  fill_solid(leds, NUM_LEDS, CRGB::Purple);
  fled.show();
  pinMode(3, OUTPUT);
  delay(50);
  digitalWrite(3, LOW);

  // initialise accelerometer
  if (!lis.begin(0x18)) {
    error(errNoAccelerometer);
    while (1) yield();
  }
  lis.setRange(LIS3DH_RANGE_2_G);

  initWater();
  initAnimation();
  delay(50);

  // check to go in serial mode
  if (usb.available() && usb.read() == stsDownloadMode) {
    fill_solid(leds, CRGB::Green);
    fled.show();
    usb.write(stsDownloadMode);
    usb.write(stsReady);
    mode = serial;
    serialModeLoop();
  }

  // done
  usb.write(stsBootComplete);
  usb.write(stsAllOk);
  usb.end();
}





void loop() {
  if (mode == waterSimulation) {
    tickWaterSimulation();
    delay(50);
  } else {
    // animation
  }
}





// usb



void serialModeLoop() {
  while (mode == serial) {
    waitForSerial();
    handleSerial(usb.read());
    bytecount++;
    if (msgLength != 0 && bytecount == msgLength) {
      executePayload();
    }
  }
}




void executePayload() {
  bytecount = 0;
  msgLength = 0;

  switch (op) {
    case opHardReset:
      hardReset();
      break;
    case opSetMode:
      setMode();
      break;
    case opReadMemory:
      readMemorySerial();
      break;
    case opWriteMemory:
      writeMemorySerial();
      break;
    case opShowFrame:
      showFrame();
      break;
    default:
      error(errUnknownOperation);
      break;
  }
}

void handleSerial(uint8_t input) {
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
      error(errArgsTooLong);
      break;
  }
}




void showFrame() {
  usb.write(stsExecuting);
  usb.write(op);
  usb.write(48);
  usb.write(0);
  uint8_t pixels[48];
  for (uint8_t i = 0; i < 48; i++) {
    waitForSerial();
    pixels[i] = usb.read();
  }
  showFrame6b(pixels);
  closeUsbMsgAllOk();
}





void setMode() {
  uint8_t newMode = arg1;
  if (newMode > 2) {
    error(errInvalidArgs);
    return;
  }
  usb.write(stsExecuting);
  usb.write(op);
  closeUsbMsgAllOk();
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
void updateMyRandom(float f1, float f2) {
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





