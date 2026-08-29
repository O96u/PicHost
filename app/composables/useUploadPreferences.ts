const STORAGE_KEY = 'pichost.upload-preferences'

export type CopyFormat = 'url' | 'markdown' | 'html'

export interface UploadPreferences {
  compressEnabled: boolean
  autoCopyMarkdown: boolean
  copyFormat: CopyFormat
  clientWebpQuality: number
}

const DEFAULTS: UploadPreferences = {
  compressEnabled: false,
  autoCopyMarkdown: false,
  copyFormat: 'markdown',
  clientWebpQuality: 80
}

function clampQuality(value: unknown): number {
  const num = Number(value)
  if (!Number.isFinite(num)) return DEFAULTS.clientWebpQuality
  return Math.min(100, Math.max(1, Math.round(num)))
}

function isCopyFormat(value: unknown): value is CopyFormat {
  return value === 'url' || value === 'markdown' || value === 'html'
}

function readStored(): UploadPreferences {
  if (import.meta.server) return { ...DEFAULTS }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<UploadPreferences>
    return {
      compressEnabled: parsed.compressEnabled === true,
      autoCopyMarkdown: parsed.autoCopyMarkdown === true,
      copyFormat: isCopyFormat(parsed.copyFormat) ? parsed.copyFormat : DEFAULTS.copyFormat,
      clientWebpQuality: clampQuality(parsed.clientWebpQuality)
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function writeStored(prefs: UploadPreferences) {
  if (import.meta.server) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export function useUploadPreferences() {
  const compressEnabled = useState('upload-pref-compress', () => DEFAULTS.compressEnabled)
  const autoCopyMarkdown = useState('upload-pref-auto-md', () => DEFAULTS.autoCopyMarkdown)
  const copyFormat = useState<CopyFormat>('upload-pref-copy-format', () => DEFAULTS.copyFormat)
  const clientWebpQuality = useState('upload-pref-webp-quality', () => DEFAULTS.clientWebpQuality)
  const loaded = useState('upload-pref-loaded', () => false)

  function loadPreferences() {
    const stored = readStored()
    compressEnabled.value = stored.compressEnabled
    autoCopyMarkdown.value = stored.autoCopyMarkdown
    copyFormat.value = stored.copyFormat
    clientWebpQuality.value = stored.clientWebpQuality
    loaded.value = true
  }

  if (import.meta.client && !loaded.value) {
    loadPreferences()
  }

  function savePreferences() {
    writeStored({
      compressEnabled: compressEnabled.value,
      autoCopyMarkdown: autoCopyMarkdown.value,
      copyFormat: copyFormat.value,
      clientWebpQuality: clampQuality(clientWebpQuality.value)
    })
  }

  watch([compressEnabled, autoCopyMarkdown, copyFormat, clientWebpQuality], () => {
    if (loaded.value) {
      savePreferences()
    }
  })

  return {
    compressEnabled,
    autoCopyMarkdown,
    copyFormat,
    clientWebpQuality,
    loaded,
    loadPreferences,
    savePreferences
  }
}
