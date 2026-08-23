import type { DropdownMenuItem } from '@nuxt/ui'

export function useAppearanceMenus() {
  const colorMode = useColorMode()
  const { locale, locales, setLocale, t } = useI18n()

  const themeIcon = computed(() => {
    if (colorMode.preference === 'system') return 'i-lucide-monitor'
    return colorMode.preference === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'
  })

  const localeMenuItems = computed<DropdownMenuItem[][]>(() => [[
    ...locales.value.map(loc => ({
      label: t(`locale.${loc.code}`),
      icon: 'i-lucide-languages',
      type: 'checkbox' as const,
      checked: locale.value === loc.code,
      onUpdateChecked(checked: boolean) {
        if (checked && typeof loc.code === 'string') {
          void setLocale(loc.code)
        }
      }
    }))
  ]])

  const themeMenuItems = computed<DropdownMenuItem[][]>(() => [[
    {
      label: t('theme.light'),
      icon: 'i-lucide-sun',
      type: 'checkbox',
      checked: colorMode.preference === 'light',
      onUpdateChecked(checked: boolean) {
        if (checked) colorMode.preference = 'light'
      }
    },
    {
      label: t('theme.dark'),
      icon: 'i-lucide-moon',
      type: 'checkbox',
      checked: colorMode.preference === 'dark',
      onUpdateChecked(checked: boolean) {
        if (checked) colorMode.preference = 'dark'
      }
    },
    {
      label: t('theme.system'),
      icon: 'i-lucide-monitor',
      type: 'checkbox',
      checked: colorMode.preference === 'system',
      onUpdateChecked(checked: boolean) {
        if (checked) colorMode.preference = 'system'
      }
    }
  ]])

  const themeOptions = computed(() => [
    {
      value: 'light' as const,
      label: t('theme.light'),
      icon: 'i-lucide-sun'
    },
    {
      value: 'dark' as const,
      label: t('theme.dark'),
      icon: 'i-lucide-moon'
    },
    {
      value: 'system' as const,
      label: t('theme.system'),
      icon: 'i-lucide-monitor'
    }
  ])

  const localeOptions = computed(() =>
    locales.value.map(loc => ({
      code: String(loc.code),
      label: t(`locale.${loc.code}`)
    }))
  )

  function setThemePreference(value: 'light' | 'dark' | 'system') {
    colorMode.preference = value
  }

  async function setLocalePreference(code: string) {
    if (code === 'zh-CN' || code === 'en') {
      await setLocale(code)
    }
  }

  return {
    themeIcon,
    localeMenuItems,
    themeMenuItems,
    localeOptions,
    themeOptions,
    setThemePreference,
    setLocalePreference
  }
}
