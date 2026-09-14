function uint8ArrayToHexString(uint8Array, separator = '') {
  return Array.from(uint8Array)
    .map(byte => byte.toString(16).padStart(2, '0').toUpperCase())
    .join(separator);
}

function hexStringToUint8Array(hexString, xor = false, separator = '') {
    const parts = separator
        ? hexString.split(separator)
        : hexString.match(/.{1,2}/g);
    let nums = parts.map(byte => parseInt(byte, 16))
    if (xor) {
        xorByte = 0
        for (let i = 0; i < nums.length; i++) {
            xorByte ^= nums[i];
        }
        nums.push(xorByte)
    }
    return new Uint8Array(nums);
}

function uint8ArrayToTxt(uint8Array) {
    let decoder = new TextDecoder()
    return decoder.decode(uint8Array)
}

async function delay(ms) {
    if (ms == 0) return
    return new Promise((resolve, reject) => {
        window.setTimeout(resolve, ms)
    })
}


function divideHexStringInBytes(hexString) {  // divide string in couples 'aabb' -> ['aa','bb']
    if (hexString.length % 2 == 1) {
        console.error('hex string seems corrupted', hexString)
    }
    return hexString.match(/.{1,2}/g)
}

function intToHex(int) {
    return parseInt(int).toString(16).toUpperCase().padStart(2,'0')
}
function hexToInt(hex) {
    return parseInt(hex, 16)
}



function slideArray(array, n, pad) {
    let newArray = []
    if (n > 0) {
        for (let i = 0; i < n; i++) {
            newArray.push(pad)
        }
        n = 0
    } else {
        n *= -1
    }

    for (let i = n; i < array.length && newArray.length != array.length; i++) {
        newArray.push(array[i])        
    }

    while (newArray.length < 8) {
        newArray.push(pad)
    }
    return newArray
}



function diviteTouchTargetInGrid(e, sizeX, sizeY, target) { // takes an event and returns in which grid section of the target element the event happened
    if (target === undefined) {
        target = e.target
    }
    const size = target.getBoundingClientRect()
    const offsetX = e.x - size.left
    const offsetY = e.y - size.top
    const x = offsetX / size.width * sizeX 
    const y = offsetY / size.height * sizeY
    return {
        x: parseInt(x),
        y: parseInt(y)
    }
}



// i know it's terrible and i dont care, it's only to move the dev tools around during development
function moveWindow(e, id) {
    if (e.buttons !== 1) {
        return
    }
    document.getElementsByClassName('window')[id].style.top = (parseInt(document.getElementsByClassName('window')[id].style.top)+e.movementY) +'px'
    document.getElementsByClassName('window')[id].style.left = (parseInt(document.getElementsByClassName('window')[id].style.left)+e.movementX) +'px'
}



function ledIndexFromXY(x, y) {
  if (y+1 & 0x01) { // if y is odd flip x
    x = 7 - x;
  }
  return y*8 +x;
}




function inputRangeUpdates(elm) {
    let min = parseInt(elm.min)
    let max = parseInt(elm.max)
    let value = parseInt(elm.value)
    elm.setAttribute('data-value', value)

    value -= min
    max -= min
    value *= 100
    value /= max
    
    elm.style.setProperty('--v', value + '%')
}




function runShortcut(e) {
    let key = e.key.toLowerCase()
    if (e.metaKey) {
        key = 'M' + key
    }
    if (e.ctrlKey) {
        key = 'C' + key
    }
    if (e.altKey) {
        key = 'A' + key
    }

    if (defs.shortcutsEnabled.includes(key)) {
        e.preventDefault()
        defs.shortcuts[key](e)
    }
}



function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
    })
}



function updateFlashingStatus(sts) {
    serial.flashingStatus.progress++
    document.getElementById('flashingStatus-status').innerText = sts
    document.getElementById('flashingStatus-count').innerText = serial.flashingStatus.progress +' / '+ serial.flashingStatus.total
    document.getElementById('flashingStatus-progressBar').setAttribute('max', serial.flashingStatus.total)
    document.getElementById('flashingStatus-progressBar').value = serial.flashingStatus.progress
}



function getTouchPos(e) {
    const touch = e.touches[0] || e.changedTouches[0]
    const leds = document.getElementById('leds')

    const fakeEvent = {
        x: touch.clientX,
        y: touch.clientY,
    }

    return diviteTouchTargetInGrid(fakeEvent, 8, 8, leds)
}



function isChromium() {
    let esmg = ""
    try { null.x } catch (e) { emsg = e.message }
    return (!!window.chrome) && emsg === "Cannot read properties of null (reading 'x')"
}

function hasSerial() {
    return !!navigator.serial
}


function clamp(min, val, max) {
    let r = val
    val < min ? r = min : null
    val > max ? r = max : null
    return r
}



async function start() {
    if (isChromium()) {
        document.querySelector('body').classList.add('isChromium')
    } else {
        document.getElementById('isChromiumWarn').classList.add('show')
    }
    if (!hasSerial()) {
        document.querySelector('body').classList.add('noSerial')
        document.getElementById('serialWarn').classList.add('show')
    }

    if (config.useShortcuts) {
        setupShortcuts()
    }
    payloads.initMonitor()
    leds.init()

    serial.flashingStatus = structuredClone(defs.flashingStatusStart)

    document.documentElement.style.setProperty('--transition-fast',config.transitionSpeed.fast+'s')
    document.documentElement.style.setProperty('--transition-normal',config.transitionSpeed.normal+'s')
    document.documentElement.style.setProperty('--transition-slow',config.transitionSpeed.slow+'s')
    document.documentElement.style.setProperty('--transition-ledsRotation',config.transitionSpeed.ledsRotation+'s')
    document.documentElement.style.setProperty('--transition-settings',config.transitionSpeed.settings+'s')
}
window.onload = start