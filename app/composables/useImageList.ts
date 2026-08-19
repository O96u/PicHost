import type {
  ImageItem,
  ImageListResponse
} from '~/types/image'

export function useImageList() {
  const items = ref<ImageItem[]>([])
  const cursor = ref<string | undefined>()
  const truncated = ref(false)
  const loading = ref(false)
  const loadingMore = ref(false)
  const totalInBucket = ref<number | null>(null)
  const loadingTotal = ref(false)
  const searchQuery = ref('')
  const activeSearch = ref('')

  async function fetchTotal() {
    loadingTotal.value = true
    try {
      const data = await $fetch<{ total: number }>('/api/images/count', {
        credentials: 'include'
      })
      totalInBucket.value = data.total
    } catch {
      totalInBucket.value = null
    } finally {
      loadingTotal.value = false
    }
  }

  async function fetchList(reset = true) {
    if (reset) {
      loading.value = true
      cursor.value = undefined
    } else {
      loadingMore.value = true
    }

    try {
      const response = await $fetch<ImageListResponse>('/api/images', {
        credentials: 'include',
        query: {
          limit: 30,
          ...(reset ? {} : { cursor: cursor.value })
        }
      })

      if (reset) {
        items.value = response.items
      } else {
        items.value = [...items.value, ...response.items]
      }

      cursor.value = response.cursor
      truncated.value = response.truncated
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  async function fetchSearch(reset = true) {
    const q = activeSearch.value.trim()
    if (!q) {
      await fetchList(true)
      return
    }

    if (reset) {
      loading.value = true
      cursor.value = undefined
    } else {
      loadingMore.value = true
    }

    try {
      const response = await $fetch<ImageListResponse>('/api/images/search', {
        credentials: 'include',
        query: {
          q,
          limit: 30,
          ...(reset ? {} : { cursor: cursor.value })
        }
      })

      if (reset) {
        items.value = response.items
      } else {
        items.value = [...items.value, ...response.items]
      }

      cursor.value = response.cursor
      truncated.value = response.truncated
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  async function refreshList() {
    activeSearch.value = ''
    searchQuery.value = ''
    await Promise.all([fetchList(true), fetchTotal()])
  }

  async function submitSearch() {
    const q = searchQuery.value.trim()
    activeSearch.value = q
    if (!q) {
      await refreshList()
      return
    }
    await fetchSearch(true)
  }

  async function loadMore() {
    if (!truncated.value || !cursor.value || loadingMore.value) return
    if (activeSearch.value) {
      await fetchSearch(false)
    } else {
      await fetchList(false)
    }
  }

  function prependItems(newItems: ImageItem[]) {
    items.value = [...newItems, ...items.value]
    if (totalInBucket.value !== null) {
      totalInBucket.value += newItems.length
    }
  }

  function removeItems(keys: string[]) {
    const keySet = new Set(keys)
    const removed = items.value.filter(item => keySet.has(item.key)).length
    items.value = items.value.filter(item => !keySet.has(item.key))
    if (totalInBucket.value !== null && removed > 0) {
      totalInBucket.value = Math.max(0, totalInBucket.value - removed)
    }
  }

  const listSummary = computed(() => {
    if (loadingTotal.value && totalInBucket.value === null) {
      return '统计中…'
    }
    if (totalInBucket.value === null) {
      return `已加载 ${items.value.length} 张`
    }
    if (activeSearch.value) {
      return `搜索「${activeSearch.value}」· 已匹配 ${items.value.length} 张 · 桶内共 ${totalInBucket.value} 张`
    }
    if (items.value.length >= totalInBucket.value) {
      return `共 ${totalInBucket.value} 张`
    }
    return `已加载 ${items.value.length} / 共 ${totalInBucket.value} 张`
  })

  return {
    items,
    cursor,
    truncated,
    loading,
    loadingMore,
    totalInBucket,
    searchQuery,
    activeSearch,
    listSummary,
    fetchList,
    fetchTotal,
    refreshList,
    submitSearch,
    loadMore,
    prependItems,
    removeItems
  }
}
