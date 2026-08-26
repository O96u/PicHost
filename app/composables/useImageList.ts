import type {
  ImageItem,
  ImageListResponse
} from '~/types/image'

const PAGE_SIZE = 12

export function useImageList() {
  const { t } = useI18n()
  const items = ref<ImageItem[]>([])
  const page = ref(1)
  const totalPages = ref(1)
  const total = ref(0)
  const loading = ref(false)
  const folderTotal = ref<number | null>(null)
  const loadingTotal = ref(false)
  const searchQuery = ref('')
  const activeSearch = ref('')
  const activeFolder = ref('all')
  const activeStorageBackend = ref('all')
  const storageBackendOptions = ref<Array<{ id: string, name: string }>>([])

  function folderQueryParams(): Record<string, string> {
    const folder = activeFolder.value.trim()
    if (!folder || folder === 'all') return {}
    return { folder }
  }

  function storageQueryParams(): Record<string, string> {
    const backendId = activeStorageBackend.value.trim()
    if (!backendId || backendId === 'all') return {}
    return { backendId }
  }

  function listQueryParams(): Record<string, string> {
    return {
      ...folderQueryParams(),
      ...storageQueryParams()
    }
  }

  function matchesActiveFolder(key: string) {
    const folder = activeFolder.value.trim()
    if (!folder || folder === 'all') return true
    return key.startsWith(`${folder}/`)
  }

  function matchesActiveStorage(item: ImageItem) {
    const backendId = activeStorageBackend.value.trim()
    if (!backendId || backendId === 'all') return true
    return item.storage?.id === backendId
  }

  async function loadStorageBackendOptions() {
    try {
      const data = await $fetch<{
        backends: Array<{ id: string, name: string, type: string }>
      }>('/api/storage-backends', {
        credentials: 'include'
      })
      storageBackendOptions.value = data.backends.map(backend => ({
        id: backend.id,
        name: backend.name
      }))
    } catch {
      storageBackendOptions.value = []
    }
  }

  async function fetchTotal() {
    loadingTotal.value = true
    try {
      const data = await $fetch<{ total: number }>('/api/images/count', {
        credentials: 'include',
        query: listQueryParams()
      })
      folderTotal.value = data.total
    } catch {
      folderTotal.value = null
    } finally {
      loadingTotal.value = false
    }
  }

  async function fetchList(targetPage = 1) {
    loading.value = true
    try {
      const response = await $fetch<ImageListResponse>('/api/images', {
        credentials: 'include',
        query: {
          limit: PAGE_SIZE,
          page: targetPage,
          ...listQueryParams()
        }
      })

      items.value = response.items
      page.value = response.page
      totalPages.value = response.totalPages
      total.value = response.total
    } finally {
      loading.value = false
    }
  }

  async function fetchSearch(targetPage = 1) {
    const q = activeSearch.value.trim()
    if (!q) {
      await fetchList(1)
      return
    }

    loading.value = true
    try {
      const response = await $fetch<ImageListResponse>('/api/images/search', {
        credentials: 'include',
        query: {
          q,
          limit: PAGE_SIZE,
          page: targetPage,
          ...listQueryParams()
        }
      })

      items.value = response.items
      page.value = response.page
      totalPages.value = response.totalPages
      total.value = response.total
    } finally {
      loading.value = false
    }
  }

  async function refreshList() {
    activeSearch.value = ''
    searchQuery.value = ''
    page.value = 1
    await Promise.all([fetchList(1), fetchTotal()])
  }

  async function initializeList(folder = 'all') {
    const next = folder.trim() || 'all'
    activeFolder.value = next
    page.value = 1
    activeSearch.value = ''
    searchQuery.value = ''
    await Promise.all([fetchList(1), fetchTotal(), loadStorageBackendOptions()])
  }

  async function setActiveFolder(folder: string) {
    const next = folder.trim() || 'all'
    if (next === activeFolder.value) return
    activeFolder.value = next
    page.value = 1
    if (activeSearch.value) {
      await Promise.all([fetchSearch(1), fetchTotal()])
    } else {
      await Promise.all([fetchList(1), fetchTotal()])
    }
  }

  async function setActiveStorageBackend(backendId: string) {
    const next = backendId.trim() || 'all'
    if (next === activeStorageBackend.value) return
    activeStorageBackend.value = next
    page.value = 1
    if (activeSearch.value) {
      await Promise.all([fetchSearch(1), fetchTotal()])
    } else {
      await Promise.all([fetchList(1), fetchTotal()])
    }
  }

  async function submitSearch() {
    const q = searchQuery.value.trim()
    activeSearch.value = q
    page.value = 1
    if (!q) {
      await refreshList()
      return
    }
    await fetchSearch(1)
  }

  async function goToPage(targetPage: number) {
    if (targetPage < 1 || targetPage > totalPages.value || loading.value) return
    if (activeSearch.value) {
      await fetchSearch(targetPage)
    } else {
      await fetchList(targetPage)
    }
  }

  function prependItems(newItems: ImageItem[]) {
    const matched = newItems.filter(item =>
      matchesActiveFolder(item.key) && matchesActiveStorage(item)
    )
    if (!matched.length || page.value !== 1) return
    items.value = [...matched, ...items.value]
    total.value += matched.length
    if (folderTotal.value !== null) {
      folderTotal.value += matched.length
    }
  }

  function removeItems(keys: string[]) {
    const keySet = new Set(keys)
    const removed = items.value.filter(item => keySet.has(item.key)).length
    items.value = items.value.filter(item => !keySet.has(item.key))
    if (removed > 0) {
      total.value = Math.max(0, total.value - removed)
    }
    if (folderTotal.value !== null && removed > 0) {
      folderTotal.value = Math.max(0, folderTotal.value - removed)
    }
  }

  const activeStorageLabel = computed(() => {
    if (activeStorageBackend.value === 'all') return ''
    return storageBackendOptions.value.find(
      backend => backend.id === activeStorageBackend.value
    )?.name ?? activeStorageBackend.value
  })

  const listSummary = computed(() => {
    const folder = activeFolder.value.trim() || 'all'
    const folderLabel = folder === 'all' ? t('stats.allFolders') : folder
    const storageLabel = activeStorageLabel.value
    if (loadingTotal.value && folderTotal.value === null) {
      return storageLabel
        ? `${folderLabel} · ${storageLabel} · ${t('stats.counting')}`
        : `${folderLabel} · ${t('stats.counting')}`
    }
    if (activeSearch.value) {
      if (storageLabel) {
        return t('stats.summarySearchStorage', {
          folder: folderLabel,
          storage: storageLabel,
          q: activeSearch.value,
          total: total.value
        })
      }
      return t('stats.summarySearch', { folder: folderLabel, q: activeSearch.value, total: total.value })
    }
    const count = folderTotal.value === null ? total.value : folderTotal.value
    if (storageLabel) {
      return t('stats.summaryTotalStorage', {
        folder: folderLabel,
        storage: storageLabel,
        total: count
      })
    }
    return t('stats.summaryTotal', { folder: folderLabel, total: count })
  })

  return {
    items,
    page,
    totalPages,
    total,
    loading,
    activeFolder,
    activeStorageBackend,
    storageBackendOptions,
    searchQuery,
    activeSearch,
    listSummary,
    fetchList,
    fetchSearch,
    fetchTotal,
    refreshList,
    initializeList,
    setActiveFolder,
    setActiveStorageBackend,
    loadStorageBackendOptions,
    submitSearch,
    goToPage,
    prependItems,
    removeItems
  }
}
