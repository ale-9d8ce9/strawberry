#include <avr/wdt.h> // Watchdog Timer library
#include <EEPROM.h>
//#include <FastLED.h>


#define SERIAL_SPEED 9600
#define SERIAL_CONF SERIAL_8O2 


#define stsBootComplete   0x1F
#define stsReady          0xD1
#define stsAllOk          0x0F
#define stsError          0xEE
#define stsFatalError     0xFE
#define stsExecuting      0xE0

#define opReadMemory    0x01 // (16 start, 8 offset)
#define opWriteMemory   0x02 // (16 start, 8 offset) + n data

#define errRangeOutsideOfMemoryCapacity   0x01
#define errUnknownOperation               0x02


#define usb Serial
#define rom EEPROM


void (*softReset)(void) = 0; // soft reboot
// full reboot
void hardReset() {
  wdt_enable(WDTO_15MS);
  while (1) {}
}
void waitForSerial() {
  while (usb.available() == 0) {}
}


uint8_t op = 0;
uint16_t start = 0;
uint16_t end = 0;

uint16_t bytecount = 0;
uint16_t msgLength = 0;


void setup() {
  usb.begin(SERIAL_SPEED, SERIAL_CONF);
  pinMode(LED_BUILTIN, OUTPUT);
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
}

void handleSerial(uint8_t input) {
  if (bytecount == 0) {
    op = input;
    msgLength = 4;
    if (op > 0x10) {
      msgLength = 1;
    }
    return;
  }
  if (bytecount == 1) {
    start = input;
    start = start << 8;
    return;
  }
  if (bytecount == 2) {
    start += input;
    return;
  }
  if (bytecount == 3) {
    end = start + input;
    return;
  }
}


void printEeprom(uint16_t start, uint16_t end) {
  usb.write(end-start);
  for (uint16_t i = start; i <= end; i++) {
    byte val = rom.read(i);
    usb.write(val);
  }
  usb.write(stsAllOk);
}

void writeEeprom(uint16_t start, uint16_t end) {
  usb.write(0);
  for (uint16_t i = start; i <= end; i++) {
    waitForSerial();
    byte value = usb.read();
    rom.update(i, value);
  }
  usb.write(stsAllOk);
}

