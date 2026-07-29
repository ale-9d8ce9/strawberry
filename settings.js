settings = {
    opened: false,
    animating: false
}

settings.toggle = function () {
    if (settings.animating) {
        return
    }
    settings.opened ?
        settings.close() :
        settings.open()
}

settings.open = async function () {
    settings.animating = true
    document.querySelector('page').classList.add('showSettings')
    document.querySelector('#leds').classList.add('transitionColors')
    settings.opened = true
    await delay(config.transitionSpeed.settings * 1000)
    settings.animating = false
}

settings.close = async function () {
    settings.animating = true
    document.querySelector('page').classList.remove('showSettings')
    settings.opened = false
    await delay(config.transitionSpeed.settings * 1000)
    document.querySelector('#leds').classList.remove('transitionColors')
    settings.animating = false
}