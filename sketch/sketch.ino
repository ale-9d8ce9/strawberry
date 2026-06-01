#include <avr/wdt.h> // Watchdog Timer library

#define SERIAL_SPEED 9600
#define SERIAL_CONF SERIAL_8O2



#define log Serial.println
#define usb Serial


void (*softReset)(void) = 0; // soft reboot
// full reboot
void hardReset() {
  wdt_enable(WDTO_15MS);
  while (1) {}
}


void setup() {
  Serial.begin(SERIAL_SPEED);
  pinMode(LED_BUILTIN, OUTPUT);
  log("sys started");
}

void loop() {
  // put your main code here, to run repeatedly:
  if (Serial.available()) {
    char a = usb.read();
    usb.write(a);
    handleSerial(a);
  }
  delay(500);
}


void handleSerial(char b) {
  char c = (char) b;
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