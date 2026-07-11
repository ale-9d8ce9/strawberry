const config = {
    serialSpeed: 115200,
    updateSerialMonitor: true,
    logAllSerial: false,

    transitionSpeed: {
        fast: 0.15,
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
        ['01','range outside of memory capacity'],
        ['02','unknown operation'],
        ['03','args too long'],
        ['04','invalid args'],
    ]),

    dataTypes: ['8b','6b'],
    colorConfigs: new Map([
        ['8b', {
            maxFrames: 79,
            paletteImage: '8bColors.png',
            pickerSize: {x: 16, y: 16},
            defaultColor: 0,
            colors: [ "#FFFFFF", "#FAFAFA", "#E6E6E6", "#D3D3D3", "#C0C0C0", "#ACACAC", "#9C9C9C", "#878787", "#757575", "#666666", "#525252", "#3E3E3E", "#2D2D2D", "#1B1B1B", "#050505", "#000000", "#FEE1E3", "#FFE3E1", "#FFEFDF", "#FBF9E0", "#FAFFDD", "#EFFDDF", "#DFFFE1", "#DDFDEC", "#DEFFF8", "#DDFBFF", "#E0EFFF", "#E3E4FD", "#EBDFFF", "#F7E0FF", "#FEDEF9", "#FDE1F1", "#FAA3A4", "#FFB39F", "#FFD3A4", "#FAF39F", "#F3FF9D", "#D2FEA3", "#A8FFAD", "#A1FDCE", "#A3FFEF", "#A3EFFF", "#9ECCFF", "#A7AFFF", "#C1A1FF", "#E6A0FD", "#FB9DEB", "#FF9FCC", "#F86767", "#FF8064", "#FFB561", "#F6E663", "#EBFF62", "#B0FF61", "#6CFF71", "#62FFAE", "#63FDE8", "#65E0FE", "#61ACFE", "#6A77FD", "#8E5EFF", "#D463FD", "#F762E4", "#FF60AE", "#F72D2D", "#FE5425", "#FE9626", "#F2DF25", "#E2FF27", "#92FE21", "#32FF41", "#24FE8E", "#23FFDE", "#21D7FF", "#218AFF", "#2D47FF", "#6623FF", "#C023FE", "#F627D4", "#FE218C", "#E10707", "#E92B02", "#E87A00", "#DBC400", "#CAE600", "#75E800", "#10EA22", "#00E86F", "#00E7C4", "#00BEE8", "#016EE9", "#0F25E5", "#5000E6", "#AA00E8", "#DF01BE", "#E5016E", "#CD0305", "#D12C02", "#D26C02", "#C5B102", "#B5D002", "#68D301", "#0BD31D", "#00D365", "#02D0B4", "#02A9D1", "#0063D1", "#0A1CD2", "#4A00D2", "#9500CE", "#C501A9", "#CE0062", "#B60503", "#B82300", "#BB6100", "#B0A102", "#A2BC00", "#61B600", "#0BBA19", "#00B958", "#02B89D", "#0095B9", "#005BBC", "#0C1EBA", "#3B01B8", "#8A00BC", "#B40196", "#BA005A", "#9D0406", "#A11D00", "#A45600", "#9C8D00", "#8BA000", "#55A402", "#0CA116", "#00A24F", "#02A38D", "#0182A0", "#004DA0", "#0817A0", "#3900A4", "#7500A1", "#990085", "#A30050", "#8A0203", "#8C1A00", "#894500", "#7F7202", "#768A00", "#478A00", "#088C18", "#008A43", "#028B77", "#02728B", "#00448B", "#0A178B", "#33008F", "#64008B", "#86006E", "#8C0243", "#6F0203", "#711600", "#723D01", "#6D6300", "#667500", "#3B7400", "#097410", "#007437", "#007361", "#025D73", "#013972", "#050E74", "#290074", "#540073", "#6C025C", "#710137", "#570103", "#5A1001", "#5A3100", "#595001", "#4E5D02", "#2D5A00", "#055B0E", "#005C2C", "#005B4E", "#004B5D", "#012D5D", "#030E5C", "#1D025C", "#45005E", "#54004B", "#5E012E", "#420100", "#460C00", "#422400", "#403C00", "#3B4200", "#214700", "#04430A", "#00441F", "#004438", "#013744", "#012046", "#030A44", "#160244", "#300043", "#43003B", "#430020", "#2C0103", "#2E0900", "#2D1700", "#2B2701", "#262B00", "#183001", "#032E09", "#012C16", "#012C27", "#01242D", "#00152F", "#04062E", "#10022E", "#200030", "#2C0025", "#2F0014", "#160100", "#160400", "#150D02", "#151300", "#131402", "#0D1602", "#011603", "#001409", "#011513", "#001216", "#000B15", "#010315", "#070014", "#100017", "#150011", "#160009", "#000000", "#000202", "#020002", "#020000", "#000002", "#000001", "#020000", "#000100", "#010000", "#010000", "#000200", "#000100", "#020000", "#000002", "#000000", "#000100" ]
        }],
        ['6b', {
            maxFrames: 79,
            paletteImage: '6bColors.png',
            pickerSize: {x: 8, y: 8},
            defaultColor: 28,
            colors: ["#000000", "#010058", "#0001AD", "#0203FE", "#FE02FD", "#FE02AB", "#FD0157", "#FF0102", "#045300", "#015356", "#0053A9", "#0156FF", "#FF58FF", "#FB55A8", "#FD5257", "#FD5401", "#02A802", "#00A655", "#00A9AC", "#03AAFE", "#FFA9FC", "#FEAAAB", "#FEAB57", "#FFAA01", "#01FE00", "#00FE59", "#00FFAB", "#01FDFD", "#FFFFFF", "#FEFFAC", "#FDFE55", "#FFFF02", "#54FD00", "#53FE58", "#53FFAC", "#54FEFE", "#AAFFFF", "#A9FEAB", "#A6FD55", "#ACFF00", "#57A700", "#54AA59", "#53ADAA", "#55A8FE", "#A9ABFF", "#A8ACAD", "#A7AA56", "#ABAA02", "#575300", "#555156", "#5355AC", "#5654FF", "#AB57FD", "#A957AC", "#A75356", "#AB5602", "#540000", "#550053", "#5302AB", "#5601FC", "#AC04FD", "#AA02AD", "#A70055", "#AB0001"]
        }]
    ])
}