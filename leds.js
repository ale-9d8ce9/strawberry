class Project {
    constructor(args) {
        if (!defs.dataTypes.includes(args.dataType)) {
            throw new Error("unknown data type "+args.dataType);
            return
        }
        this.dataType = args.dataType
        this.selectedColor = 0
        this.selectedFrame = 0
        this.colorConfig = defs.colorConfigs.get(this.dataType)
        this.colors = this.colorConfig.colors
        this.frames = []
        this.addFrame()
        this.updateColorPicker()
    }

    addFrame(frame) {
        let nframe
        if (frame) {
            nframe = frame
        } else {
            nframe = new Frame({
                dataType: this.dataType
            })
        }
        this.frames.push(nframe)
    }

    updateColorPicker() {
        const canvas = document.getElementById('picker')
        canvas.width = this.colorConfig.pickerSize.x
        canvas.height = this.colorConfig.pickerSize.y

        const ctx = canvas.getContext("2d")
        for (let i = 0; i < this.colors.length; i++) {

            let x = i % this.colorConfig.pickerSize.y
            let y = parseInt(i / this.colorConfig.pickerSize.y)
            
            ctx.fillStyle = this.colors[i];
            ctx.fillRect(x,y,1,1)
        }

        document.getElementById('picker').addEventListener('click', (e) => {
            const pos = diviteTouchTargetInGrid(e, 8, 8)
            leds.currentProject.selectedColor = pos.y * 8 + pos.x
            console.log(leds.currentProject.selectedColor)
        })
    }

    paint(pos) {
        this.frames[this.selectedFrame].leds[pos.y][pos.x] = this.selectedColor
        this.frames[this.selectedFrame].render()
    }
}

class Frame {
    constructor(args) {
        if (!defs.dataTypes.includes(args.dataType)) {
            throw new Error("unknown data type "+args.dataType);
            return
        }
        this.type = args.dataType
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
    render() {
        for (let row = 0; row < this.leds.length; row++) {
            for (let col = 0; col < this.leds[row].length; col++) {
                const colorIndex = this.leds[row][col];
                let ledIndex = row * this.leds[row].length + col
                document.getElementsByClassName('led')[ledIndex].style.backgroundColor = leds.currentProject.colors[colorIndex]
            }        
        }
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




leds = {}

document.getElementById('leds').addEventListener('mousemove', (e) => {
    if (e.buttons !== 1) {
        return
    }
    const pos = diviteTouchTargetInGrid(e, 8, 8, document.getElementById('leds'))
    leds.currentProject.paint(pos)
})
document.getElementById('leds').addEventListener('mousedown', (e) => {
    const pos = diviteTouchTargetInGrid(e, 8, 8, document.getElementById('leds'))
    leds.currentProject.paint(pos)
})


leds.init = async function () {
    let html = ''
    for (let i = 0; i < 64; i++) {
        html += '<led class="led"></led>'
    }
    document.getElementById('leds').innerHTML = html

    leds.currentProject = new Project({
        dataType: '8b'
    })
    leds.currentProject.frames[0].render()
}
