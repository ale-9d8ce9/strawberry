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
            nframe = new Frame({
                dataType: this.dataType
            })
        }
        this.frames.push(nframe)
        // update frames sidebar
        let html = ''
        for (let i = 0; i < this.frames.length; i++) {
            const frame = this.frames[i];
            html += `
            <div class="frame" onclick="project.selectFrame(${i})">
                <canvas id="iconFrame${i}" width="8" height="8"></canvas>
            </div>`
        }
        html += `<button id="addFrame" onclick="project.addFrame()"><img class="icon" src="icons/add.svg"></button>`
        document.getElementById('frames').innerHTML = html
        for (let i = 0; i < document.getElementsByClassName('frame').length; i++) {
            console.log(i)
        }
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
            project.selectedColor = pos.y * 8 + pos.x
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
        dataType: '8b'
    })
}
