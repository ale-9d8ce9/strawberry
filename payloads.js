class Payload {
    constructor(args) {
        this.op = args.operation
        args.args ? this.args = args.args : undefined
        args.otherData ? this.otherData = args.otherData : undefined
        this.history = {send: args}
        return this.execute()
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
                await serial.reconnect()
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
        if (response.length < 2) {
            return new playloadResult({
                ok: false,
                withError: false,
                message: 'response invalid'
            })
        }

        let l = response.length
        let responseStatus = response[l-2]
        let responseCode = response[l-1]

        if (responseStatus == defs.status.allOk && (responseCode == defs.status.ready || responseCode == defs.status.wait)) {
            return new playloadResult({
                ok: true,
                response: response.slice(0,l-2)
            })
        }

        if (responseStatus == defs.status.error || responseStatus == defs.status.fatalError) {
            if (responseStatus == defs.status.fatalError) {
                await serial.reconnect()
            }
            return new playloadResult({
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
            })
        }

        return new playloadResult({
            ok: true,
            response: response.slice(4,l-2)
        })
    }



    async execute() {
        function exit(result, payload) {
            if (serial.deviceState != deviceStates.none) serial.deviceState = deviceStates.connected

            payload.history.result = result
            payloads.history.push(payload.history)

            if (!result.ok) {
                alert('error: '+JSON.stringify(result.message))
            }
            return new playloadResult(result)
        }

        console.log('executing', this)

        if (serial.deviceState == deviceStates.none) {
            return exit({
                ok: false,
                message: 'no device connected',
                withError: false
            }, this)
        }

        if (!await this.check()) {
            return exit({
                ok: false,
                message: 'invalid payload, aborted (check console for details)',
                withError: false
            }, this)
        }

        if (serial.deviceState == deviceStates.busy) {
            console.log('device busy\nwaiting 60 seconds')
            let count = 0
            while (serial.deviceState == deviceStates.busy) {
                await delay(500)
                console.log(count)
                count ++
                if (count > 121) {
                    console.warn('device still busy')
                    return exit({
                        ok: false,
                        withError: false,
                        message: 'device busy for more than 1 minute'
                    }, this)
                }
            }
        }
        if (serial.deviceState == deviceStates.disconnected) {
            if (!await serial.sendToDownloadMode()) {
                return exit({
                    ok: false,
                    withError: false,
                    message: 'could not go to download mode'
                }, this)
            }
        }

        serial.deviceState = deviceStates.busy

        let dataToSend = defs.operations[this.op].code
        if (defs.operations[this.op].needsArgs) {
            dataToSend += this.args
        }

        let response = divideHexStringInBytes(await serial.send(dataToSend))

        let header = response.slice(0,4)
        let result = await this.checkHeader(header)
        this.history.headerCheck = result
        this.history.header = header
        let outputLength = result.outputLength
        
        if (result.reset) { // if reset happened stop payload, even if it needs other data
            return exit(result, this)
        }
        if (!result.ok) {
            return exit(result, this)
        }

        if (defs.operations[this.op].needsOtherData) {
            if (this.otherData.length /2 != hexToInt(result.inputLength)) {
                return exit({
                    ok: false,
                    withError: false,
                    message: 'otherData lengths do not match (payload: '+(this.otherData.length /2)+', expected: '+result.inputLength+')'
                }, this)
            }
            let response = divideHexStringInBytes(await serial.send(this.otherData))
            console.log(response);
            
        } else {
            let l = response.length
            response = response.slice(4, l)
        }

        result = await this.checkResponse(response)
        this.history.responseCheck = result
        this.history.response = result.response

        return exit(result, this)
    }
}


class playloadResult {
    constructor(args) {
        let keys = Object.keys(args)
        if (
            !keys.includes('ok') ||
            (!args.ok && !keys.includes('message') && !keys.includes('withError')) ||
            (args.ok && !keys.includes('response')) ||
            (!args.ok && args.withError && !keys.includes('error'))
        ) {
            console.log(args)
            throw new Error("invalid args for payload return")
            return
        }
        this.ok = args.ok
        
        if (this.ok) {
            this.response = args.response
            this.continue = true

        } else {
            this.message = args.message
            this.reset = args.reset || false
            this.withError = args.withError 
            if (this.withError) {
                this.error = args.error
            }
            this.continue = confirm('error while executing: '+this.message)
        }
    }
}



payloads = {history:[]}

payloads.showFrame = async function (frameBytes) {
    if (project.colorConfig.frameDataLength != frameBytes.length/2) {
        return new playloadResult({
            ok: false,
            message: `invalid frameBytes length (expected: ${project.colorConfig.frameDataLength}, got: ${frameBytes.length/2})`
        })
    }

    return await new Payload({
        operation: 'showFrame'+ project.dataType,
        otherData: frameBytes
    })
}

payloads.readMemory = async function (start, offset) {
    let args = intToHex(start).padStart(4,'0')
    args += intToHex(offset)

    return await new Payload({
        operation: 'readMemory',
        args: args
    })
}

payloads.writeMemory = async function (start, offset, otherData) {
    if (divideHexStringInBytes(otherData).length != offset) {
        return new playloadResult({
            ok: false,
            message: 'mismatch between offset and otherData length'
        })
    }
    let args = intToHex(start).padStart(4,'0')
    args += intToHex(offset)

    return await new Payload({
        operation: 'writeMemory',
        args: args,
        otherData: otherData
    })
}

payloads.setMode = async function (mode) {
    let s = hexToInt(mode) < 3 ? mode : '00'

    let response = await new Payload({
        operation: 'setMode',
        args: s
    })
    if (response.ok) {
        serial.deviceState = deviceStates.disconnected
    }
    return response
}
payloads.setBrightness = async function (brightness) {
    let b = hexToInt(brightness) < 5 ? brightness : 5
    return await new Payload({
        operation: 'setBrightness',
        args: b
    })
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

payloads.updatePMHistory = function () {
    let html = ''
    payloads.history.forEach(payloadHistory => {
        let json = JSON.stringify(payloadHistory, null, 4).replaceAll('"', '')
        html += `<pre>${json}</pre>`
    });
    document.getElementById('payloadMonitor-content').innerHTML = html
}