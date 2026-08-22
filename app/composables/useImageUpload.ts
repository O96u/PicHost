import type {
  UploadProgressItem,
  UploadResponse
} from '~/types/image'
import { isUnauthorizedError } from './useAuth'
import { prepareFilesForUpload } from './useClipboardImage'

const MAX_FILES = 10

export function useImageUpload() {
  const toast = useToast()
  const { compressEnabled, clientWebpQuality } = useUploadPreferences()
  const uploading = ref(false)
  const progressItems = ref<UploadProgressItem[]>([])
  const lastUploadResult = ref<UploadResponse | null>(null)

  async function uploadFiles(
    files: File[],
    folder = 'images',
    options?: { notify?: boolean, includeFolder?: boolean }
  ) {
    if (uploading.value) return

    if (!files.length) {
      toast.add({ title: '请选择图片', color: 'warning' })
      return
    }

    if (files.length > MAX_FILES) {
      toast.add({
        title: `每次最多上传 ${MAX_FILES} 张图片`,
        color: 'warning'
      })
      return
    }

    uploading.value = true
    progressItems.value = files.map(file => ({
      name: file.name,
      status: 'pending',
      progress: 0
    }))

    try {
      const prepared = await prepareFilesForUpload(files, {
        enabled: compressEnabled.value,
        quality: clientWebpQuality.value / 100
      })

      progressItems.value = prepared.map((file, index) => ({
        name: file.name,
        status: 'uploading',
        progress: Math.round(((index + 1) / prepared.length) * 50)
      }))

      const formData = new FormData()
      if (options?.includeFolder !== false) {
        formData.append('folder', folder.trim() || 'images')
      }
      for (const file of prepared) {
        formData.append('files', file, file.name)
      }

      const response = await $fetch<UploadResponse>('/api/images/upload', {
        method: 'POST',
        body: formData
      })

      lastUploadResult.value = response

      progressItems.value = prepared.map((file) => {
        const failed = response.errors.find(error => error.name === file.name)
        return {
          name: file.name,
          status: failed ? 'error' : 'success',
          progress: 100,
          error: failed?.error.message
        }
      })

      if (response.items.length && options?.notify !== false) {
        toast.add({
          title: `成功上传 ${response.items.length} 张图片`,
          color: 'success'
        })
      }

      if (response.errors.length) {
        toast.add({
          title: `${response.errors.length} 张图片上传失败`,
          color: 'warning'
        })
      }

      return response
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        throw error
      }
      const message = error instanceof Error ? error.message : '上传失败'
      progressItems.value = progressItems.value.map(item => ({
        ...item,
        status: 'error',
        progress: 100,
        error: message
      }))
      toast.add({ title: message, color: 'error' })
      throw error
    } finally {
      uploading.value = false
    }
  }

  return {
    uploading,
    progressItems,
    lastUploadResult,
    uploadFiles
  }
}
