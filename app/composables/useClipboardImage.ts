import type { Ref } from 'vue'

const MAX_WIDTH = 2560
const QUALITY = 0.85

export interface CompressOptions {
  enabled: boolean
  maxWidth?: number
  quality?: number
}

function shouldCompress(file: File): boolean {
  return file.type === 'image/jpeg' || file.type === 'image/png'
}

async function compressImage(
  file: File,
  maxWidth: number,
  quality: number
): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', quality)
  })

  if (!blob) return file

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image'
  return new File([blob], `${baseName}.webp`, { type: 'image/webp' })
}

export async function prepareFilesForUpload(
  files: File[],
  options: CompressOptions
): Promise<File[]> {
  if (!options.enabled) return files

  const maxWidth = options.maxWidth ?? MAX_WIDTH
  const quality = options.quality ?? QUALITY

  const prepared: File[] = []

  for (const file of files) {
    if (!shouldCompress(file)) {
      prepared.push(file)
      continue
    }

    try {
      prepared.push(await compressImage(file, maxWidth, quality))
    } catch {
      prepared.push(file)
    }
  }

  return prepared
}

export function useClipboardImage(_target?: Ref<HTMLElement | null>) {
  function onPaste(event: ClipboardEvent, onFiles: (files: File[]) => void) {
    const items = event.clipboardData?.items
    if (!items?.length) return

    const files: File[] = []
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }

    if (files.length) {
      event.preventDefault()
      onFiles(files)
    }
  }

  function bindPaste(onFiles: (files: File[]) => void) {
    const handler = (event: ClipboardEvent) => onPaste(event, onFiles)

    onMounted(() => {
      window.addEventListener('paste', handler)
    })

    onUnmounted(() => {
      window.removeEventListener('paste', handler)
    })
  }

  return { bindPaste, onPaste }
}
