<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import logoLight from '~/assets/image/logo-light.png'
import logoDark from '~/assets/image/logo-dark.png'

const route = useRoute()
const colorMode = useColorMode()
const { logout, user, isAdmin } = useAuth()

const navItems = computed(() => {
  const items = [
    { label: 'API', to: '/api', icon: 'i-lucide-code-2' },
    { label: '统计', to: '/stats', icon: 'i-lucide-chart-column' }
  ]
  if (isAdmin.value) {
    items.push({ label: '设置', to: '/settings', icon: 'i-lucide-settings' })
  }
  return items
})

const themeIcon = computed(() => {
  if (colorMode.preference === 'system') return 'i-lucide-monitor'
  return colorMode.preference === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'
})

const themeItems = computed<DropdownMenuItem[][]>(() => [[
  {
    label: '浅色',
    icon: 'i-lucide-sun',
    type: 'checkbox',
    checked: colorMode.preference === 'light',
    onUpdateChecked(checked: boolean) {
      if (checked) colorMode.preference = 'light'
    }
  },
  {
    label: '深色',
    icon: 'i-lucide-moon',
    type: 'checkbox',
    checked: colorMode.preference === 'dark',
    onUpdateChecked(checked: boolean) {
      if (checked) colorMode.preference = 'dark'
    }
  },
  {
    label: '跟随系统',
    icon: 'i-lucide-monitor',
    type: 'checkbox',
    checked: colorMode.preference === 'system',
    onUpdateChecked(checked: boolean) {
      if (checked) colorMode.preference = 'system'
    }
  }
]])

const userMenuItems = computed<DropdownMenuItem[][]>(() => {
  const items: DropdownMenuItem[] = [
    {
      label: '修改密码',
      icon: 'i-lucide-key-round',
      to: '/account/password'
    }
  ]

  if (isAdmin.value) {
    items.push({
      label: '系统设置',
      icon: 'i-lucide-settings',
      to: '/settings'
    })
  }

  items.push({
    label: '退出登录',
    icon: 'i-lucide-log-out',
    onSelect() {
      void handleLogout()
    }
  })

  return [items]
})

function isNavActive(to: string) {
  return route.path.startsWith(to)
}

async function handleLogout() {
  await logout()
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="sticky top-0 z-40 border-b border-default bg-default/80 backdrop-blur">
      <div class="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <NuxtLink
          to="/"
          title="返回上传"
          class="group flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90 sm:gap-3"
        >
          <img
            :src="logoLight"
            alt="PicHost"
            class="h-10 w-auto shrink-0 object-contain sm:h-11 dark:hidden"
            decoding="async"
            draggable="false"
          >
          <img
            :src="logoDark"
            alt="PicHost"
            class="hidden h-10 w-auto shrink-0 object-contain sm:h-11 dark:block"
            decoding="async"
            draggable="false"
          >
          <div class="min-w-0 leading-tight">
            <p class="text-[15px] font-bold tracking-tight sm:text-base">
              <span class="text-highlighted">Pic</span><span class="text-primary">Host</span>
            </p>
            <p class="mt-0.5 text-[11px] text-muted sm:text-xs">
              个人轻量图床
            </p>
          </div>
        </NuxtLink>

        <div class="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          <nav class="flex flex-wrap items-center gap-1">
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

          <ClientOnly>
            <UDropdownMenu
              v-if="user"
              :items="userMenuItems"
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
            <UDropdownMenu :items="themeItems">
              <UButton
                :icon="themeIcon"
                variant="ghost"
                color="neutral"
                size="sm"
                aria-label="切换主题"
              />
            </UDropdownMenu>
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
