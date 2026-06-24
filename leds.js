class Project {
    constructor(args) {
        if (!defs.dataTypes.includes(args.dataType)) {
            throw new Error("unknown data type "+args.dataType);
            return
        }
        this.dataType = args.dataType
        this.selectedColor = 0
        this.selectedFrame = -1
        this.colorConfig = defs.colorConfigs.get(this.dataType)
        this.colors = this.colorConfig.colors

        this.rotation = 0
        document.documentElement.style.setProperty('--leds-rotation',`0deg`)

        this.updateColorPicker()

        this.frames = []
        window.setTimeout(() => {
            this.addFrame()
        }, 0);
    }

    addFrame(frame) {
        let nframe
        if (frame) {
            nframe = frame
        } else {
            nframe = new Frame(this.dataType)
        }

        let c = document.createElement('canvas')
        c.classList.add('frame')
        c.id = 'iconFrame'+this.frames.length
        c.width = 8
        c.height = 8
        c.setAttribute('onclick', `project.selectFrame(${this.frames.length})`)
        document.getElementById('frames').append(c)
        animations.play(document.getElementById('addFrame').children[0], 'rotate90', 0.2)

        this.frames.push(nframe)
        this.selectFrame(this.frames.length -1)
    }

    selectFrame(nframe) {
        if (nframe >= this.frames.length) {
            console.error('frame index outside of list')
            return
        }
        this.selectedFrame = nframe
        document.querySelector('.frame.selected')?.classList.remove('selected')
        document.getElementsByClassName('frame')[this.selectedFrame].classList.add('selected')
        this.frames[this.selectedFrame].renderIcon(document.getElementById('iconFrame'+nframe))
        this.frames[this.selectedFrame].render()
    }

    updateColorPicker() {
        const canvas = document.getElementById('picker')
        canvas.width = this.colorConfig.pickerSize.y
        canvas.height = this.colorConfig.pickerSize.x

        const ctx = canvas.getContext("2d")
        for (let i = 0; i < this.colors.length; i++) {

            let x = i % this.colorConfig.pickerSize.y
            let y = parseInt(i / this.colorConfig.pickerSize.y)
            
            ctx.fillStyle = this.colors[i];
            ctx.fillRect(x,y,1,1)
        }

        document.getElementById('picker').addEventListener('click', (e) => {
            const pos = diviteTouchTargetInGrid(e, this.colorConfig.pickerSize.x, this.colorConfig.pickerSize.y)
            project.selectedColor = pos.y * this.colorConfig.pickerSize.y + pos.x
        })
    }

    paint(pos) {
        this.frames[this.selectedFrame].leds[pos.y][pos.x] = this.selectedColor
        this.frames[this.selectedFrame].renderPixel(pos.y,pos.x)
    }
    rotate(angle = 0) {
        if (angle == this.rotation) {
            return
        }
        if (![0,90,180,270].includes(angle)) {
            console.error('invalid rotation', angle)
            alert('invalid rotation '+ angle)
            return
        }

        this.rotation = angle
        document.documentElement.style.setProperty('--leds-rotation',`${angle}deg`)
        animations.play( document.getElementById('leds'), 'shrink', config.transitionSpeed.ledsRotation)
    }

    async write() {
        let ledData = this.exportLedData()
        let start = projectStart + (n * ledData.length /2)
        let x = await payloads.writeMemory(start, ledData.length /2, ledData)
        return x
    }

}





class Frame {
    constructor(dataType) {
        if (!defs.dataTypes.includes(dataType)) {
            throw new Error("unknown data type "+dataType);
            return
        }
        this.dataType = dataType
        let c = project.colorConfig.defaultColor
        this.leds = [
            [c,c,c,c, c,c,c,c],
            [c,c,c,c, c,c,c,c],
            [c,c,c,c, c,c,c,c],
            [c,c,c,c, c,c,c,c],

            [c,c,c,c, c,c,c,c],
            [c,c,c,c, c,c,c,c],
            [c,c,c,c, c,c,c,c],
            [c,c,c,c, c,c,c,c]
        ]
    }

    renderPixel(row, col) {
        const colorIndex = this.leds[row][col];
        let ledIndex = row * this.leds[row].length + col
        document.getElementsByClassName('led')[ledIndex].style.backgroundColor = project.colors[colorIndex]
    }
    render() {
        for (let row = 0; row < this.leds.length; row++) {
            for (let col = 0; col < this.leds[row].length; col++) {
                this.renderPixel(row, col)
            }        
        }
    }

    exportLedData() {
        let data
        switch (this.dataType) {
            case '8b':
                data = this.export8b()
                break;
        
            case '6b':
                data = this.export6b()
                break;

            default:
                console.error('unknown data type for frame',this)
                break;
        }
        return data
    }

    export6b() {
        let data = ''
        for (let row = 0; row < this.leds.length; row++) {
            for (let col = 0; col < this.leds[row].length; col+=2) {
                let byteGroup = this.leds[row][col]
                byteGroup = byteGroup << 6
                byteGroup += this.leds[row][col+1]

                data += intToHex(byteGroup)
            }
        }
        return data
    }
    export8b() {
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

    renderIcon(canvasElement) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const ctx = canvasElement.getContext("2d")
                ctx.fillStyle = project.colors[ this.leds[row][col] ]
                ctx.fillRect(col, row, 1, 1)
            }
        }
    }
}




leds = {}
project = null

document.getElementById('leds').addEventListener('mousemove', (e) => {
    if (e.buttons !== 1) {
        return
    }
    const pos = diviteTouchTargetInGrid(e, 8, 8, document.getElementById('leds'))
    project.paint(pos)
})
document.getElementById('leds').addEventListener('mousedown', (e) => {
    const pos = diviteTouchTargetInGrid(e, 8, 8, document.getElementById('leds'))
    project.paint(pos)
})
document.getElementById('leds').addEventListener('mouseup', (e) => {
    project.frames[project.selectedFrame].renderIcon( document.getElementById('iconFrame'+project.selectedFrame) )
})


leds.init = function () {
    let html = ''
    for (let i = 0; i < 64; i++) {
        html += `<led class="led" style="
            animation-delay:
                ${(Math.random()*8+i)/10}s,
                ${(Math.random()*8+i)/10}s,
                ${(Math.random()*16+i)/15}s;
            animation-duration:
                ${(Math.random()*4+1)*2}s,
                ${(Math.random()*4+1)*5}s,
                ${(Math.random()*4+1)*12}s;

            "></led>`
    }
    document.getElementById('leds').innerHTML = html

    project = new Project({
        dataType: '6b'
    })
}
