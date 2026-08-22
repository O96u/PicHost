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
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'system',
    fallback: 'light'
  },

  runtimeConfig: {
    appVersion: pkg.version,
    devBypassAccess: process.env.DEV_BYPASS_ACCESS === 'true',
    adminSecret: '',
    imageBaseUrl: '',
    apiUploadToken: ''
  },

  compatibilityDate: '2026-06-30',

  nitro: {
    preset: 'node-server',
    scheduledTasks: {
      '0 3 * * *': ['auto-delete']
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
