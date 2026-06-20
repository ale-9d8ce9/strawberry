// used to extract pixel colors from images
async function getPixels(src) {
    const img = await loadImage(src)
    const canvas = document.createElement("canvas")
    canvas.width = img.width
    canvas.height = img.height

    const ctx = canvas.getContext("2d")
    ctx.drawImage(img, 0, 0)
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data

    let colors = []
    for (let i = 0; i < pixels.length; i += 4) {
        let color = '#'
        for (let j = 0; j < 3; j++) {
            color += intToHex(pixels[i+j])
        }
        colors.push(color)
    }
    return colors
}




