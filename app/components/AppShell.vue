<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import logoLight from '~/assets/image/logo-light.png'
import logoDark from '~/assets/image/logo-dark.png'

const route = useRoute()
const { logout, user, isAdmin } = useAuth()
const { t } = useI18n()

const mobileNavOpen = ref(false)
const mobileUserOpen = ref(false)

const navItems = computed(() => {
  const items = [
    { label: t('nav.api'), to: '/api', icon: 'i-lucide-code-2' },
    { label: t('nav.stats'), to: '/stats', icon: 'i-lucide-chart-column' }
  ]
  if (isAdmin.value) {
    items.push({ label: t('nav.storage'), to: '/storage', icon: 'i-lucide-hard-drive' })
    items.push({ label: t('nav.settings'), to: '/settings', icon: 'i-lucide-settings' })
  }
  return items
})

const accountMenuItems = computed<DropdownMenuItem[]>(() => [
  {
    label: t('nav.logs'),
    icon: 'i-lucide-scroll-text',
    to: '/logs'
  },
  {
    label: t('nav.changePassword'),
    icon: 'i-lucide-key-round',
    to: '/account/password'
  },
  {
    label: t('nav.logout'),
    icon: 'i-lucide-log-out',
    onSelect() {
      void handleLogout()
    }
  }
])

const desktopUserMenuItems = computed<DropdownMenuItem[][]>(() => [
  accountMenuItems.value
])

function isNavActive(to: string) {
  if (to === '/settings') {
    return route.path === '/settings'
  }
  return route.path.startsWith(to)
}

watch(mobileNavOpen, (open) => {
  if (open) mobileUserOpen.value = false
})

watch(mobileUserOpen, (open) => {
  if (open) mobileNavOpen.value = false
})

async function handleLogout() {
  await logout()
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="sticky top-0 z-40 border-b border-default bg-default/80 backdrop-blur">
      <div class="mx-auto max-w-7xl px-4 py-2.5 sm:px-6">
        <div class="flex items-center justify-between gap-3">
          <NuxtLink
            to="/"
            :title="t('nav.backToUpload')"
            class="group flex min-w-0 shrink items-center gap-2.5 transition-opacity hover:opacity-90 sm:gap-3"
          >
            <img
              :src="logoLight"
              alt="PicHost"
              class="h-9 w-auto shrink-0 object-contain sm:h-11 dark:hidden"
              decoding="async"
              draggable="false"
            >
            <img
              :src="logoDark"
              alt="PicHost"
              class="hidden h-9 w-auto shrink-0 object-contain sm:h-11 dark:block"
              decoding="async"
              draggable="false"
            >
            <div class="min-w-0 leading-tight">
              <p class="text-[15px] font-bold tracking-tight sm:text-base">
                <span class="text-highlighted">Pic</span><span class="text-primary">Host</span>
              </p>
              <p class="mt-0.5 hidden text-[11px] text-muted min-[380px]:block sm:text-xs">
                {{ t('app.tagline') }}
              </p>
            </div>
          </NuxtLink>

          <ClientOnly>
            <div class="flex shrink-0 items-center gap-0.5 sm:gap-1">
              <nav class="hidden items-center gap-1 sm:flex">
                <UButton
                  v-for="item in navItems"
                  :key="item.to"
                  :to="item.to"
                  size="sm"
                  :variant="isNavActive(item.to) ? 'soft' : 'ghost'"
                  :color="isNavActive(item.to) ? 'primary' : 'neutral'"
                  :icon="item.icon"
                  :label="item.label"
                />
              </nav>

              <div class="mx-1 hidden h-5 w-px bg-muted sm:block" />

              <div class="hidden items-center gap-0.5 sm:flex">
                <LocaleMenu />
                <ThemeMenu />
              </div>

              <div class="flex items-center gap-0.5 sm:hidden">
                <MobileUserMenu
                  v-if="user"
                  v-model:open="mobileUserOpen"
                />
                <MobileNavMenu
                  v-model:open="mobileNavOpen"
                  :items="navItems"
                />
              </div>

              <div class="hidden sm:block">
                <UDropdownMenu
                  v-if="user"
                  :items="desktopUserMenuItems"
                >
                  <UButton
                    variant="ghost"
                    color="neutral"
                    size="sm"
                    class="max-w-[10rem] gap-1.5"
                  >
                    <UIcon
                      name="i-lucide-user"
                      class="size-4 shrink-0"
                    />
                    <span class="truncate">{{ user.username }}</span>
                    <UIcon
                      name="i-lucide-chevron-down"
                      class="size-3.5 shrink-0 opacity-60"
                    />
                  </UButton>
                </UDropdownMenu>
              </div>
            </div>
            <template #fallback>
              <div class="size-8" />
            </template>
          </ClientOnly>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6">
      <slot />
    </main>

    <footer class="px-4 py-6 text-center text-xs text-muted">
      Copyright © 2026 O96u
      ·
      <a
        href="https://github.com/O96u/PicHost"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:text-highlighted"
      >
        GitHub
      </a>
    </footer>
  </div>
</template>
