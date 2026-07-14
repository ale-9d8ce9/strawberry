#include <Wire.h>
#include <Adafruit_LIS3DH.h>
#include <Adafruit_Sensor.h>

Adafruit_LIS3DH lis = Adafruit_LIS3DH();

// Define a threshold (in degrees). The board must tilt past this 
// angle to trigger a direction. This prevents jitter when laying flat.
const float TILT_THRESHOLD = 15.0; 

// Labels corresponding to our array indices for easy reading
const char* directionLabels[] = {
  "Top", "Top-Left", "Left", "Bottom-Left", 
  "Bottom", "Bottom-Right", "Right", "Top-Right"
};

void setup() {
  Serial.begin(9600);
  while (!Serial) delay(10);

  if (!lis.begin(0x18)) {
    Serial.println("Could not find a valid LIS3DH sensor!");
    while (1) yield();
  }
  lis.setRange(LIS3DH_RANGE_2_G);   
}

void loop() {
  sensors_event_t event;
  lis.getEvent(&event);

  float x = event.acceleration.x;
  float y = event.acceleration.y;
  float z = event.acceleration.z;

  // 1. Calculate basic Roll and Pitch
  float roll  = atan2(y, z) * RAD_TO_DEG;
  float pitch = atan2(-x, sqrt(y * y + z * z)) * RAD_TO_DEG;

  // 2. Initialize your boolean array to all false [Top, Top-Left, Left, ...]
  bool directions[8] = {false, false, false, false, false, false, false, false};

  // 3. Check total overall tilt magnitude 
  float totalTilt = sqrt(pitch * pitch + roll * roll);

  if (totalTilt > TILT_THRESHOLD) {
    // Calculate full 360-degree angle. 
    // We pass (-roll, pitch) so that 0 degrees points cleanly to "Top"
    float angle = atan2(-roll, pitch) * RAD_TO_DEG;
    if (angle < 0) angle += 360.0; // Normalize from [-180, 180] to [0, 360]

    // Divide the 360° circle into 8 slices of 45° each.
    // Adding 22.5° shifts the window so "Top" spans from -22.5° to +22.5°
    int index = (int)((angle + 22.5) / 45.0) % 8;

    // Set the active direction to true
    directions[index] = true;
  }

  // 4. Debug output: Print the current state of the array
  printArrayState(directions);

  delay(200); 
}

// Helper function to visualize the array in the Serial Monitor
void printArrayState(bool arr[]) {
  bool anyActive = false;
  
  Serial.print("[");
  for (int i = 0; i < 8; i++) {
    Serial.print(arr[i] ? "1" : "0");
    if (i < 7) Serial.print(", ");
    if (arr[i]) anyActive = true;
  }
  Serial.print("] -> ");

  if (anyActive) {
    for (int i = 0; i < 8; i++) {
      if (arr[i]) Serial.println(directionLabels[i]);
    }
  } else {
    Serial.println("Centered / Flat");
  }
}