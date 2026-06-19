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

        if (defs.operations[this.op].needsArgs && this.args.length /2 != defs.operations[this.op].argsLength) {
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
        return true
    }



    async checkHeader(response) {
        if (response.length < 2 || response.length != 4) {
            return {
                ok: false,
                withError: false,
                message: 'header too short'
            }
        }
        
        let responseStatus = response[0]
        let responseCode = response[1]
        let l = response.length

        if (responseCode == defs.operations[this.op].code && responseStatus == defs.status.executing) {
            return {
                ok: true,
                inputLength: response[2],
                outputLength: response[3]
            }
        }

        if (responseStatus != defs.status.executing && responseStatus != defs.status.error && responseStatus != defs.status.fatalError) {
            await serial.resetDevice()
            return {
                ok: false,
                response: response,
                withError: false,
                reset: true,
                message: 'unknown header status '+ responseStatus
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

        if (responseCode != defs.operations[this.op].code) {
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
            ok: false,
            withError: false,
            message: 'unknown error while checking response header'
        }
    }



    async checkResponse(response) {
        if (response.length /2 < 2) {
            return {
                ok: false,
                withError: false,
                message: 'response invalid'
            }
        }

        let l = response.length
        let responseStatus = response[l-2]
        let responseCode = response[l-1]

        if (responseStatus == defs.status.allOk && (responseCode == defs.status.ready || responseCode == defs.status.wait)) {
            console.log(response, response.slice(0,l-2))
            return {
                ok: true,
                response: response.slice(0,l-2)
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
            return {
                ok: false,
                message: 'invalid payload, aborted (check console for details)',
                withError: false
            }
        }

        if (serial.deviceBusy) {
            console.log('device busy\nwaiting 60 seconds')
            let count = 0
            while (serial.deviceBusy) {
                await delay(500)
                console.log(count)
                count ++
                if (count > 121) {
                    console.warn('device still busy')
                    return {
                        ok: false,
                        withError: false,
                        message: 'device busy for more than 1 minute'
                    }
                }
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

        let header = response.slice(0,4)
        let result = await this.checkHeader(header)
        this.history.headerCheck = result
        this.history.header = header
        let outputLength = result.outputLength
        
        if (result.reset) { // if reset happened stop payload, even if it needs other data
            serial.deviceBusy = false
            payloads.history.push(this.history)
            return result
        }
        if (!result.ok) {
            payloads.history.push(this.history)
            return result
        }

        if (this.needsOtherData) {
            if (this.otherData.length /2 != result.inputLength) {
                // handle this
                payloads.history.push(this.history)
                return {
                    ok: false,
                    withError: false,
                    message: 'otherData lengths do not match (payload: '+(this.otherData.length /2)+', expected: '+result.inputLength+')'
                }
            }
            let response = divideHexStringInBytes(await serial.send(this.otherData))
        } else {
            let l = response.length
            response = response.slice(4, l)
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
        args: s
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