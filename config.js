const config = {
    serialSpeed: 115200,
    updateSerialMonitor: true,
    logAllSerial: false,

    serialMinWaitForResponse: 25,
    serialResponseWaitCheck: 25
}

const defs = {
    status: {
        bootComplete: '1F',
        ready: 'D1',
        wait: 'F0',
        allOk: '0F',
        error: 'EE',
        fatalError: 'FE',
        executing: 'E0'
    },
    operations: {
        readMemory: {
            code: '01',
            needsArgs: true,
            needsOtherData: false,
            returnsData: true,
            argsLength: 3,
        },
        writeMemory: {
            code: '02',
            needsArgs: true,
            needsOtherData: true,
            argsLength: 3,
            returnsData: false
        },
        showConnectedLogo: {
            code: '03',
            needsArgs: true,
            needsOtherData: false,
            argsLength: 1,
            returnsData: true
        },
        hardReset: {
            code: '04',
            needsArgs: false,
            needsOtherData: false,
            returnsData: false
        },
        softReset: {
            code: '05',
            needsArgs: false,
            needsOtherData: false,
            returnsData: false
        },
    },
    errors: new Map([
        ['01','rangeOutsideOfMemoryCapacity'],
        ['02','unknownOperation'],
        ['03','ArgsTooLong'],
        ['04','InvalidArgs'],
    ]),
    dataTypes: ['8b','6b','4b','3bc']
}