class Project {
    constructor(args) {
        if (!defs.dataTypes.includes(args.dataType)) {
            throw new Error("unknown data type "+args.dataType);
            return
        }
        this.frames = []
        this.dataType = args.dataType
        
    }
}

class Frame {
    constructor(args) {
        if (!defs.dataTypes.includes(args.dataType)) {
            throw new Error("unknown data type "+args.dataType);
            return
        }
        this.type = args.type
        this.leds = [
            [0,0,0,0, 0,0,0,0],
            [0,0,0,0, 0,0,0,0],
            [0,0,0,0, 0,0,0,0],
            [0,0,0,0, 0,0,0,0],

            [0,0,0,0, 0,0,0,0],
            [0,0,0,0, 0,0,0,0],
            [0,0,0,0, 0,0,0,0],
            [0,0,0,0, 0,0,0,0]
        ]
    }

    async write(projectStart, n) {
        if (projectStart === undefined || n === undefined) {
            throw new Error("arguments projectStart and n needed for Frame");
            return
        }
        let ledData = this.exportLedData()
        let start = projectStart + (n * ledData.length /2)
        let x = await payloads.writeMemory(start, ledData.length /2, ledData)
        return x
    }

    exportLedData() {
        let data = ''
        for (let row = 0; row < this.leds.length; row++) {
            for (let col = 0; col < this.leds[row].length; col++) {
                const pixel = this.leds[row][col];
                let hex = intToHex(pixel)
                data += hex
            }
        }
        return data
    }

    async checkWrittenData(projectStart, n) {
        if (projectStart === undefined || n === undefined) {
            throw new Error("arguments projectStart and n needed for Frame");
            return
        }
        let ledData = this.exportLedData()
        let start = projectStart + (n * ledData.length /2)
        let ledDataWritten = await payloads.readMemory(start, ledData.length /2)
        if (!ledDataWritten.ok) {
            return ledDataWritten
        }
        return ledDataWritten.response.join('') === ledData
    }
}

