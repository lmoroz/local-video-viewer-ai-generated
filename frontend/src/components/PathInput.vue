<script setup>
  import { ref, onMounted, watch } from 'vue'

  const props = defineProps({
    modelValue: {
      type: String,
      default: ''
    }
  })

  const emit = defineEmits(['update:modelValue', 'search'])

  const localPath = ref(props.modelValue)
  const showHistory = ref(false)
  const history = ref([])

  onMounted(() => {
    const savedHistory = localStorage.getItem('pathHistory')
    if (savedHistory) {
      history.value = JSON.parse(savedHistory)
    }
  })

  watch(
    () => props.modelValue,
    newValue => {
      localPath.value = newValue
    }
  )

  const submitPath = () => {
    if (!localPath.value.trim()) return

    emit('update:modelValue', localPath.value)
    emit('search', localPath.value)

    addToHistory(localPath.value)
    showHistory.value = false
  }

  const addToHistory = path => {
    // Remove if exists to move to top
    const index = history.value.indexOf(path)
    if (index > -1) {
      history.value.splice(index, 1)
    }
    history.value.unshift(path)
    // Limit to 10 items
    if (history.value.length > 10) {
      history.value.pop()
    }
    localStorage.setItem('pathHistory', JSON.stringify(history.value))
  }

  const selectHistory = path => {
    localPath.value = path
    submitPath()
  }

  const removeFromHistory = index => {
    history.value.splice(index, 1)
    localStorage.setItem('pathHistory', JSON.stringify(history.value))
  }

  const handleBlur = () => {
    // Delay hiding to allow click on history item
    setTimeout(() => {
      showHistory.value = false
    }, 200)
  }
</script>

<template>
  <div class="relative w-full max-w-2xl mx-auto">
    <div class="flex gap-2">
      <input
        v-model="localPath"
        type="text"
        placeholder="Enter path to playlists folder..."
        class="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        @focus="showHistory = true"
        @blur="handleBlur"
        @keydown.enter="submitPath" />
      <button
        @click="submitPath"
        class="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
        Go
      </button>
    </div>

    <!-- History Popup -->
    <div
      v-if="showHistory && history.length > 0"
      class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
      <ul>
        <li
          v-for="(item, index) in history"
          :key="index"
          class="px-4 py-2 text-gray-700 cursor-pointer hover:bg-gray-100 flex justify-between items-center"
          @mousedown.prevent="selectHistory(item)">
          <span class="truncate">{{ item }}</span>
          <button
            @click.stop="removeFromHistory(index)"
            class="text-gray-400 hover:text-red-500 ml-2">
            &times;
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
