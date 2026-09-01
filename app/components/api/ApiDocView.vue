<script setup lang="ts">
import type { ApiDocEndpoint } from '~/composables/useApiDocs'

defineProps<{
  endpoint: ApiDocEndpoint
}>()

const { t } = useI18n()
</script>

<template>
  <section class="p-5 sm:p-6">
    <h2 class="text-base font-semibold">
      {{ t(endpoint.titleKey) }}
    </h2>

    <div class="mt-2 flex flex-wrap items-center gap-2">
      <ApiMethodBadge
        :method="endpoint.method"
        size="sm"
      />
      <code class="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-sm font-medium text-primary">
        {{ endpoint.path }}
      </code>
    </div>

    <p class="mt-3 text-sm leading-relaxed text-muted">
      {{ t(endpoint.descKey) }}
    </p>

    <div
      v-if="endpoint.params.length"
      class="mt-5 overflow-hidden rounded-xl border border-default"
    >
      <div class="border-b border-default bg-muted/20 px-4 py-2.5">
        <h3 class="text-sm font-medium">
          {{ t('api.requestParams') }}
        </h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[32rem] text-left text-sm">
          <thead>
            <tr class="border-b border-default text-xs text-muted">
              <th class="px-4 py-2.5 font-medium">
                {{ t('api.paramName') }}
              </th>
              <th class="px-4 py-2.5 font-medium">
                {{ t('api.paramType') }}
              </th>
              <th class="px-4 py-2.5 font-medium">
                {{ t('api.paramLocation') }}
              </th>
              <th class="px-4 py-2.5 font-medium">
                {{ t('api.paramRequired') }}
              </th>
              <th class="px-4 py-2.5 font-medium">
                {{ t('api.paramDescription') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="param in endpoint.params"
              :key="param.name"
              class="border-b border-default last:border-b-0"
            >
              <td class="px-4 py-2.5 font-mono text-xs">
                {{ param.name }}
                <span
                  v-if="param.required"
                  class="text-error"
                >*</span>
              </td>
              <td class="px-4 py-2.5 text-muted">
                {{ param.type }}
              </td>
              <td class="px-4 py-2.5 text-muted">
                {{ param.location }}
              </td>
              <td class="px-4 py-2.5">
                <UBadge
                  :color="param.required ? 'primary' : 'neutral'"
                  variant="subtle"
                  size="xs"
                >
                  {{ param.required ? t('api.required') : t('api.optional') }}
                </UBadge>
              </td>
              <td class="px-4 py-2.5 text-muted">
                {{ t(param.descriptionKey) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="mt-5 space-y-4">
      <div>
        <p class="mb-2 text-xs font-medium text-muted">
          {{ t('api.requestExample') }}
        </p>
        <ApiCurlBlock
          :code="endpoint.curl"
          lang="cURL"
        />
      </div>
      <div>
        <p class="mb-2 text-xs font-medium text-muted">
          {{ t('api.responseExample') }}
          <span class="font-normal">200 OK</span>
        </p>
        <ApiCurlBlock
          :code="endpoint.responseExample"
          lang="JSON"
          :scrollable="false"
        />
      </div>
    </div>
  </section>
</template>
