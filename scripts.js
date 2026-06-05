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