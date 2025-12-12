<script setup>
  import { ref, watch, nextTick, onMounted } from 'vue'
  import api from '@/shared/api'
  import { formatDuration, formatDate } from '@/shared/lib/utils.js'
  import { videoProgress } from '@/entities/settings/model/useSettings'

  const props = defineProps({
    videos: {
      type: Array,
      required: true
    },
    currentVideoId: {
      type: String,
      required: true
    },
    playlistId: {
      type: String,
      required: true
    },
    dir: {
      type: String,
      required: true
    },
    autoPlay: {
      type: Boolean,
      default: false
    }
  })

  const emit = defineEmits(['update:autoPlay', 'shuffle'])

  const isShuffled = ref(false)
  const itemRefs = ref({})

  const toggleShuffle = () => {
    isShuffled.value = !isShuffled.value
    emit('shuffle', isShuffled.value)
  }

  const updateAutoPlay = e => {
    emit('update:autoPlay', e.target.checked)
  }

  // Auto-scroll logic
  const scrollToActive = async () => {
    await nextTick()
    const activeId = String(props.currentVideoId)
    const el = itemRefs.value[activeId]
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }

  watch(() => props.currentVideoId, scrollToActive)
  onMounted(scrollToActive)
</script>

<template>
  <div
    class="chapters lg:w-96 bg-linear-to-b from-gray-900/95 to-transparent border border-gray-600 overflow-hidden flex-shrink-0 custom-scrollbar rounded-xl flex flex-col">
    <div class="p-4 border-b border-gray-700 font-semibold bg-gray-900/95 flex items-center justify-between sticky top-0 z-10">
      <span>Playlist ({{ videos.length }})</span>
      <div class="flex items-center gap-2">
        <button
          @click="toggleShuffle"
          class="p-2 rounded hover:bg-gray-700 transition-colors"
          :class="{ 'text-blue-400': isShuffled, 'text-gray-400': !isShuffled }"
          title="Shuffle">
          <i class="bi bi-shuffle" />
        </button>
        <label class="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white select-none">
          <input
            type="checkbox"
            :checked="autoPlay"
            @change="updateAutoPlay"
            class="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500" />
          Auto-play
        </label>
      </div>
    </div>
    <div class="overflow-y-auto custom-scrollbar flex-1">
      <router-link
        v-for="video in videos"
        :key="video.originalIndex"
        :ref="el => { if (el) itemRefs[String(video.id || video.filename)] = el.$el }"
        :to="{
          name: 'Video',
          params: { videoId: video.id || video.filename, playlistId: playlistId },
          query: { dir: dir }
        }"
        class="flex gap-3 p-3 hover:bg-gray-700/50 transition-colors border-b border-gray-700/30 last:border-0 group"
        :class="{ 'bg-blue-900/20 border-l-2 border-l-blue-500': String(video.id || video.filename) === String(currentVideoId) }">
        <div class="w-24 aspect-video bg-gray-800 rounded overflow-hidden flex-shrink-0 relative">
          <img
            v-if="video.thumbnail"
            :src="api.getFileUrl(video.thumbnail)"
            class="w-full h-full object-cover" />
          <div
            v-else
            class="w-full h-full flex items-center justify-center text-gray-500">
            <i class="bi bi-play-circle" />
          </div>
          <div
            v-if="videoProgress[video.id] && video.duration > 0"
            class="absolute bottom-0 left-0 h-1 bg-red-600 z-10"
            :style="{ width: Math.min((videoProgress[video.id] / video.duration) * 100, 100) + '%' }" />
          <div class="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[10px] px-1 rounded font-mono">
            {{ formatDuration(video.duration) }}
          </div>
        </div>
        <div class="flex-1 min-w-0 flex flex-col justify-center">
          <div
            class="text-sm font-medium group-hover:text-blue-300 transition-colors"
            :class="{ 'text-blue-400': String(video.id || video.filename) === String(currentVideoId), 'text-gray-200': String(video.id || video.filename) !== String(currentVideoId) }">
            {{ video.title }}
          </div>
          <div class="text-xs text-gray-500 mt-1 flex items-center gap-2">
            <template v-if="video.uploader || video.upload_date">{{ video.uploader }} | {{ formatDate(video.upload_date) }}</template>
          </div>
        </div>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
  .chapters {
    max-height: calc(100vh - 200px);
  }
</style>
