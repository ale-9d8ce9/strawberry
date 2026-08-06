


void initAnimation() {
  uint16_t projectStart;
  projectStart = readMemory(0) << 8;
  projectStart += readMemory(1);
  framesDataStart = projectStart + PROJECT_HEADER_SIZE;

  nFrames = readMemory(projectStart);
  fps = readMemory(projectStart +1);
  maxBrightness = readMemory(projectStart +2);
  uint8_t others = readMemory(projectStart +3);

  buttonSwitchMode = others & 1;              others = others >> 1;
  animationRotation = others & 0b11;          others = others >> 2;
  colorCompressionAlgorithm = others & 0b111; others = others >> 3;
  autoBrightness = others & 1;                others = others >> 1;
  defaultModeWhenBooting =  others & 1;    // others = others >> 1;
}




// 6b



void setLedColor6b(uint8_t led, uint8_t bits) {
  uint8_t r = bits & 0b11000000;
  uint8_t g = (bits << 2) & 0b11000000;
  uint8_t b = (bits << 4) & 0b11000000;
  leds[led] = CRGB(r, g, b);
}

void showFrame6b(uint8_t data[]) {
  uint8_t index = 0;
  for (uint8_t led = 0; led < 64; ) {

    uint8_t byteA = data[index];    index++;
    uint8_t byteB = data[index];    index++;
    
    uint8_t bits = byteA & 0b11111100;  // use the first 6 bits of byte1 for led1
    setLedColor6b(led, bits);       led++;

    bits = (byteA & 0b00000011) << 2; // move the lower 2 bits of byte1 into the lower bits of led2
    bits |= byteB & 0b11110000;  // add the 4 high bits of byte2 into high bits of led2
    setLedColor6b(led, bits);       led++;

    byteA = data[index];    index++; // byte1 is useless, switch to byte3

    bits = byteA & 0b11000000; // add the 2 high bits of byte3 into the high bits of led3
    bits |= (byteB & 0b00001111) << 2;  // move the 4 high bits of byte2 into low bits of led3
    setLedColor6b(led, bits);       led++;

    bits = (byteA & 0b00111111) << 2; 
    setLedColor6b(led, bits);       led++;
  }
  fled.show();
}



// 8b


void setLedColor8b(uint8_t led, uint8_t colorIndex) {
  uint8_t rgb[3];
  memcpy_P(rgb, colors8b[colorIndex], 3);
  leds[led] = CRGB(rgb[0], rgb[1], rgb[2]);
}

