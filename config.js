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

    dataTypes: ['8b','6b'],
    colorConfigs: new Map([
        ['8b', {
            maxFrames: 60,
            paletteImage: '8bColors.png',
            pickerSize: {x: 8, y: 8},
            colors: ['#FFFFFF', '#ECEAEE', '#C0C2C4', '#979395', '#69696C', '#3D3F3D', '#131412', '#000000', '#F9DDDE', '#FEF0D6', '#F7FFDB', '#D9FFE4', '#D7FFFF', '#D6E4FD', '#EDD9FD', '#FFD3F1', '#EE9897', '#FFD989', '#DFFF8B', '#8EFFAF', '#89FFFE', '#8CAFFD', '#C789FE', '#FF8BD4', '#E55754', '#FCC23A', '#CCFD3B', '#3EFF73', '#3BFBFF', '#3F77FE', '#A13CFF', '#FD3DBC', '#D2231F', '#ECA600', '#B1EE00', '#03EE47', '#00E8F0', '#044AEE', '#7B01EC', '#EE0099', '#931514', '#A97300', '#7FAA00', '#03A82D', '#00A4A8', '#0135AB', '#5800A9', '#A8006B', '#580E0C', '#644500', '#496501', '#03621A', '#006664', '#032066', '#350065', '#640040', '#1F0502', '#211500', '#192402', '#00240A', '#002221', '#00091E', '#110023', '#240014']
        }]
    ])
}