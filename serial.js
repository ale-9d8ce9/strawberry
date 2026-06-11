let serial = {
    port: null,
    reader: null,
    writer: null,
    deviceBusy: false,
    deviceConnected: false,

    currentlyReceiving: '',
    history: [],

    serialOptions: {
        baudRate: config.serialSpeed,
        dataBits: 8,
        stopBits: 1,
        parity: 'odd',
        bufferSize: 510
    },
    filters: [
        {usbVendorId: 0x1A86, usbProductId: 0xE013},
        {usbVendorId: 0x2341, usbProductId: 0x0043}, // arduino uno official
    ]
}

serial.connect = async function () {
    try {
        serial.port = await navigator.serial.requestPort({filters: serial.filters})
        await serial.port.open(serial.serialOptions)
        console.log('connected to', serial.port)
        serial.deviceBusy = false
        serial.deviceConnected = true
        serial.read()
    } catch (e) {
        console.error('error connecting:',e)
    }
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
                    if (config.logAllSerial) {
                        console.log('rx', hex)
                    }
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

serial.send = async function (hexString) {
    if (!serial.deviceConnected) {
        console.error('can\'t send data\nno device connected', hexString)
        return false
    }
    let uint8 = hexStringToUint8Array(hexString)
    if (serial.currentlyReceiving !== '') {
        serial.history.push({dir: 'received', content: serial.currentlyReceiving})
        serial.currentlyReceiving = ''
    }
    serial.history.push({dir: 'sent', content: hexString})
    serial.write(uint8)
    if (config.logAllSerial) {
        console.log('tx', hexString)
    }
    if (config.updateSerialMonitor) {
        serial.updateSerialMonitor()
    }
    return await serial.waitForResponse()
}

navigator.serial?.addEventListener('disconnect', (e) => {
    if (e.target === serial.port) {
        console.log('device unplugged')
        serial.reading = false
        serial.deviceBusy = false
        serial.deviceConnected = false
        serial.port = null
    }
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

serial.updateSerialMonitor = function () {
    function renderMessage(message) {
        html = `<message class="${message.dir}">`
        bytes = divideHexStringInBytes(message.content)
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
    document.getElementById('hexMonitor-content').scrollTop = document.getElementById('hexMonitor-content').scrollHeight
}