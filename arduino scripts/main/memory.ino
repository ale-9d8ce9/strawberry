
uint8_t readMemory(uint16_t address) {
  if (address < 1024 * 2) {
    return readMem1(address);
  } else if (address < 1024 * 4) {
    return readMem2(address);
  } else {
    return readMemI(address);
  }
}
void writeMemory(uint16_t address, uint8_t data) {
  if (address < 1024 * 2) {
    writeMem1(address, data);
    return;
  } else if (address < 1024 * 4) {
    writeMem2(address, data);
    return;
  } else {
    writeMemI(address, data);
    return;
  }
}




void readMemorySerial() {
  uint16_t start = (arg1 << 8) + arg2;
  uint16_t end = start + arg3;

  if (end > 1024 * 5) {
    error(errRangeOutsideOfMemoryCapacity);
    return;
  }
  usb.write(stsExecuting);
  usb.write(op);
  usb.write(0);
  usb.write(end-start);

  for (uint16_t address = start; address < end; address++) {
    usb.write(readMemory(address));
  }
  closeUsbMsgAllOk();
}


void writeMemorySerial() {
  uint16_t start = (arg1 << 8) + arg2;
  uint16_t end = start + arg3;

  if (end > 1024 * 5) {
    error(errRangeOutsideOfMemoryCapacity);
    return;
  }
  usb.write(stsExecuting);
  usb.write(op);
  usb.write(end-start);
  usb.write(0);

  uint8_t value = 0;

  for (uint16_t address = start; address < end; address++) {
    waitForSerial();
    value = usb.read();
    writeMemory(address, value);
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
    error(errNoMem1);
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
    error(errNoMem1);
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
    error(errNoMem2);
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
    error(errNoMem2);
    return;
  }

  delay(5);
}




uint8_t readMemI(uint16_t address) {
  address &= 0b1111111111;
  return imem.read(address);
}
void writeMemI(uint16_t address, uint8_t data) {
  address &= 0b1111111111;
  imem.update(address, data);
}


