class Payload {
    constructor(args) {
        this.op = args.operation
        args.args ? this.args = args.args : undefined
        args.otherData ? this.otherData = args.otherData : undefined
    }
    
    async check() {
        if (defs.operations[this.op].needsArgs && !this.args) {
            console.error('args needed for command',this)
            return false
        }
        if (!defs.operations[this.op].needsArgs && this.args) {
            console.error('args NOT needed for command',this)
            return false
        }

        if (defs.operations[this.op].needsArgs && this.args.length != 6) {
            console.error('invalid args for command',this)
            return false
        }


        if (defs.operations[this.op].needsOtherData && !this.otherData) {
            console.error('additional data needed for command',this)
            return false
        }
        if (!defs.operations[this.op].needsOtherData && this.otherData) {
            console.error('additional data NOT needed for command',this)
            return false
        }

        if (serial.deviceBusy) {
            console.log('device busy\nwaiting 10 seconds')
            let count = 0
            while (serial.deviceBusy) {
                await delay(1000)
                console.log(count)
                count ++
                if (count > 11) {
                    console.warn('device still busy')
                    return false
                }
            }
        }

        return true
    }

    async execute() {
        if (!await this.check()) {
            serial.deviceBusy = false
            throw new Error("invalid payload, aborting")
            return
        }
        serial.deviceBusy = true

        let dataToSend = defs.operations[this.op].code
        if (defs.operations[this.op].needsArgs) {
            dataToSend += this.args
        }
        let response = divideHexStringInBytes(await serial.send(dataToSend))
        if (response.length < 2) {
            throw new Error("response too short");
            return
        }
        
        if (response[0] != 'E0') {/*
            if (response[0] == 'EE') {
                //errpr
            }
            if (response[0] == 'FE') {
                // fataò errpr
            }*/
            return
        }

        if (response[1] != defs.operations[this.op].code) {
            return // something went really wrong
        }
        if (response.length <= 4) {
            if (response[2] != defs.status.allOk || response[3] != defs.status.ready || response[3] != defs.status.wait) {
                console.error('response is not ok', response)
            }
        } else {
            if (defs.operations[this.op].needsOtherData && hexToInt(response[3]) != this.otherData.length) {
                // unmatched additional data lengths
                return
            }
        }

        serial.deviceBusy = false
        return response
    }
}