<script setup>
  import { ref, watch } from 'vue'

  const props = defineProps({
    disabled: {
      type: Boolean,
      default: false
    },
    initialQuery: {
      type: String,
      default: ''
    }
  })

  const emit = defineEmits(['search'])

  const query = ref(props.initialQuery)

  watch(
    () => props.initialQuery,
    newVal => {
      query.value = newVal
    }
  )

  const handleSearch = () => {
    if (props.disabled) return
    emit('search', query.value)
  }
</script>

<template>
  <div class="relative w-full max-w-md">
    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <i class="bi bi-search text-gray-400"></i>
    </div>
    <input
      v-model="query"
      type="text"
      class="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-lg leading-5 bg-gray-800 text-gray-300 placeholder-gray-400 focus:outline-none focus:bg-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
      :class="{ 'opacity-50 cursor-not-allowed': disabled }"
      :placeholder="disabled ? 'Select a directory first' : 'Search videos...'"
      :disabled="disabled"
      @keyup.enter="handleSearch" />
  </div>
</template>
