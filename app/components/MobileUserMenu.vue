<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const { logout } = useAuth()
const { t, locale } = useI18n()
const colorMode = useColorMode()
const {
  localeOptions,
  themeOptions,
  setLocalePreference,
  setThemePreference
} = useAppearanceMenus()

const menuRef = ref<HTMLElement | null>(null)

async function handleLogout() {
  open.value = false
  await logout()
}

function onDocumentClick(event: MouseEvent) {
  if (!open.value || !menuRef.value) return
  const target = event.target
  if (target instanceof Node && !menuRef.value.contains(target)) {
    open.value = false
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('click', onDocumentClick, true)
  } else {
    document.removeEventListener('click', onDocumentClick, true)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick, true)
})

function toggleOpen() {
  open.value = !open.value
}
</script>

<template>
  <div
    ref="menuRef"
    class="relative sm:hidden"
  >
    <UButton
      variant="ghost"
      color="neutral"
      size="sm"
      icon="i-lucide-user"
      :aria-label="t('nav.account')"
      :aria-expanded="open"
      @click.stop="toggleOpen"
    />

    <div
      v-show="open"
      class="absolute top-full right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-default bg-default p-4 shadow-lg"
      @click.stop
    >
      <section class="space-y-2">
        <h3 class="flex items-center gap-2 px-1 text-sm font-medium text-muted">
          <UIcon
            name="i-lucide-globe"
            class="size-4"
          />
          {{ t('nav.language') }}
        </h3>
        <div class="space-y-2">
          <button
            v-for="item in localeOptions"
            :key="item.code"
            type="button"
            class="flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm transition-colors"
            :class="locale === item.code
              ? 'border-primary text-highlighted'
              : 'border-default text-highlighted hover:bg-elevated'"
            @click="setLocalePreference(item.code)"
          >
            <span>{{ item.label }}</span>
            <UIcon
              v-if="locale === item.code"
              name="i-lucide-check"
              class="size-4 text-primary"
            />
          </button>
        </div>
      </section>

      <section class="mt-5 space-y-2">
        <h3 class="flex items-center gap-2 px-1 text-sm font-medium text-muted">
          <UIcon
            name="i-lucide-sun"
            class="size-4"
          />
          {{ t('nav.appearance') }}
        </h3>
        <div class="space-y-2">
          <button
            v-for="item in themeOptions"
            :key="item.value"
            type="button"
            class="flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm transition-colors"
            :class="colorMode.preference === item.value
              ? 'border-primary text-highlighted'
              : 'border-default text-highlighted hover:bg-elevated'"
            @click="setThemePreference(item.value)"
          >
            <span class="flex items-center gap-2.5">
              <UIcon
                :name="item.icon"
                class="size-4 opacity-70"
              />
              {{ item.label }}
            </span>
            <UIcon
              v-if="colorMode.preference === item.value"
              name="i-lucide-check"
              class="size-4 text-primary"
            />
          </button>
        </div>
      </section>

      <section class="mt-5 space-y-2">
        <h3 class="flex items-center gap-2 px-1 text-sm font-medium text-muted">
          <UIcon
            name="i-lucide-user"
            class="size-4"
          />
          {{ t('nav.account') }}
        </h3>
        <div class="space-y-2">
          <NuxtLink
            to="/logs"
            class="flex items-center justify-between rounded-lg border border-default px-3.5 py-2.5 text-sm text-highlighted transition-colors hover:bg-elevated"
            @click="open = false"
          >
            <span class="flex items-center gap-2.5">
              <UIcon
                name="i-lucide-scroll-text"
                class="size-4 opacity-70"
              />
              {{ t('nav.logs') }}
            </span>
            <UIcon
              name="i-lucide-chevron-right"
              class="size-4 text-muted"
            />
          </NuxtLink>

          <NuxtLink
            to="/account/password"
            class="flex items-center justify-between rounded-lg border border-default px-3.5 py-2.5 text-sm text-highlighted transition-colors hover:bg-elevated"
            @click="open = false"
          >
            <span class="flex items-center gap-2.5">
              <UIcon
                name="i-lucide-lock"
                class="size-4 opacity-70"
              />
              {{ t('nav.changePassword') }}
            </span>
            <UIcon
              name="i-lucide-chevron-right"
              class="size-4 text-muted"
            />
          </NuxtLink>

          <button
            type="button"
            class="flex w-full items-center justify-between rounded-lg border border-default px-3.5 py-2.5 text-sm text-error transition-colors hover:bg-error/5"
            @click="handleLogout"
          >
            <span class="flex items-center gap-2.5">
              <UIcon
                name="i-lucide-log-out"
                class="size-4"
              />
              {{ t('nav.logout') }}
            </span>
            <UIcon
              name="i-lucide-chevron-right"
              class="size-4 opacity-60"
            />
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
