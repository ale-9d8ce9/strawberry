
#include <stdint.h>
#include <stdio.h>




void printColor(uint8_t r, uint8_t g, uint8_t b, uint8_t change) {
    r = (r & 0b11) * change;
    g = (g & 0b11) * change;
    b = (b & 0b11) * change;
    printf(", \"#%02X%02X%02X\"", r, g, b);
}




void generate6bColors() {
    uint8_t change = 256 / 0b11;


    for (uint8_t r = 0; r < 4; r++) {
        for (uint8_t g = 0; g < 4; g++) {
            for (uint8_t b = 0; b < 4; b++) {
                printColor(r, g, b, change);
            }
        }
    }
}



int main() {
    printf("[ ");
    generate6bColors();
    printf(" ]\n\n");
    return 0;
}