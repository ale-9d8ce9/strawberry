```

#define SERIAL_SPEED 115200
#define SERIAL_CONF SERIAL_8O1
#define LED_PIN 6
#define NUM_LEDS 64

#define stsBootComplete   0x1F
#define stsReady          0xD1
#define stsWait           0xF0
#define stsAllOk          0x0F
#define stsError          0xEE
#define stsFatalError     0xFE
#define stsExecuting      0xE0

#define opReadMemory    0x31 // (16 start, 8 offset)
#define opWriteMemory   0x32 // (16 start, 8 offset) + n data
#define opShowConnectedLogo 0x11 // (8 bool)
#define opHardReset     0x02 // no args
#define opSoftReset     0x01 // no args

#define errRangeOutsideOfMemoryCapacity   0x01
#define errUnknownOperation               0x02
#define errArgsTooLong                    0x03
#define errInvalidArgs                    0x04

```
payload:
send:
    op, (arg1, arg2, arg3)
receive [header]
    status, code, input, output
(send)
    data
(receive)
    output
receive
    status