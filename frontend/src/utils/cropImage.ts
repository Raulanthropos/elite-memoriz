export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.src = url
  })

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180
}

type CropImageOptions = {
  preserveOriginal?: boolean
  skipCrop?: boolean
}

const getOriginalBlob = async (imageSrc: string): Promise<Blob> => {
  const response = await fetch(imageSrc)

  if (!response.ok) {
    throw new Error(`Failed to load original image blob: ${response.status}`)
  }

  return response.blob()
}

/**
 * Check if the browser supports canvas.toBlob
 */
export async function getCroppedImg(
  imageSource: string | HTMLImageElement,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  options: CropImageOptions = {}
): Promise<Blob | null> {
  if (options.preserveOriginal || options.skipCrop) {
    if (typeof imageSource !== 'string') {
      return getOriginalBlob(imageSource.currentSrc || imageSource.src)
    }

    return getOriginalBlob(imageSource)
  }

  const image = typeof imageSource === 'string' ? await createImage(imageSource) : imageSource
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  const sourceWidth = image.naturalWidth || image.width
  const sourceHeight = image.naturalHeight || image.height

  const boundedCrop = {
    x: Math.max(0, Math.round(pixelCrop.x)),
    y: Math.max(0, Math.round(pixelCrop.y)),
    width: Math.min(sourceWidth - Math.max(0, Math.round(pixelCrop.x)), Math.round(pixelCrop.width)),
    height: Math.min(sourceHeight - Math.max(0, Math.round(pixelCrop.y)), Math.round(pixelCrop.height)),
  }

  if (boundedCrop.width <= 0 || boundedCrop.height <= 0) {
    return null
  }

  canvas.width = boundedCrop.width
  canvas.height = boundedCrop.height

  if (rotation === 0) {
    ctx.drawImage(
      image,
      boundedCrop.x,
      boundedCrop.y,
      boundedCrop.width,
      boundedCrop.height,
      0,
      0,
      boundedCrop.width,
      boundedCrop.height
    )

    return new Promise((resolve) => {
      canvas.toBlob((file) => {
        resolve(file)
      }, 'image/jpeg')
    })
  }

  const maxSize = Math.max(sourceWidth, sourceHeight)
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))

  // set each dimensions to double largest dimension to allow for a safe area for the
  // image to rotate in without being clipped by canvas context
  canvas.width = safeArea
  canvas.height = safeArea

  // translate canvas context to a central location on image to allow rotating around the center.
  ctx.translate(safeArea / 2, safeArea / 2)
  ctx.rotate(getRadianAngle(rotation))
  ctx.translate(-safeArea / 2, -safeArea / 2)

  // draw rotated image and store data.
  ctx.drawImage(
    image,
    safeArea / 2 - sourceWidth * 0.5,
    safeArea / 2 - sourceHeight * 0.5
  )

  const data = ctx.getImageData(0, 0, safeArea, safeArea)

  // set canvas width to final desired crop size - this will clear existing context
  canvas.width = boundedCrop.width
  canvas.height = boundedCrop.height

  // paste generated rotate image with correct offsets for x,y crop values.
  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + sourceWidth * 0.5 - boundedCrop.x),
    Math.round(0 - safeArea / 2 + sourceHeight * 0.5 - boundedCrop.y)
  )

  // As Blob
  return new Promise((resolve) => {
    canvas.toBlob((file) => {
      resolve(file)
    }, 'image/jpeg')
  })
}
