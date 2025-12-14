<script setup>
  import { ref, computed, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import api from '@/shared/api'
  import { settings, videoProgress, sortingOptions } from '@/entities/settings/model/useSettings'
  import { sortVideos } from '@/shared/lib/utils.js'

  const props = defineProps({
    videoId: String,
    dir: String,
    playlistId: String
  })

  const router = useRouter()
  const videoPlayerRef = ref(null)
  const videoData = ref(null)
  const playlistTitle = ref('')
  const chaptersVisible = ref(true)

  // Player State tracked in parent for coordination
  const currentTime = ref(0)
  const duration = ref(0)
  const isPlaying = ref(false)

  const chapters = computed(() => videoData.value?.chapters || [])

  const currentChapterName = computed(() => {
    if (!chapters.value.length) return ''
    const current = [...chapters.value].reverse().find(c => c.start_time <= currentTime.value)
    return current ? current.title : ''
  })

  // Playlist Logic
  const playlistVideos = ref([])
  // Initialize autoPlay from settings
  const autoPlay = computed({
    get: () => settings.value.autoPlay,
    set: val => (settings.value.autoPlay = val)
  })
  const isShuffled = ref(false)
  const shuffledVideos = ref([])

  const displayVideos = computed(() => {
    return isShuffled.value ? shuffledVideos.value : playlistVideos.value
  })

  const currentVideoIndex = computed(() => {
    return displayVideos.value.findIndex(v => v.id === props.videoId || v.filename === props.videoId)
  })

  const handleShuffle = shuffledState => {
    isShuffled.value = shuffledState
    if (isShuffled.value) {
      shuffledVideos.value = [...playlistVideos.value].sort(() => Math.random() - 0.5)
    }
  }

  const handleVideoEnd = () => {
    const id = props.videoId
    delete videoProgress.value[id]
    if (autoPlay.value) {
      const nextIndex = currentVideoIndex.value + 1
      if (nextIndex < displayVideos.value.length) {
        const nextVideo = displayVideos.value[nextIndex]
        router.push({
          name: 'Video',
          params: { videoId: nextVideo.id || nextVideo.filename, playlistId: props.playlistId },
          query: { dir: props.dir }
        })
      }
    }
  }

  const loadVideoData = async () => {
    if (!props.playlistId || !props.dir) return

    try {
      const response = await api.getPlaylistDetails(props.playlistId, props.dir)
      const mappedVideos = response.data.videos.map((v, i) => {
        return {
          ...v,
          originalIndex: i
        }
      })

      // Apply saved sort order
      const sortBy = sortingOptions.value[props.playlistId] || 'default'
      playlistVideos.value = sortVideos(mappedVideos, sortBy)
      playlistTitle.value = response.data.title || props.playlistId

      const found = playlistVideos.value.find(v => v.id === props.videoId || v.filename === props.videoId)
      if (found) {
        videoData.value = found
        document.title = videoData.value.title
      }
    } catch (err) {
      console.error('Failed to load video data', err)
    }
  }



  const onSeek = time => {
    if (videoPlayerRef.value) {
      videoPlayerRef.value.seekTo(time)
    }
  }

  watch(() => [props.playlistId, props.dir, props.videoId], loadVideoData, { deep: true, immediate: true })
</script>

<template>
  <div class="min-h-screen text-white">
    <StickyHeader
      :to="{
        name: 'Playlist',
        params: { id: props.playlistId },
        query: { dir: props.dir }
      }"
      :to-title="playlistTitle"
      :dir="props.dir"
      :page-title="videoData?.title || videoId" />

    <div class="flex flex-col lg:flex-row overflow-hidden gap-9 px-7">
      <!-- Left Column: Video + Info (Scrollable) -->
      <div class="flex-1 bg-black custom-scrollbar">
        <!-- Player Section -->
        <VideoPlayer
          v-if="videoData"
          ref="videoPlayerRef"
          :video-data="videoData"
          :chapters="chapters"
          :current-chapter-name="currentChapterName"
          class="max-height"
          @timeupdate="t => (currentTime = t)"
          @durationchange="d => (duration = d)"
          @play="isPlaying = true"
          @pause="isPlaying = false"
          @ended="handleVideoEnd"
          @toggleChapters="chaptersVisible = !chaptersVisible" />

        <!-- Info Section (Below player) -->
        <VideoInfo
          v-if="videoData"
          :video-data="videoData" />
      </div>

      <div class="lg:w-96 flex flex-col gap-6">
        <!-- Chapters Sidebar (Fixed Right) -->
        <ChaptersSidebar
          :chapters="chapters"
          :current-chapter-name="currentChapterName"
          :visible="chaptersVisible"
          class="max-height"
          @close="chaptersVisible = false"
          @seek="onSeek" />

        <!-- Playlist Sidebar (Fixed Right) -->
        <PlaylistSidebar
          :videos="displayVideos"
          :current-video-id="videoId"
          :playlist-id="playlistId"
          :dir="dir"
          v-model:auto-play="autoPlay"
          @shuffle="handleShuffle"
          class="max-height" />
      </div>
    </div>
  </div>
</template>

<style scoped>
  .max-height {
    max-height: calc(100vh - 200px);
  }
</style>
