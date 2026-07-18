#include <Wire.h>
#include <Wire1.h>
#include <EEPROM.h>

#define mem1 Wire1
#define mem2 Wire
#define imem EEPROM
#define usb Serial

void setup() {
  Wire.begin();
  Wire1.begin();
  Serial.begin(9600);
  while (!Serial); 

  unsigned int memoryAddress = 300; 

  Serial.print("writing at address ");
  Serial.println(memoryAddress);

  writeMem2(memoryAddress, 0xfa);
  uint8_t data = readMem2(memoryAddress);
  
  Serial.print("reading at address");
  Serial.print(": ");
  Serial.println(data, 16);
}

void loop() {
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







