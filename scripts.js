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
document.getElementsByClassName('window-handle')[0].addEventListener('mousemove', (e) => {
    moveWindow(e, 0)
})
document.getElementsByClassName('window-handle')[1].addEventListener('mousemove', (e) => {
    moveWindow(e, 1)
})



function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
    })
}


function alignLedsShadow() {
}


async function start() {
    payloads.initMonitor()
    leds.init()

    document.documentElement.style.setProperty('--transition-fast',config.transitionSpeed.fast+'s')
    document.documentElement.style.setProperty('--transition-normal',config.transitionSpeed.normal+'s')
    document.documentElement.style.setProperty('--transition-slow',config.transitionSpeed.slow+'s')
    document.documentElement.style.setProperty('--transition-ledsRotation',config.transitionSpeed.ledsRotation+'s')
}
window.onload = start