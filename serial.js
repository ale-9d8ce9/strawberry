let serial = {
    port: null,
    reader: null,
    writer: null,
    deviceState: 'none',

    currentlyReceiving: '',
    history: [],

    serialOptions: {
        baudRate: config.serialSpeed,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        bufferSize: 510
    },
    filter: {usbVendorId: 0x1A86, usbProductId: 0x7523}
}

const deviceStates = Object.freeze({
    connected: 'connected',
    disconnected: 'disconnected',
    busy: 'busy',
    none: 'none' // no port open
})


serial.connect = async function () {
    try {
        serial.port = await navigator.serial.requestPort({filters: [serial.filter]})
        await serial.port.open(serial.serialOptions)
        console.log('connected to', serial.port)
        serial.read()
        await serial.reconnect()
    } catch (e) {
        console.error('error connecting:',e)
    }
    serial.updateButtons()
}

serial.reconnect = async function () {
    if (serial.currentlyReceiving !== '') {
        serial.history.push({dir: 'received', content: serial.currentlyReceiving})
        serial.currentlyReceiving = ''
    }
    let c = 0
    while (
        serial.currentlyReceiving.length != 6 &&
        serial.currentlyReceiving.endsWith(defs.status.bootComplete + defs.status.allOk + defs.status.ready)
    ) {
        await delay(500)
        if (c > 20) {
            return false
        }
    }
    serial.history.push({dir: 'received', content: serial.currentlyReceiving})
    serial.currentlyReceiving = ''
    return await serial.sendToDownloadMode()
}

serial.read = async function () {
    while (serial.port?.readable) {
        serial.reading = true
        serial.reader = serial.port.readable.getReader()
        try {
            while (true) {
                const { value, done } = await serial.reader.read()
                if (done) break

                if (value) {
                    let hex = uint8ArrayToHexString(value)
                    serial.currentlyReceiving += hex
                    if (config.updateSerialMonitor) {
                        serial.updateSerialMonitor()
                    }
                } else {
                    console.warn('no value read')
                }
            }
        } catch (e) {
            console.error('error while reading: ',e)
        } finally {
            serial.reader.releaseLock()
            serial.reader = null
        }
    }
}

serial.waitForResponse = async function () {
    let previousCheckResponse = ''
    let sameResponseCount = 0
    await delay(config.serialMinWaitForResponse)
    while (sameResponseCount < 3) {
        await delay(config.serialResponseWaitCheck)
        if (previousCheckResponse === serial.currentlyReceiving && serial.currentlyReceiving != '' && serial.currentlyReceiving != null) {
            sameResponseCount ++
        } else {
            previousCheckResponse = serial.currentlyReceiving
            sameResponseCount = 0
        }
    }
    return previousCheckResponse
}

serial.write = async function (uint8Array) {
    if (!serial.port?.writable) return
    try {
        serial.writer = serial.port.writable.getWriter()
        await serial.writer.write(uint8Array)
        serial.writer.releaseLock()
        serial.writer = null

    } catch (e) {
        console.error('sending error',e)
    }

}

serial.send = async function (hexString, xor = false) {
    if (!serial.port) {
        console.error('can\'t send data\nno open port', hexString)
        return false
    }
    let uint8 = hexStringToUint8Array(hexString, xor)
    if (xor) {
        hexString += intToHex( uint8[uint8.length-1] )
    }

    if (serial.currentlyReceiving !== '') {
        serial.history.push({dir: 'received', content: serial.currentlyReceiving})
        serial.currentlyReceiving = ''
    }

    serial.history.push({dir: 'sent', content: hexString})
    await serial.write(uint8)

    if (config.updateSerialMonitor) {
        serial.updateSerialMonitor()
    }

    return await serial.waitForResponse()
}

navigator.serial?.addEventListener('disconnect', (e) => {
    if (e.target === serial.port) {
        console.log('device unplugged')
        serial.reading = false
        serial.deviceState = deviceStates.disconnected
        serial.port = null
    }
    serial.updateButtons()
})

serial.resetDevice = async function () {
    if (!serial.port) {
        console.error('no open port to reset')
        return
    }
    await serial.port.setSignals({dataTerminalReady: false, requestToSend: false})
    await delay(100)
    await serial.port.setSignals({dataTerminalReady: true, requestToSend: true})
    await delay(100)
    await serial.port.setSignals({dataTerminalReady: false, requestToSend: false})
}

serial.clearHistory = function () {
    serial.history = []
    serial.currentlyReceiving = ''
    serial.updateSerialMonitor()
    console.log('serial history cleared')
}

serial.sendToDownloadMode = async function () {
    if (!serial.port) {
        console.error('no device connected to send to downloadMode')
        return false
    }
    await serial.resetDevice()
    await delay(1380)
    let response = await serial.send(defs.status.downloadMode, false)

    let connected = response == defs.status.downloadMode + defs.status.ready
    connected ? serial.deviceState = deviceStates.connected : serial.deviceState = deviceStates.disconnected
    return connected
}

serial.updateSerialMonitor = function () {
    function renderMessage(message) {
        html = `<message class="${message.dir}">`
        bytes = divideHexStringInBytes(message.content) ?? []
        for (let i = 0; i < bytes.length; i++) {
            const byte = bytes[i];
            html += `
            <byte>${byte}</byte>
            `
        }
        html += '</message>'
        return html
    }

    let html = ''
    for (const message of serial.history) {
        html += renderMessage(message)
    }
    if (serial.currentlyReceiving !== '') {
        html += renderMessage({dir:'received', content:serial.currentlyReceiving})
    }

    document.getElementById('hexMonitor-content').innerHTML = html
    document.querySelector('hexMonitor').scrollTop = document.querySelector('hexMonitor').scrollHeight
}

serial.updateButtons = function () {
    document.getElementById('connectBtn').disabled = serial.deviceState == deviceStates.disconnected
}
