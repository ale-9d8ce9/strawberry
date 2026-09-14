document.querySelectorAll('input[type="range"]').forEach(input => {
    input.addEventListener('input', () => {inputRangeUpdates(input)})
    inputRangeUpdates(input)
});



function setupShortcuts() {
    document.querySelector('body').addEventListener('keydown', (e) => {
        function isTyping(e) {
            const tag = e.target.tagName;
            return e.target.isContentEditable;
        }
        
        if (isTyping(e)) return
        
        runShortcut(e)
    })
    
    document.querySelector('body').addEventListener('mousemove', (e) => {
        global.mousex = e.x
        global.mousey = e.y
    })
}




document.getElementsByClassName('window-handle')[0].addEventListener('mousemove', (e) => {
    moveWindow(e, 0)
})
document.getElementsByClassName('window-handle')[1].addEventListener('mousemove', (e) => {
    moveWindow(e, 1)
})




document.getElementById('leds').addEventListener('mousemove', (e) => {
    if (e.buttons !== 1 && e.buttons !== 2) {
        return
    }
    const pos = diviteTouchTargetInGrid(e, 8, 8, document.getElementById('leds'))
    e.buttons === 1 ? project.paint(pos) : project.setPixelBackgroundColor(pos)
})
document.getElementById('leds').addEventListener('mousedown', (e) => {
    const pos = diviteTouchTargetInGrid(e, 8, 8, document.getElementById('leds'))
    e.buttons === 1 ? project.paint(pos) : project.setPixelBackgroundColor(pos)
})
document.getElementById('leds').addEventListener('contextmenu', (e) => {
    e.preventDefault()
})

document.getElementById('leds').addEventListener('touchstart', (e) => {
    e.preventDefault()
    let pos = getTouchPos(e)
    pos.x = clamp(0, pos.x, 7)
    pos.y = clamp(0, pos.y, 7)
    project.paint(pos)
}, { passive: false })

document.getElementById('leds').addEventListener('touchmove', (e) => {
    e.preventDefault()
    let pos = getTouchPos(e)
    pos.x = clamp(0, pos.x, 7)
    pos.y = clamp(0, pos.y, 7)
    project.paint(pos)
}, { passive: false })



document.getElementById('addFrame').addEventListener('click', (e) => {
    let popup = document.getElementById('addFramePopup')
    let y = e.y < window.innerHeight - 32 ? window.innerHeight - e.y : 32
    popup.classList.add('show')
    popup.style.bottom = y + 'px'
    popup.style.left = 'var(--frames-width)'
    popup.style.translate = '0 50%'
    let bounding = popup.getBoundingClientRect()
    console.log(bounding)
    if (bounding.top < 0) {
        y -= Math.abs(bounding.top)
        popup.style.bottom = y + 'px'
    }
    if (bounding.bottom > window.innerHeight) {
        popup.style.bottom = '1rem'
        popup.style.translate = '0 0'
    }
})

document.getElementById('addFramePopup').addEventListener('mouseleave', () => {
    document.getElementById('addFramePopup').classList.remove('show')
})
