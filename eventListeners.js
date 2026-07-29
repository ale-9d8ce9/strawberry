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
    if (e.buttons !== 1) {
        return
    }
    const pos = diviteTouchTargetInGrid(e, 8, 8, document.getElementById('leds'))
    project.paint(pos)
})
document.getElementById('leds').addEventListener('mousedown', (e) => {
    const pos = diviteTouchTargetInGrid(e, 8, 8, document.getElementById('leds'))
    project.paint(pos)
})




document.getElementById('addFrame').addEventListener('click', () => {
    document.getElementById('addFramePopup').classList.toggle('show')
    document.getElementById('addFramePopup').style.bottom = '1rem'
    document.getElementById('addFramePopup').style.left = 'var(--frames-width)'
    document.getElementById('addFramePopup').style.translate = '0 0'
})

document.getElementById('addFramePopup').addEventListener('mouseleave', () => {
    document.getElementById('addFramePopup').classList.remove('show')
})
