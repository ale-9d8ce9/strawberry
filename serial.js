let serial = {
    port: null,
    reader: null,
    writer: null,
    keepReading: false,
    serialOptions: {
        baudRate: 9600,
        dataBits: 8,
        stopBits: 2,
        parity: 'odd',
        bufferSize: 255
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
                    console.log(value)

                    let txt = uint8ArrayToHexString(value)
                    let dec = uint8ArrayToTxt(value)
                    document.getElementById('content').innerHTML+=`
                    <div class="message read">${txt} ${dec}</div>`

                } else {
                    console.log('no value ...')
                }
            }
        } catch (e) {
            console.error('error while reading:',e)
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


navigator.serial?.addEventListener('disconnect', (e) => {
    if (e.target === serial.port) {
        console.log('device unplugged')
        serial.reading = false
        serial.port = null
    }
})



