#include <avr/wdt.h> // Watchdog Timer library
#include <EEPROM.h>
#include <FastLED.h>


#define SERIAL_SPEED 115200
#define SERIAL_CONF SERIAL_8O1
#define BUTTON_PIN 7
#define GREEN_LED_PIN 2
#define RED_LED_PIN 10
#define LED_PIN 9
#define NUM_LEDS 64
#define ACCELEROMETER_ADDRESS 0x18


#define stsBootComplete   0x1F
#define stsReady          0xD1
#define stsWait           0xF0
#define stsAllOk          0x0F
#define stsError          0xEE
#define stsFatalError     0xFE
#define stsExecuting      0xE0

#define opReadMemory    0x83 // (16 start, 8 offset)
#define opWriteMemory   0x87 // (16 start, 8 offset) + n data
#define opShowConnectedLogo 0x29 // (8 bool)
#define opHardReset     0x20 // no args
#define opSoftReset     0x24 // no args
#define opShowFrame     0x04 // no args

#define errUnknown                        0x00
#define errRangeOutsideOfMemoryCapacity   0x01
#define errUnknownOperation               0x02
#define errArgsTooLong                    0x03
#define errInvalidArgs                    0x04


#define rom EEPROM
#define usb Serial
#define fled FastLED


uint8_t op = 0;
uint8_t arg1 = 0;
uint8_t arg2 = 0;
uint8_t arg3 = 0;

uint8_t bytecount = 0;
uint8_t msgLength = 0;

bool connectedLogo = false;

CRGB leds[NUM_LEDS];



void setup() {
  usb.begin(SERIAL_SPEED, SERIAL_CONF);
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(3, OUTPUT);

  fled.addLeds<WS2812B, LED_PIN, GRB>(leds, NUM_LEDS);
  fled.setBrightness(10);
  fill_solid(leds, NUM_LEDS, CRGB::Purple);
  fled.show();

  delay(50);
  digitalWrite(3, HIGH);

  usb.write(stsBootComplete);
  usb.write(stsAllOk);
  usb.write(stsReady);
}


void loop() {
  while (usb.available()) {
    handleSerial(usb.read());
    bytecount++;
    if (msgLength != 0 && bytecount == msgLength) {
      executePayload();
    }
  }
  delay(500);
  if (connectedLogo) {
    digitalWrite(13, !digitalRead(13));
  }
}


void (*softReset)(void) = 0; // soft reboot
// full reboot
void hardReset() {
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



void executePayload() {
  bytecount = 0;
  msgLength = 0;

  switch (op) {
    case opHardReset:
      hardReset();
      break;
    case opSoftReset:
      softReset();
      break;
    case opShowConnectedLogo:
      showConnectedLogo();
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



void readMemory() {
  uint16_t start = arg1 << 8 + arg2;
  uint16_t end = start + arg3;

  if (rom.length() <= end) {
    fatalError(errRangeOutsideOfMemoryCapacity);
    return;
  }
  usb.write(stsExecuting);
  usb.write(op);
  usb.write(0);
  usb.write(end-start);
  for (uint16_t i = start; i < end; i++) {
    byte val = rom.read(i);
    usb.write(val);
  }
  closeUsbMsgAllOk();
}

void writeMemory() {
  uint16_t start = arg1 << 8 + arg2;
  uint16_t end = start + arg3;

  if (rom.length() <= end) {
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
    rom.update(i, value);
  }
  closeUsbMsgAllOk();
}



void showConnectedLogo() {
  uint8_t show = arg1;
  if (show != 0x00 && show != 0x01) {
    error(errInvalidArgs);
    return;
  }
  usb.write(stsExecuting);
  usb.write(op);
  usb.write(0x00);
  usb.write(0x01);
  usb.write(connectedLogo);
  connectedLogo = show;
  digitalWrite(13, 0);
  closeUsbMsgAllOk();
}

