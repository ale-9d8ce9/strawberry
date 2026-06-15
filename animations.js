animations = {}

animations.play = async function (target, animation, duration) {
    if (target === undefined || animation === undefined || duration === undefined) {
        console.error('undefined arguments for animation: target', target, 'animation',animation,'duration',duration)
        return
    }
    if (target.style.animation != '') {
        console.warn('animation for target still in progress',target)
    }
    target.style.animation = `${animation} ${parseFloat(duration)}s`
    await delay(duration * 1000)
    target.style.animation = ''
}