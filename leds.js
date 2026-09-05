class Project {
    constructor(args) {
        if (!defs.dataTypes.includes(args.dataType)) {
            throw new Error("unknown data type "+args.dataType);
            return
        }
        this.dataType = args.dataType
        this.selectedFrame = -1
        this.colorConfig = defs.colorConfigs.get(this.dataType)
        this.colors = this.colorConfig.colors
        this.backgroundColor = this.colorConfig.defaultColor
        this.nextFrameID = 0

        this.selectedColor = 0
        document.getElementById('selectedColor').style.backgroundColor = this.colors[this.selectedColor]

        this.settings = {
            frameDelay: 50,
            brightness: 12,
            waterColor: 20,
            waterAmount: 40,
            projectStart: 2,
            animationRotation: 0,
            buttonSwitchMode: true,
            autoBrightness: false,
            playAnimationOnBoot: true
        }

        this.updateColorPicker()

        if (!args.lightBleedCanvas) {
            args.lightBleedCanvas = document.getElementById('leds-light-bleed')
        }
        this.lightBleedCanvas = args.lightBleedCanvas
        this.lightBleedCanvas.width = 32
        this.lightBleedCanvas.height = 32

        this.frames = []
    }

    deleteFrame(frameN) {
        if (this.frames.length == 1) {
            return
        }
        this.frames[frameN].frameContainer.remove()
        this.frames.splice(frameN, 1)
        for (let i = frameN; i < this.frames.length; i++) {
            this.frames[i].updateEventsIndex(i)
        }
    }

    startMoveFrame(frameN, e) {
        if (this.frames.length == 1) {
            return
        }
        this.moveFrameTMP = {y: e.y, n: frameN}

        this.frames[frameN].frameContainer.classList.add('moving')
        document.querySelector('body').addEventListener('mousemove', this.dragFrame)
        document.querySelector('body').addEventListener('mouseup', this.stopMoveFrame)
    }
    dragFrame(e) {
        let tmp = project.moveFrameTMP
        let draggingFrameBox = project.frames[tmp.n].frameContainer.getBoundingClientRect()

        let y = e.y - tmp.y
        project.frames[tmp.n].frameContainer.style.translate = `0 ${y}px`

        for (let i = 0; i < tmp.n; i++) {
            if (project.frames[i].frameContainer.getBoundingClientRect().top > draggingFrameBox.top) {
                project.frames[i].frameContainer.style.translate = '0 100%'
            } else {
                project.frames[i].frameContainer.style.translate = '0 0'
            }
        }
        for (let i = tmp.n+1; i < project.frames.length; i++) {
            if (project.frames[i].frameContainer.getBoundingClientRect().bottom < draggingFrameBox.bottom) {
                project.frames[i].frameContainer.style.translate = '0 -100%'
            } else {
                project.frames[i].frameContainer.style.translate = '0 0'
            }
        }
    }
    stopMoveFrame(e) {
        let tmp = project.moveFrameTMP
        let draggingFrameBox = project.frames[tmp.n].frameContainer.getBoundingClientRect()

        // get how much it moved
        let frameMovement = 0
        for (let i = 0; i < tmp.n; i++) {
            if (project.frames[i].frameContainer.getBoundingClientRect().top > draggingFrameBox.top) {
                frameMovement--
            }
            project.frames[i].frameContainer.style.translate = '0 0'
        }
        for (let i = tmp.n+1; i < project.frames.length; i++) {
            if (project.frames[i].frameContainer.getBoundingClientRect().bottom < draggingFrameBox.bottom) {
                frameMovement++
            }
            project.frames[i].frameContainer.style.translate = '0 0'
        }
        project.frames[tmp.n].frameContainer.classList.remove('moving')
        project.frames[tmp.n].frameContainer.style.translate = '0 0'

        // swap
        if (frameMovement != 0) {
            let frameMoved = project.frames.splice(tmp.n, 1)[0]
            
            let f = tmp.n + frameMovement
            if (f != project.frames.length) {
                project.frames[f].frameContainer.before(frameMoved.frameContainer)
            } else {
                project.frames[f-1].frameContainer.after(frameMoved.frameContainer)
            }
            
            project.frames.splice(tmp.n + frameMovement, 0, frameMoved)
            
            for (let i = 0; i < project.frames.length; i++) {
                project.frames[i].updateEventsIndex(i)
            }
            
        }

        // clean up
        project.moveFrameTMP = undefined
        document.querySelector('body').removeEventListener('mousemove', project.dragFrame)
        document.querySelector('body').removeEventListener('mouseup', project.stopMoveFrame)
    }

    addFrame(frameData = []) {
        let nframe = new Frame(this.dataType, this.nextFrameID, frameData)
        this.nextFrameID++

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
    setPixelBackgroundColor(pos) {
        this.frames[this.selectedFrame].leds[pos.y][pos.x] = this.backgroundColor
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

        const name = prompt('file name', 'project')

        const blob = new Blob([JSON.stringify(data)], { type: 'text/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = name+'.leds'
        link.click()
    }

    async preview(n = 1, d = 50) {
        for (let i = 0; i < n; i++) {
            for (let i = 0; i < this.frames.length; i++) {
                const frame = this.frames[i];
                let previewResult = await frame.preview()
                if (!previewResult.continue) {
                    return
                }
                await delay(d)
            }
        }
    }

    async flash() {
        function exit() {
            document.querySelector('body').classList.remove('flashing')
        }
        if (serial.deviceState == deviceStates.none) {
            alert('no device connected')
            return exit()
        }
        
        document.querySelector('body').classList.add('flashing')
        serial.flashingStatus = structuredClone(defs.flashingStatusStart)
        serial.flashingStatus.total = (this.frames.length * 2) + 3

        if (serial.deviceState == deviceStates.disconnected) {
            serial.flashingStatus.total++
            updateFlashingStatus('entering download mode')
            await serial.sendToDownloadMode()
        }

        updateFlashingStatus('writing header')
        let headerString = this.generateHeader()
        let headerFlashResult = await payloads.writeMemory(this.settings.projectStart, defs.projectHeaderSize, headerString)
        if (!headerFlashResult.continue) {
            return exit()
        }


        let dataStart = this.settings.projectStart + defs.projectHeaderSize
        let frameFlashResult
        for (let i = 0; i < this.frames.length; i++) {
            updateFlashingStatus('writing frame '+i)
            const frame = this.frames[i];
            frameFlashResult = await frame.flash(dataStart + (this.colorConfig.frameDataLength * i))
            if (!frameFlashResult.continue) {
                return exit()
            }
        }


        updateFlashingStatus('verifying header')
        headerFlashResult = await payloads.readMemory(this.settings.projectStart, defs.projectHeaderSize)
        if (!headerFlashResult.continue) {
            return exit()
        }
        if (!headerFlashResult.ok || headerFlashResult.response.join('') != headerString) {
            // retry
            console.error('header is worng')
        }


        let readResult
        for (let i = 0; i < this.frames.length; i++) {
            updateFlashingStatus('verifying frame '+i)
            const frame = this.frames[i];
            let frameAddress = dataStart + (this.colorConfig.frameDataLength * i)
            readResult = await payloads.readMemory(frameAddress, project.colorConfig.frameDataLength)
            if (!readResult.continue) {
                return exit()
            }
            if (!readResult.ok || readResult.response.join('') != frame.exportLedData()) {
                //retry
                console.error('frame is wrong',i)
            }
        }


        updateFlashingStatus('rebooting')
        let rebootResult = await payloads.setMode('01')
        exit()
    }

    generateHeader() {
        function generateOthers(proj) {
            let buttonSwitchMode = proj.settings.buttonSwitchMode   & 0b1
            let animationRotation = proj.settings.animationRotation & 0b11
            let colorCompressionAlgorithm = (proj.dataType == '8b') & 0b111
            let autoBrightness = proj.settings.autoBrightness       & 0b1
            let playAnimationOnBoot = proj.settings.playAnimationOnBoot & 0b1

            let others = 0
            others += buttonSwitchMode;             others = others << 2
            others += animationRotation;            others = others << 3
            others += colorCompressionAlgorithm;    others = others << 1
            others += autoBrightness;               others = others << 1
            others += playAnimationOnBoot;
            return others
        }

        let nFrames = intToHex(this.frames.length)
        let frameDelay = intToHex(this.settings.frameDelay)
        let waterColor = intToHex(this.settings.waterColor)
        let waterAmount = intToHex(this.settings.waterAmount)
        let brightness = intToHex(this.settings.brightness)
        let others = intToHex(generateOthers(this))

        let headerString = [
            nFrames,
            frameDelay,
            waterColor,
            waterAmount,
            brightness,
            others
        ].join('')

        return headerString
    }
}




class Frame {
    constructor(dataType, frameID, frameData = []) {
        if (!defs.dataTypes.includes(dataType)) {
            throw new Error("unknown data type "+dataType);
            return
        }
        this.dataType = dataType
        this.id = frameID

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

        this.generateIcon()
    }

    renderPixel(row, col, iconOnly = false) {
        const colorIndex = this.leds[row][col];

        // frame icon
        const ctxIcon = this.iconElement.getContext("2d")
        ctxIcon.fillStyle = project.colors[ this.leds[row][col] ]
        ctxIcon.fillRect(col, row, 1, 1)
        if (iconOnly) return
        
        // pixel
        let ledIndex = row * this.leds[row].length + col
        document.getElementsByClassName('led')[ledIndex].style.backgroundColor = project.colors[colorIndex]

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
        let data = ''
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
        let pixels = []
        for (let row = 0; row < this.leds.length; row++) {
            for (let col = 0; col < this.leds[row].length; col++) {
                pixels[ledIndexFromXY(col, row)] = this.leds[row][col] << 2
            }
        }
        for (let i = 0; i < pixels.length; i+=4) {
            let b0 = 0;
            let b1 = 0;
            let b2 = 0;
            let a = pixels[i]
            let b = pixels[i+1]
            let c = pixels[i+2]
            let d = pixels[i+3]

            b0 = a
            b0 |= (b & 0b00001100) >> 2

            b1 = b & 0b11110000
            b1 |= (c & 0b00111100) >> 2

            b2 = d >> 2
            b2 |= c & 0b11000000

            data += intToHex(b0)
            data += intToHex(b1)
            data += intToHex(b2)
        }
        return data
    }
    export8b() {
        let data = ''
        let pixels = []
        for (let row = 0; row < this.leds.length; row++) {
            for (let col = 0; col < this.leds[row].length; col++) {
                const pixel = this.leds[row][col];
                pixels[ledIndexFromXY(col, row)] = intToHex(pixel)
            }
        }
        data = pixels.join('')
        return data
    }

    async preview() {
        return await payloads.showFrame(this.exportLedData())
    }

    async flash(frameAddress) {
        let data = this.exportLedData()
        return await payloads.writeMemory(frameAddress, project.colorConfig.frameDataLength, data)
    }

    generateIcon() {
        this.iconElement = document.createElement('canvas')
        this.iconElement.id = 'iconFrame'+this.id
        this.iconElement.width = 8
        this.iconElement.height = 8
        this.frameContainer = document.createElement('div')
        this.frameContainer.id = 'iconFrameContainer'+this.id
        this.frameContainer.classList.add('frame')
        
        this.deleteBtn = document.createElement('button')
        this.deleteBtn.innerHTML = '<img src="icons/delete.svg">'

        this.moveBtn = document.createElement('button')
        this.moveBtn.innerHTML = '<img src="icons/move.svg">'

        this.updateEventsIndex(this.id)
        this.frameContainer.append(this.iconElement)
        this.frameContainer.append(this.deleteBtn)
        this.frameContainer.append(this.moveBtn)
        document.getElementById('frames').append(this.frameContainer)

        // render icon pixels
        for (let row = 0; row < this.leds.length; row++) {
            for (let col = 0; col < this.leds[row].length; col++) {
                this.renderPixel(row, col, true)
            }
        }
    }

    updateEventsIndex(i) {
        this.frameContainer.setAttribute('onclick', `project.selectFrame(${i})`)
        this.deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            project.deleteFrame(project.frames.indexOf(this))
        })
        this.moveBtn.addEventListener('mousedown', (e) => {
            e.stopPropagation()
            project.startMoveFrame(project.frames.indexOf(this), e)
        })
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

            --delay: ${d*p}s;

            "></led>`
    }
    html += '<canvas id="leds-light-bleed">'

    document.getElementById('leds').innerHTML = html

    project = new Project({
        dataType: '8b'
    })
    project.addFrame()
}
