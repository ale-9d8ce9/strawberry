class Payload {
    constructor(args) {
        this.op = args.operation
        args.args ? this.args = args.args : undefined
        args.otherData ? this.otherData = args.otherData : undefined
        this.history = {send: args}
    }
    
    async check() {
        if (defs.operations[this.op].needsArgs && !this.args) {
            console.error('args needed for payload',this)
            return false
        }
        if (!defs.operations[this.op].needsArgs && this.args) {
            console.error('args NOT needed for payload',this)
            return false
        }

        if (defs.operations[this.op].needsArgs && (this.args.length % 2 != 0 || this.args.length > 6)) {
            console.error('invalid args for payload',this)
            return false
        }


        if (defs.operations[this.op].needsOtherData && !this.otherData) {
            console.error('additional data needed for payload',this)
            return false
        }
        if (!defs.operations[this.op].needsOtherData && this.otherData) {
            console.error('additional data NOT needed for payload',this)
            return false
        }

        if (serial.deviceBusy) {
            console.log('device busy\nwaiting 10 seconds')
            let count = 0
            while (serial.deviceBusy) {
                await delay(500)
                console.log(count)
                count ++
                if (count > 21) {
                    console.warn('device still busy')
                    return false
                }
            }
        }

        return true
    }

    async checkResponse(response, sdPart = false) {
        if (response.length < 2) {
            serial.deviceBusy = false
            await serial.resetDevice()
            return {
                ok: false,
                message: 'response too short',
                response: response,
                withError: false,
                reset: true
            }
        }
        let responseStatus = response[0]
        let responseCode = response[1]
        let l = response.length
        if (!sdPart) {
            if (responseStatus != defs.status.executing && responseStatus != defs.status.error && responseStatus != defs.status.fatalError) {
                await serial.resetDevice()
                return {
                    ok: false,
                    response: response,
                    withError: false,
                    reset: true,
                    message: 'invalid response'
                }
            }
        } else {
            if (response[l-2] == defs.status.allOk && (response[l-1] == defs.status.ready || response[l-1] == defs.status.wait)) {
                console.log(response, response.slice(0,l-2))
                return {
                    ok: true,
                    response: response.slice(0,l-2)
                }
            }
        }

        if (responseStatus == defs.status.error || responseStatus == defs.status.fatalError) {
            if (responseStatus == defs.status.fatalError) {
                // await reconnect
            }
            return {
                ok: false,
                response: response,
                withError: true,
                reset: responseStatus == defs.status.fatalError,
                error: {
                    fatal: responseStatus == defs.status.fatalError,
                    code: responseCode,
                    message: defs.errors.get(responseCode)
                },
                message: 'handled error'
            }
        }

        if (responseCode != defs.operations[this.op].code && !sdPart) {
            await serial.resetDevice()
            return {
                ok: false,
                response: response,
                withError: false,
                reset: true,
                message: 'operation executed is different from payload'
            }
        }

        return {
            ok: true,
            response: response.slice(4,l-2)
        }
    }


    async execute() {
        console.log('executing', this)
        if (!serial.deviceConnected) {
            return {
                ok: false,
                message: 'no device connected',
                withError: false
            }
        }
        if (!await this.check()) {
            serial.deviceBusy = false
            throw new Error("invalid payload, aborting")
            return {
                ok: false,
                message: 'invalid payload, aborted',
                withError: false
            }
        }
        serial.deviceBusy = true

        let dataToSend = defs.operations[this.op].code
        if (defs.operations[this.op].needsArgs) {
            if (this.args.length < 6) {
                this.args = this.args.padEnd(6,'0')
            }
            dataToSend += this.args
        }

        let response = divideHexStringInBytes(await serial.send(dataToSend))

        let result = await this.checkResponse(response)
        this.history.response1 = result

        if (result.reset) { // if reset happened stop payload, even if it needs other data
            serial.deviceBusy = false
            payloads.history.push(this.history)
            return result
        }

        if (!result.ok) {
            if (result.withError && !result.error.fatal) {
                // abort operation
            }

        }
        if (defs.operations[this.op].needsOtherData) {
            if (hexToInt(response[2]) != this.otherData.length /2) { // /2 because 1 byte is 2 chars
            } else {
                response = await serial.send(this.otherData)
                result = await this.checkResponse(response, true)
            }
            this.history.response2 = result
        }

        serial.deviceBusy = false
        payloads.history.push(this.history)
        return result
    }
}


payloads = {history:[]}

payloads.readMemory = async function (start, offset) {
    let args = intToHex(start).padStart(4,'0')
    args += intToHex(offset)
    let p = new Payload({
        operation: 'readMemory',
        args: args
    })
    let response = await p.execute()
    return response
}

payloads.writeMemory = async function (start, offset, otherData) {
    if (divideHexStringInBytes(otherData).length != offset) {
        return {
            ok: false,
            message: 'mismatch between offset and otherData length'
        }
    }
    let args = intToHex(start).padStart(4,'0')
    args += intToHex(offset)
    let p = new Payload({
        operation: 'writeMemory',
        args: args,
        otherData: otherData
    })
    let response = await p.execute()
    return response
}

payloads.showConnectedLogo = async function (show) {
    let s = show ? '01' : '00'
    let p = new Payload({
        operation: 'showConnectedLogo',
        args: s+'8888'
    })
    let response = await p.execute()
    return response
}

payloads.softReset = async function () {
    let p = new Payload({
        operation: 'softReset',
    })
    let response = await p.execute()
    return response
}
payloads.hardReset = async function () {
    let p = new Payload({
        operation: 'hardReset',
    })
    let response = await p.execute()
    return response
}


payloads.initMonitor = function () {
    for (let i = 0; i < Object.keys(defs.operations).length; i++) {
        const payloadName = Object.keys(defs.operations)[i];
         document.getElementById('pm-operation').innerHTML += `<option value="${payloadName}">${payloadName}</option>`
    }
    document.getElementById('pm-operation').onchange()
}
payloads.updatePMInputs = function (operation) {
    let op = defs.operations[operation]
    document.getElementById('pm-args').hidden = !op.needsArgs
    document.getElementById('pm-otherData').hidden = !op.needsOtherData
}
payloads.runPMInputs = function () {
    let op = defs.operations[document.getElementById('pm-operation').value]
    let payloadArg = {
        operation: document.getElementById('pm-operation').value
    }
    op.needsArgs ? payloadArg.args = document.getElementById('pm-args').value : undefined
    op.needsOtherData ? payloadArg.otherData = document.getElementById('pm-otherData').value : undefined
    let p = new Payload(payloadArg)
    p.execute()
}