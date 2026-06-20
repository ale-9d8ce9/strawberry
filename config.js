const config = {
    serialSpeed: 115200,
    updateSerialMonitor: true,
    logAllSerial: false,

    transitionSpeed: {
        normal: 0.3,
        ledsRotation: 1
    },

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
            code: '31',
            needsArgs: true,
            needsOtherData: false,
            returnsData: true,
            argsLength: 3,
        },
        writeMemory: {
            code: '32',
            needsArgs: true,
            needsOtherData: true,
            argsLength: 3,
            returnsData: false
        },
        showConnectedLogo: {
            code: '11',
            needsArgs: true,
            needsOtherData: false,
            argsLength: 1,
            returnsData: true
        },
        hardReset: {
            code: '02',
            needsArgs: false,
            needsOtherData: false,
            returnsData: false
        },
        softReset: {
            code: '01',
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
            maxFrames: 79,
            paletteImage: '8bColors.png',
            pickerSize: {x: 8, y: 8},
            colors: ['#FFFFFF', '#ECEAEE', '#C0C2C4', '#979395', '#69696C', '#3D3F3D', '#131412', '#000000', '#F9DDDE', '#FEF0D6', '#F7FFDB', '#D9FFE4', '#D7FFFF', '#D6E4FD', '#EDD9FD', '#FFD3F1', '#EE9897', '#FFD989', '#DFFF8B', '#8EFFAF', '#89FFFE', '#8CAFFD', '#C789FE', '#FF8BD4', '#E55754', '#FCC23A', '#CCFD3B', '#3EFF73', '#3BFBFF', '#3F77FE', '#A13CFF', '#FD3DBC', '#D2231F', '#ECA600', '#B1EE00', '#03EE47', '#00E8F0', '#044AEE', '#7B01EC', '#EE0099', '#931514', '#A97300', '#7FAA00', '#03A82D', '#00A4A8', '#0135AB', '#5800A9', '#A8006B', '#580E0C', '#644500', '#496501', '#03621A', '#006664', '#032066', '#350065', '#640040', '#1F0502', '#211500', '#192402', '#00240A', '#002221', '#00091E', '#110023', '#240014']
        }],
        ['6b', {
            maxFrames: 79,
            paletteImage: '6bColors.png',
            pickerSize: {x: 8, y: 8},
            colors: [ "#000000", "#000055", "#0000AA", "#0000FF", "#005500", "#005555", "#0055AA", "#0055FF", "#00AA00", "#00AA55", "#00AAAA", "#00AAFF", "#00FF00", "#00FF55", "#00FFAA", "#00FFFF", "#550000", "#550055", "#5500AA", "#5500FF", "#555500", "#555555", "#5555AA", "#5555FF", "#55AA00", "#55AA55", "#55AAAA", "#55AAFF", "#55FF00", "#55FF55", "#55FFAA", "#55FFFF", "#AA0000", "#AA0055", "#AA00AA", "#AA00FF", "#AA5500", "#AA5555", "#AA55AA", "#AA55FF", "#AAAA00", "#AAAA55", "#AAAAAA", "#AAAAFF", "#AAFF00", "#AAFF55", "#AAFFAA", "#AAFFFF", "#FF0000", "#FF0055", "#FF00AA", "#FF00FF", "#FF5500", "#FF5555", "#FF55AA", "#FF55FF", "#FFAA00", "#FFAA55", "#FFAAAA", "#FFAAFF", "#FFFF00", "#FFFF55", "#FFFFAA", "#FFFFFF" ]
        }]
    ])
}