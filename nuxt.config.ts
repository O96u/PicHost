import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8')) as {
  version: string
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/i18n'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  vue: {
    compilerOptions: {
      isCustomElement: tag => tag.startsWith('cap-')
    }
  },

  colorMode: {
    preference: 'system',
    fallback: 'light'
  },

  runtimeConfig: {
    appVersion: pkg.version,
    devBypassAccess: process.env.DEV_BYPASS_ACCESS === 'true',
    adminSecret: '',
    siteBaseUrl: '',
    imageBaseUrl: '',
    apiUploadToken: ''
  },

  devServer: {
    host: '127.0.0.1',
    port: 3000
  },

  compatibilityDate: '2026-06-30',

  nitro: {
    preset: 'node-server',
    scheduledTasks: {
      '0 3 * * *': ['auto-delete']
    }
  },

  vite: {
    server: {
      allowedHosts: true
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  i18n: {
    locales: [
      { code: 'zh-CN', name: '简体中文', language: 'zh-CN', file: 'zh-CN.json' },
      { code: 'en', name: 'English', language: 'en', file: 'en.json' }
    ],
    defaultLocale: 'zh-CN',
    langDir: 'locales',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      cookieKey: 'pic_locale',
      fallbackLocale: 'zh-CN'
    }
  }
})
