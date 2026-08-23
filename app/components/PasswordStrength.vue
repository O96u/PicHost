<script setup lang="ts">
import { analyzePassword, PASSWORD_MIN_LENGTH } from '~/utils/password-strength'

const props = defineProps<{
  password: string
}>()

const { t } = useI18n()

const analysis = computed(() => analyzePassword(props.password))

const show = computed(() => props.password.length > 0)

const labelColor = computed(() => {
  switch (analysis.value.label) {
    case 'strong':
      return 'text-success'
    case 'medium':
      return 'text-warning'
    default:
      return 'text-error'
  }
})

const barColor = computed(() => {
  switch (analysis.value.label) {
    case 'strong':
      return 'bg-success'
    case 'medium':
      return 'bg-warning'
    default:
      return 'bg-error/80'
  }
})

const rules = computed(() => [
  { key: 'minLength', label: t('password.ruleMinLength', { n: PASSWORD_MIN_LENGTH }) },
  { key: 'mixedCase', label: t('password.ruleMixedCase') },
  { key: 'hasNumber', label: t('password.ruleNumber') },
  { key: 'hasSpecial', label: t('password.ruleSpecial') }
] as const)
</script>

<template>
  <div
    v-if="show"
    class="space-y-3 rounded-lg border border-default bg-muted/20 px-3 py-3"
  >
    <div class="flex items-center justify-between text-sm">
      <span class="text-muted">{{ t('password.strength') }}</span>
      <span
        class="font-medium"
        :class="labelColor"
      >
        {{ t(`password.${analysis.label}`) }}
      </span>
    </div>

    <div class="flex gap-1.5">
      <span
        v-for="index in 4"
        :key="index"
        class="h-1.5 flex-1 rounded-full transition-colors"
        :class="index <= analysis.score ? barColor : 'bg-default'"
      />
    </div>

    <ul class="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
      <li
        v-for="rule in rules"
        :key="rule.key"
        class="flex items-center gap-1.5 transition-colors"
        :class="analysis.criteria[rule.key] ? 'text-success' : 'text-muted'"
      >
        <UIcon
          :name="analysis.criteria[rule.key] ? 'i-lucide-check' : 'i-lucide-circle'"
          class="size-3.5 shrink-0"
        />
        <span>{{ rule.label }}</span>
      </li>
    </ul>
  </div>
</template>
