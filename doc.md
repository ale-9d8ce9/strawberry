```
#define SERIAL_SPEED 9600
#define SERIAL_CONF SERIAL_8O2 


#define stsBootComplete   0x1F
#define stsReady          0xD1
#define stsAllOk          0x0F
#define stsError          0xEE
#define stsFatalError     0xFE
#define stsExecuting      0xE0

#define opReadMemory    0x01 // (16 start, 8 offset)
#define opWriteMemory   0x02 // (16 start, 8 offset) + n data

#define errRangeOutsideOfMemoryCapacity   0x01
#define errUnknownOperation               0x02

```
payload:
send:
    op, (start, start, offset)
receive
    status, (input, output)
(send)
    data
(receive)
    output
receive
    status