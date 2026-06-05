#include <avr/wdt.h> // Watchdog Timer library
#include <EEPROM.h>

#define SERIAL_SPEED 9600
#define SERIAL_CONF SERIAL_8N1
//#define SERIAL_CONF SERIAL_8O2



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


void setup() {
  Serial.begin(SERIAL_SPEED, SERIAL_CONF);
  pinMode(LED_BUILTIN, OUTPUT);
  log("sys started");
  print("eeprom length: ");
  log(EEPROM.length());
  EEPROM.write(2,0);
}

void loop() {
  // put your main code here, to run repeatedly:
  while (Serial.available()) {
    char a = usb.read();
    //usb.write(a);
    handleSerial(a);
  }
  delay(500);
}


void printEeprom(){
  log("printing from 0 to 8");
  for (int i = 0; i < 8; i++) {
    log(EEPROM.read(i));
  }
}



void handleSerial(char b) {
  char c = (char) b;
  if (c=='e') {
    printEeprom();
  }
  if (c == 'l') {
    digitalWrite(LED_BUILTIN, LOW);
  }
  if (c == 'L') {
    digitalWrite(LED_BUILTIN, HIGH);
  }
  if (c == 's') {
    log("soft reset");
    delay(1000);
    softReset();
  }
  if (c == 'f') {
    log("full reset");
    delay(1000);
    hardReset();
  }
}