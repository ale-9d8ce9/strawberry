#include <avr/wdt.h> // Watchdog Timer library
#include <EEPROM.h>

#define SERIAL_SPEED 9600
//#define SERIAL_CONF SERIAL_8N1
#define SERIAL_CONF SERIAL_8O2



#define log Serial.println
#define print Serial.print
#define usb Serial
#define rom EEPROM


void (*softReset)(void) = 0; // soft reboot
// full reboot
void hardReset() {
  wdt_enable(WDTO_15MS);
  while (1) {}
}



uint8_t op = 0;
uint16_t start = 0;
uint16_t end = 0;

uint32_t bytecount = 0;
uint32_t msgLength = 0;


void setup() {
  Serial.begin(SERIAL_SPEED, SERIAL_CONF);
  pinMode(LED_BUILTIN, OUTPUT);
  log("sys started");
  print("eeprom length: ");
  log(EEPROM.length());
}

void loop() {
  // put your main code here, to run repeatedly:
  while (Serial.available()) {
    handleSerial(usb.read());
    bytecount++;
  }
  if (msgLength != 0 && bytecount == msgLength) {
    executePayload();
  }
  if (bytecount > msgLength) {
    log("FATAL ERROR: message longer than expected");
    print("bytecount: ");
    print(bytecount);
    print(", expected length: ");
    log(msgLength);
    log("triggering hard reset in 1.5s");
    delay(1500);
    hardReset();
  }
  delay(500);
}

void executePayload() {
  bytecount = 0;

  log("PAYLOAD");
  print("op: ");
  log(op);
  print("start: ");
  log(start);
  print("end: ");
  log(end);

  msgLength == 0;
}

void handleSerial(uint8_t input) {
  if (bytecount == 0) {
    op = input;
    msgLength = 5;
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
    end = input;
    end = end << 8;
    return;
  }
  if (bytecount == 4) {
    end += input;
    return;
  }
}