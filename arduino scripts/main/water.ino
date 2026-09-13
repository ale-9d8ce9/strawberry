struct particle {
  uint8_t x;
  uint8_t y;
};
struct particle wp[128];
uint8_t cells[8][8];

int8_t gx, gy, wx, wy;
bool xIsStronger;

CRGB levelColors[waterLevels];


uint8_t rng = 0x69;
inline bool random50() {
  rng ^= rng << 3;
  rng ^= rng >> 5;
  rng ^= rng << 1;
  return rng & 1;
}


inline bool tryMoveP(uint8_t& cx, uint8_t& cy, uint8_t nx, uint8_t ny) {
  if (nx > 7 || ny > 7 || cells[nx][ny] == waterLevels) {
    return false;
  }

  cells[cx][cy]--;
  cells[nx][ny]++;
  cx = nx;
  cy = ny;
  return true;
}


inline bool down(uint8_t& x, uint8_t& y) {
  uint8_t xc = x + gx;
  uint8_t yc = y + gy;

  return tryMoveP(x, y, xc, yc);
}



inline bool downSideDiag(uint8_t& x, uint8_t& y) {
  uint8_t xc = x + gx;
  uint8_t yc = y + gy;

  if (xIsStronger && tryMoveP(x, y, xc, y)) {
    return true;
  }

  if (tryMoveP(x, y, x, yc)) {
    return true;
  }

  if (!xIsStronger && tryMoveP(x, y, xc, y)) {
    return true;
  }

  return false;
}


inline bool downSideStraight(uint8_t& x, uint8_t& y) {
  if (xIsStronger) {
    if (tryMoveP(x,y, x+gx, y+wx)) {
      return true;
    } else if (tryMoveP(x,y, x+gx, y-wx)) {
      return true;
    }
  } else {
    if (tryMoveP(x,y, x+wy, y+gy)) {
      return true;
    } else if (tryMoveP(x,y, x-wy, y+gy)) {
      return true;
    }
  }

  return false;
}



inline bool downSide(uint8_t& x, uint8_t& y) {
  if (gx == 0 || gy == 0) {
    return downSideStraight(x, y);
  } else {
    return downSideDiag(x, y);
  }
}



inline bool sideDiag(uint8_t& x, uint8_t& y) {
  if (xIsStronger && tryMoveP(x, y, x+gx, y-gy)) {
    return true;
  }

  if (tryMoveP(x, y, x-gx, y+gy)) {
    return true;
  }

  if (!xIsStronger && tryMoveP(x, y, x+gx, y-gy)) {
    return true;
  }

  return false;
}


inline bool sideStraight(uint8_t& x, uint8_t& y) {
  if (xIsStronger) {
    if (tryMoveP(x,y, x, y+wy)) {
      return true;
    } else if (random50() && tryMoveP(x,y, x, y-wy)) {
      return true;
    }
  } else {
    if (tryMoveP(x,y, x+wx, y)) {
      return true;
    } else if (random50() && tryMoveP(x,y, x-wx, y)) {
      return true;
    }
  }

  return false;
}



inline bool side(uint8_t& x, uint8_t& y) {
  if (gx == 0 || gy == 0) {
    return sideStraight(x, y);
  } else {
    return sideDiag(x, y);
  }
}


inline void tickParticle(uint8_t i) {
  uint8_t& x = wp[i].x;
  uint8_t& y = wp[i].y;

  if (down(x, y)) {
    return;
  }
  if (downSide(x, y)) {
    return;
  }
  if (side(x, y)) return;
}


void tickWaterSimulation() {
  readG();

  for (uint8_t i = 0; i < waterAmount; i++) {
    tickParticle(i);
  }

  fled.clear();
  for (uint8_t x = 0; x < 8; x++) {
    for (uint8_t y = 0; y < 8; y++) {
      uint8_t level = cells[x][y];
      if (level != 0) {
        uint8_t led = ledIndexFromXY(x, y);
        leds[led] = levelColors[level-1];
      }
    }
  }
  fled.show();
  return;
}


void initWater() {
  for (uint8_t i = 0; i < waterLevels; i++) {
    levelColors[waterLevels - i -1] = CRGB(waterColorR >> i, waterColorG >> i, waterColorB >> i);
  }

  for (uint8_t x = 0; x < 8; x++) {
    for (uint8_t y = 0; y < 8; y++) {
      cells[x][y] = 0;
    }
  }

  for (uint8_t i = 0; i < waterAmount; i++) {
    uint8_t x = i % 8;
    uint8_t y = i / 8;
    wp[i].x = x;
    wp[i].y = y;
    cells[x][y] = 1;
  }
}


void readG() {
  sensors_event_t event; 
  lis.getEvent(&event);
  float ax = event.acceleration.x;
  float ay = event.acceleration.y;
  gx = (ax > 1) - (ax < -1);
  gy = (ay > 1) - (ay < -1);
  wx = ax > 0 ? 1 : -1 ;
  wy = ay > 0 ? 1 : -1 ;
  xIsStronger = fabs(ax) > fabs(ay);
}


