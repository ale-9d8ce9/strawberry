let serial = {
    port: null,
    reader: null,
    writer: null,
    keepReading: false,

    currentlyReceiving: '',
    history: [],

    updateSerialMonitor: true,

    serialOptions: {
        baudRate: 9600,
        dataBits: 8,
        stopBits: 2,
        parity: 'odd',
        bufferSize: 1023
    }
}

serial.connect = async function () {
    try {
        serial.port = await navigator.serial.requestPort()
        await serial.port.open(serial.serialOptions)
        console.log('connected to', serial.port)
        serial.read()
    } catch (e) {
        console.error('error connecting:',e)
    }
}

serial.disconnect = async function () {
    if (serial.reading) {
        console.error('can\'t disconnect\nstill reading')
        return
    }

    if (serial.reader) {
        try { await serial.reader.cancel(); } catch (_) {}
        serial.reader = null;
    }
    if (serial.writer) {
        try { await serial.writer.close(); } catch (_) {}
        serial.writer = null;
    }
    if (serial.port) {
        try { await serial.port.close(); } catch (_) {}
        serial.port = null;
    }


}

serial.read = async function () {
    serial.reading = true
    while (serial.port?.readable && serial.reading) {
        serial.reader = serial.port.readable.getReader()
        try {
            while (true) {
                const { value, done } = await serial.reader.read()
                if (done) break

                if (value) {
                    let hex = uint8ArrayToHexString(value)
                    serial.currentlyReceiving += hex
                    console.log(hex)
                    if (serial.updateSerialMonitor) {
                        serial.updateSerialMonitor()
                    }
                } else {
                    console.warn('no value ...')
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

serial.send = function (hexString) {
    let uint8 = hexStringToUint8Array(hexString)
    if (serial.currentlyReceiving !== '') {
        serial.history.push({dir: 'received', content: serial.currentlyReceiving})
        serial.currentlyReceiving = ''
    }
    serial.history.push({dir: 'sent', content: hexString})
    serial.write(uint8)
    if (serial.updateSerialMonitor) {
        serial.updateSerialMonitor()
    }
}

navigator.serial?.addEventListener('disconnect', (e) => {
    if (e.target === serial.port) {
        console.log('device unplugged')
        serial.reading = false
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
        bytes = message.content.match(/.{1,2}/g) // divide string in couples 'aabb' -> ['aa','bb']
        for (let i = 0; i < bytes.length; i++) {
            const byte = bytes[i];
            txt = uint8ArrayToTxt(hexStringToUint8Array(byte))
            let special = false
            // if is an enter character
            if ((i != bytes.length-1 && byte == '0D' && bytes[i+1] == '0A') || (i != 0 && bytes[i-1] == '0D' && byte == '0A')) {
                special = true
            }
            html += `
            <byte${ special ? ' class="special"' : '' }>
                <div class="hex"> ${byte} </div>
                <div class="txt"> ${txt} </div>
            </byte>
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