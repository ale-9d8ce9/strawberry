function uint8ArrayToHexString(uint8Array, separator = '') {
  return Array.from(uint8Array)
    .map(byte => byte.toString(16).padStart(2, '0').toUpperCase())
    .join(separator);
}

function hexStringToUint8Array(hexString, separator = '') {
  const parts = separator
    ? hexString.split(separator)
    : hexString.match(/.{1,2}/g);
  return new Uint8Array(parts.map(byte => parseInt(byte, 16)));
}

function uint8ArrayToTxt(uint8Array) {
    let decoder = new TextDecoder()
    return decoder.decode(uint8Array)
}

async function delay(ms) {
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
    return parseInt(int).toString(16).toLocaleUpperCase()
}
function hexToInt(hex) {
    return parseInt(hex, 16)
}