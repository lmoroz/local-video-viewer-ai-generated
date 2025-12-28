<script setup>
  import { computed } from 'vue'
  import api from '@/shared/api'
  import { formatDuration, formatDate } from '@/shared/lib/utils.js'
  import { videoProgress } from '@/entities/settings/model/useSettings'

  const props = defineProps({
    data: {
      type: Object
    },
    to: {
      type: Object
    },
    isPlaylist: {
      type: Boolean,
      default: false
    }
  })
  const title = computed(() => props.data.title || props.data.name)
  const imageUrl = computed(() => {
    const path = props.isPlaylist ? props.data.cover : props.data.thumbnail
    return path ? api.getFileUrl(path) : null
  })

  const progressPercentage = computed(() => {
    if (props.isPlaylist || !props.data.duration || !videoProgress.value[props.data.id]) return 0
    const percent = (videoProgress.value[props.data.id] / props.data.duration) * 100
    return Math.min(percent, 100)
  })
</script>

<template>
  <router-link
    :to="to"
    class="card group">
    <!-- Background Noise &amp; Decorators -->
    <div class="card__noise" />
    <div class="card__shine" />
    <div
      class="card__media-wrapper"
      :class="{ 'is-playlist': isPlaylist }">
      <div class="card__aspect-box">
        <!-- Playlist Stack Effects -->
        <template v-if="isPlaylist">
          <div class="stack-layer stack-layer--back" />
          <div class="stack-layer stack-layer--middle" />
        </template>

        <!-- Main Image Container -->
        <div class="media-container">
          <img
            v-if="imageUrl"
            :src="imageUrl"
            loading="lazy"
            decoding="async"
            alt="cover"
            class="media-image" />

          <div
            v-else
            class="media-placeholder">
            <i
              :class="isPlaylist ? 'bi-collection-play text-5xl opacity-50' : 'bi-play-circle text-3xl'"
              class="bi" />
          </div>

          <!-- Overlays -->
          <div
            v-if="isPlaylist && data.videoCount"
            class="badge badge--bottom-right">
            {{ data.videoCount }} videos
          </div>

          <template v-else-if="!isPlaylist">
            <div
              v-if="progressPercentage > 0"
              class="progress-bar"
              :style="{ width: `${progressPercentage}%` }" />

            <div class="badge badge--bottom-right font-mono">
              {{ formatDuration(data.duration) }}
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Info Section -->
    <div
      class="card__content"
      :class="{ 'pt-3': isPlaylist }">
      <h3
        class="card__title"
        :title="title">
        {{ title }}
      </h3>

      <div
        v-if="data.playlistName"
        class="card__subtitle"
        :title="data.playlistName">
        <i class="bi bi-folder-fill shrink-0" />
        <span class="truncate">{{ data.playlistName }}</span>
      </div>

      <!-- Footer Meta -->
      <div class="card__footer">
        <div
          v-if="data.uploader"
          class="meta-row text-gray-300">
          <i class="bi bi-person shrink-0" />
          <span class="truncate">{{ data.uploader }}</span>
        </div>

        <div
          v-if="isPlaylist"
          class="meta-row text-xs">
          <span class="tag-updated">Updated</span>
          <span>{{ new Date(data.updatedAt).toLocaleDateString() }}</span>
        </div>

        <div
          v-else-if="data.upload_date"
          class="meta-row">
          <i class="bi bi-calendar3 shrink-0" />
          <span>{{ formatDate(data.upload_date) }}</span>
        </div>
      </div>
    </div>
  </router-link>
</template>

<style scoped>
  @reference "@/app/assets/css/styles.css";

  .card {
    @apply relative flex flex-col h-full overflow-hidden rounded-xl border border-white/10;
    @apply bg-gray-800/20 backdrop-blur-xl shadow-lg shadow-black/30;
    @apply transition-all duration-200;
    @apply hover:-translate-y-1 hover:shadow-md;
    contain: content;
    content-visibility: auto;
  }

  .card__noise {
    @apply absolute inset-0 pointer-events-none opacity-[0.035] z-30 rounded-xl;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E");
  }

  .card__shine {
    @apply absolute inset-0 pointer-events-none z-30 rounded-xl opacity-40 transition-all duration-500 ease-out;
    background: linear-gradient(to bottom right, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05), transparent);
  }

  .card:hover .card__shine {
    @apply opacity-30 backdrop-blur-3xl;
    background: linear-gradient(to bottom right, rgba(255, 255, 255, 0.15), transparent);
  }

  /* Фикс видимости стопки */
  .card__media-wrapper {
    @apply w-full bg-gray-700 relative z-10 overflow-hidden;
  }

  .card__media-wrapper.is-playlist {
    /* Важно: overflow-visible позволяет слоям выходить за границы */
    @apply overflow-visible bg-transparent px-2 pt-5 pb-1;
    isolation: isolate;
  }

  .card__aspect-box {
    @apply relative w-full aspect-video;
  }

  /* Стили изображения */
  .media-container {
    @apply relative h-full w-full bg-gray-700 rounded-xl overflow-hidden shadow-xl border border-gray-600/50 z-10;
    transform: translateZ(0);
  }

  .media-image {
    @apply w-full h-full object-cover transition-transform duration-500;
    will-change: transform;
  }

  .card:hover .media-image {
    @apply scale-105;
  }

  .media-placeholder {
    @apply w-full h-full flex items-center justify-center text-gray-400 bg-gray-800;
  }

  /* Стили стопки (слои) */
  .stack-layer {
    @apply absolute h-full w-full rounded-xl border border-gray-600 shadow-sm transition-transform duration-200;
  }

  .stack-layer--back {
    @apply bg-gray-800/20 -top-5 left-0 scale-[0.90];
    z-index: -2;
  }

  .stack-layer--middle {
    @apply bg-gray-700/10 -top-2.75 left-0 scale-[0.93] border-gray-500/50;
    z-index: -1;
  }

  .card__content {
    @apply p-4 flex flex-col flex-grow;
  }

  .card__footer {
    @apply mt-auto flex flex-col gap-1.5 text-sm text-gray-500;
  }

  .card__title {
    @apply font-semibold text-white/90 text-lg leading-tight mb-1.5 line-clamp-2 transition-colors;
  }

  .card__subtitle {
    @apply p-1;
    @apply text-sm text-white mb-2 flex items-center gap-2 mt-auto truncate;
    @apply bg-gradient-to-r from-gray-800/40 via-gray-600/40 to-gray-500/40;
  }

  .meta-row {
    @apply p-1 text-white/70 rounded-sm pr-2;
    @apply inline-flex w-fit items-center gap-2 truncate;
    @apply bg-gradient-to-r from-gray-800/40 via-gray-600/40 to-gray-500/40;
  }

  .tag-updated {
    @apply bg-gray-700/50 px-1.5 py-0.5 rounded text-gray-400;
  }

  .badge {
    @apply absolute bg-black/60 backdrop-blur-md text-white text-xs font-medium px-2 py-1 rounded-lg border border-white/10 shadow-sm;
    z-index: 20;
  }

  .badge--bottom-right {
    @apply bottom-2 right-2;
  }

  .progress-bar {
    @apply absolute bottom-0 left-0 h-1.5 bg-red-600 z-20;
  }
</style>
