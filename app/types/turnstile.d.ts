declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          'sitekey': string
          'callback': (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
          'action'?: string
          'theme'?: 'light' | 'dark' | 'auto'
        }
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

export {}
