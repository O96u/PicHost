<script setup lang="ts">
import { analyzePassword, PASSWORD_MIN_LENGTH } from '~/utils/password-strength'

const props = defineProps<{
  password: string
}>()

const analysis = computed(() => analyzePassword(props.password))

const show = computed(() => props.password.length > 0)

const labelColor = computed(() => {
  switch (analysis.value.label) {
    case '强':
      return 'text-success'
    case '中':
      return 'text-warning'
    default:
      return 'text-error'
  }
})

const barColor = computed(() => {
  switch (analysis.value.label) {
    case '强':
      return 'bg-success'
    case '中':
      return 'bg-warning'
    default:
      return 'bg-error/80'
  }
})

const rules = computed(() => [
  { key: 'minLength', label: `至少 ${PASSWORD_MIN_LENGTH} 个字符` },
  { key: 'mixedCase', label: '包含大小写字母' },
  { key: 'hasNumber', label: '包含数字' },
  { key: 'hasSpecial', label: '包含特殊字符' }
] as const)
</script>

<template>
  <div
    v-if="show"
    class="space-y-3 rounded-lg border border-default bg-muted/20 px-3 py-3"
  >
    <div class="flex items-center justify-between text-sm">
      <span class="text-muted">密码强度</span>
      <span
        class="font-medium"
        :class="labelColor"
      >
        {{ analysis.label }}
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
