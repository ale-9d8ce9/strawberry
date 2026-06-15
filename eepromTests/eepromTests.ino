//#include <avr/wdt.h> // Watchdog Timer library
#include <EEPROM.h>
#include <FastLED.h>


#define SERIAL_SPEED 115200
#define SERIAL_CONF SERIAL_8O1
#define LED_PIN 6
#define NUM_LEDS 64

#define stsBootComplete   0x1F
#define stsReady          0xD1
#define stsWait           0xF0
#define stsAllOk          0x0F
#define stsError          0xEE
#define stsFatalError     0xFE
#define stsExecuting      0xE0

#define opReadMemory    0x01 // (16 start, 8 offset)
#define opWriteMemory   0x02 // (16 start, 8 offset) + n data
#define opShowConnectedLogo 0x03 // (8 start [bool], 16 any)
#define opHardReset     0x04 // no args
#define opSoftReset     0x05 // no args

#define errRangeOutsideOfMemoryCapacity   0x01
#define errUnknownOperation               0x02
#define errArgsTooLong                    0x03
#define errInvalidArgs                    0x04


#define usb Serial
#define rom EEPROM


void (*softReset)(void) = 0; // soft reboot
// full reboot
void hardReset() {
  usb.write(stsAllOk);
  usb.write(stsWait);
//  wdt_enable(WDTO_15MS);
  while (1) {}
}


void waitForSerial() {
  while (usb.available() == 0) {}
}
void closeUsbMsgAllOk() {
  usb.write(stsAllOk);
  usb.write(stsReady);
}

uint8_t op = 0;
uint8_t arg1 = 0;
uint8_t arg2 = 0;
uint8_t arg3 = 0;

uint16_t bytecount = 0;
uint16_t msgLength = 0;

bool connectedLogo = false;

CRGB leds[NUM_LEDS];

void setup() {
  usb.begin(SERIAL_SPEED, SERIAL_CONF);
  pinMode(LED_BUILTIN, OUTPUT);
  FastLED.addLeds<WS2812B, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(50);
  fill_solid(leds, NUM_LEDS, CRGB::Red);
  FastLED.show();
  usb.write(stsBootComplete);
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

  uint16_t start = (arg1 << 8) | arg2;
  uint16_t end = start + arg3;

  if (rom.length() <= end) {
    fatalError(errRangeOutsideOfMemoryCapacity);
    return;
  }

  usb.write(stsExecuting);
  usb.write(op);

  if (op == opReadMemory) {
    printEeprom(start, end);
    return;
  }
  if (op == opWriteMemory) {
    writeEeprom(start, end);
    return;
  }
  if (op == opSoftReset) {
    usb.write(stsAllOk);
    usb.write(stsWait);
    softReset();
    return;
  }
  if (op == opHardReset) {
    hardReset();
    return;
  }
  if (op == opShowConnectedLogo) {
    showConnectedLogo(arg1);
    return;
  }
}

void handleSerial(uint8_t input) {
  switch (bytecount) {
    case 0:
      op = input;
      msgLength = 1;
      if (op < opHardReset) {
        msgLength = 4;
      }
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



void printEeprom(uint16_t start, uint16_t end) {
  usb.write((uint8_t)0);
  usb.write(end-start);
  for (uint16_t i = start; i < end; i++) {
    byte val = rom.read(i);
    usb.write(val);
  }
  closeUsbMsgAllOk();
}

void writeEeprom(uint16_t start, uint16_t end) {
  usb.write(end-start);
  usb.write((uint8_t)0);
  for (uint16_t i = start; i < end; i++) {
    waitForSerial();
    byte value = usb.read();
    rom.update(i, value);
  }
  closeUsbMsgAllOk();
}


void showConnectedLogo(bool show) {
  if (show != 0x00 && show != 0x01) {
    error(errInvalidArgs);
    return;
  }
  usb.write((uint8_t)0x00);
  usb.write(0x01);
  usb.write(connectedLogo);
  connectedLogo = show;
  digitalWrite(13, 0);
  closeUsbMsgAllOk();
}