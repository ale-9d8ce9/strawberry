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

        if (!args.lightBleedCanvas) {
            args.lightBleedCanvas = document.getElementById('leds-light-bleed')
        }
        this.lightBleedCanvas = args.lightBleedCanvas
        this.lightBleedCanvas.width = 32
        this.lightBleedCanvas.height = 32

        this.frames = []
    }

    addFrame(frameData = []) {
        let nframe = new Frame(this.dataType, this.frames.length, frameData)

        this.frames.push(nframe)
        this.selectFrame(this.frames.length -1)
        document.getElementsByClassName('frame')[this.selectedFrame].scrollIntoView({behavior: "smooth"})
    }

    duplicateFrame(frameN, offsetX = 0, offsetY = 0) {
        function newRow(c) {
            return [c,c,c,c, c,c,c,c]
        }
        let newFrameData = []
        let c = this.colorConfig.defaultColor
        frameN < 0 ? frameN = this.selectedFrame : null
        let frameData = structuredClone(this.frames[frameN].leds)

        if (offsetY > 0) {
            for (let i = 0; i < offsetY; i++) {
                newFrameData.push(newRow(c))
            }
            offsetY = 0
        } else {
            offsetY *= -1
        }

        for (let i = offsetY; i < frameData.length && newFrameData.length < 8; i++) {
            const row = frameData[i]
            newFrameData.push(slideArray(row, offsetX, c))
        }

        while (newFrameData.length < 8) {
            newFrameData.push(newRow(c))
        }
        this.addFrame(newFrameData)
    }

    selectFrame(nframe) {
        if (nframe >= this.frames.length) {
            console.error('frame index outside of list')
            return
        }
        this.selectedFrame = nframe
        document.querySelector('.frame.selected')?.classList.remove('selected')
        document.getElementsByClassName('frame')[this.selectedFrame].classList.add('selected')
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
            document.getElementById('selectedColor').style.backgroundColor = this.colors[this.selectedColor]
        })
    }

    paint(pos) {
        this.frames[this.selectedFrame].leds[pos.y][pos.x] = this.selectedColor
        this.frames[this.selectedFrame].renderPixel(pos.y, pos.x)
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


    export() {
        let data = {}
        data.frames = this.frames
        data.dataType = this.dataType

        const blob = new Blob([JSON.stringify(data)], { type: 'text/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'ledsProject.json'
        link.click()
    }

    async preview(n = 1, d = 50) {
        for (let i = 0; i < n; i++) {
            for (let i = 0; i < this.frames.length; i++) {
                const frame = this.frames[i];
                console.log(await frame.preview())
                await delay(d)
            }
        }
    }
}




class Frame {
    constructor(dataType, frameNumber, frameData = []) {
        if (!defs.dataTypes.includes(dataType)) {
            throw new Error("unknown data type "+dataType);
            return
        }
        this.dataType = dataType

        // frame icon
        this.iconElement = document.createElement('canvas')
        this.iconElement.id = 'iconFrame'+frameNumber
        this.iconElement.width = 8
        this.iconElement.height = 8
        let frameContainer = document.createElement('div')
        frameContainer.id = 'iconFrameContainer'+frameNumber
        frameContainer.classList.add('frame')
        frameContainer.setAttribute('onclick', `project.selectFrame(${frameNumber})`)
        let deleteBtn = document.createElement('button')
        deleteBtn.addEventListener('click', () => project.deleteFrame(frameNumber))
        deleteBtn.innerHTML = '<img src="icons/delete.svg">'
        let moveBtn = document.createElement('button')
        moveBtn.addEventListener('click', () => project.moveFrame(frameNumber))
        moveBtn.innerHTML = '<img src="icons/move.svg">'
        frameContainer.append(this.iconElement)
        frameContainer.append(deleteBtn)
        frameContainer.append(moveBtn)
        document.getElementById('frames').append(frameContainer)

        if (frameData.length == 0) {
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
        } else {
            if (frameData.length != 8 || frameData[0].length != 8) {
                throw new Error("invalid framedata");
            }
            this.leds = frameData
        }
    }

    renderPixel(row, col) {
        const colorIndex = this.leds[row][col];
        let ledIndex = row * this.leds[row].length + col
        document.getElementsByClassName('led')[ledIndex].style.backgroundColor = project.colors[colorIndex]

        // frame icon
        const ctxIcon = this.iconElement.getContext("2d")
        ctxIcon.fillStyle = project.colors[ this.leds[row][col] ]
        ctxIcon.fillRect(col, row, 1, 1)

        // light bleed
        if (project.lightBleedCanvas) {
            const ctxLightBleed = project.lightBleedCanvas.getContext("2d")
            ctxLightBleed.fillStyle = project.colors[ this.leds[row][col] ]
            ctxLightBleed.fillRect(col*2+8, row*2+8, 2, 2)
        }
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

    async preview() {
        return await payloads.showFrame(this.exportLedData())
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
project = null


leds.import = async function () {
    function openFile() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input')
            input.type = 'file'

            input.onchange = () => {
                const file = input.files[0]
                if (!file) {
                    reject('No file selected')
                    return
                }

                const reader = new FileReader()
                reader.onload = () => resolve(reader.result)
                reader.onerror = () => reject(reader.error)
                reader.readAsText(file)
            }

            input.click()
        })
    }

    let file = await openFile()
    let data

    try {
        data = JSON.parse(file)
    } catch (e) {
        console.log(e, file)
        alert(e, file)
        return
    }

    document.getElementById('frames').innerHTML = ''
    project = new Project({
        dataType: data.dataType
    })

    for (let i = 0; i < data.frames.length; i++) {
        const frame = data.frames[i];
        project.addFrame(frame.leds)
    }

    console.log('imported file', file)
}


leds.init = function () {
    let html = ''
    let p = config.transitionSpeed.settings / 32
    for (let i = 0; i < 64; i++) {
        let d = parseInt(i / 8) + (i % 8)
        html += `<led class="led" style="
            animation-delay:
                ${(Math.random()*8+i)/10}s,
                ${(Math.random()*8+i)/10}s,
                ${(Math.random()*16+i)/15}s;
            animation-duration:
                ${(Math.random()*4+1)*2}s,
                ${(Math.random()*4+1)*5}s,
                ${(Math.random()*4+1)*12}s;

            transition-delay:
                ${d*p}s;

            "></led>`
    }
    html += '<canvas id="leds-light-bleed">'

    document.getElementById('leds').innerHTML = html

    project = new Project({
        dataType: '8b'
    })
    project.addFrame()
}
