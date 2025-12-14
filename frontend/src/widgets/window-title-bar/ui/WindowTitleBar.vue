<script setup>
  const minimize = () => window.electronAPI.minimize()
  const toggleMaximize = () => window.electronAPI.toggleMaximize()
  const closeApp = () => window.electronAPI.close()
</script>

<template>
  <div class="window-title-bar">
    <div class="drag-region">
      <div class="app-icon">
        <img
          src="/app_icon.png"
          alt="Icon" />
      </div>
      <div class="window-title">Local Video Viewer</div>
    </div>

    <div class="window-controls">
      <button
        class="control-btn minimize-btn"
        @click="minimize"
        title="Minimize">
        <i class="bi bi-dash-lg" />
      </button>
      <button
        class="control-btn maximize-btn"
        @click="toggleMaximize"
        title="Maximize">
        <i class="bi bi-square" />
      </button>
      <button
        class="control-btn close-btn"
        @click="closeApp"
        title="Close">
        <i class="bi bi-x-lg" />
      </button>
    </div>
  </div>
</template>

<style scoped>
  .window-title-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 32px;
    background-color: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(10px);
    -webkit-app-region: drag; /* Electron drag support */
    user-select: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 9999;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .drag-region {
    display: flex;
    align-items: center;
    flex-grow: 1;
    height: 100%;
    padding-left: 10px;
  }

  .app-icon img {
    width: 16px;
    height: 16px;
    margin-right: 10px;
  }

  .window-title {
    font-size: 12px;
    color: #ccc;
    font-family: 'Segoe UI', sans-serif;
  }

  .window-controls {
    display: flex;
    height: 100%;
    -webkit-app-region: no-drag; /* Buttons must be clickable */
  }

  .control-btn {
    width: 46px;
    height: 100%;
    border: none;
    background: transparent;
    color: #ccc;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.2s;
    outline: none;
  }

  .control-btn i {
    font-size: 14px;
  }

  .control-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .close-btn:hover {
    background-color: #e81123;
    color: white;
  }
</style>
