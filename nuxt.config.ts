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

  runtimeConfig: {
    devBypassAccess: process.env.DEV_BYPASS_ACCESS === 'true',
    adminSecret: '',
    imageBaseUrl: '',
    imageWorkerPurgeUrl: '',
    internalPurgeToken: '',
    turnstileSiteKey: '',
    turnstileSecret: '',
    apiUploadToken: ''
  },

  compatibilityDate: '2026-06-30',

  nitro: {
    preset: 'cloudflare_pages',
    cloudflare: {
      deployConfig: true
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
