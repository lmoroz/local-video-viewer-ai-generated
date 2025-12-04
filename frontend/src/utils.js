const formatDuration = seconds => {
  if (!seconds) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  if (h > 0) {
    return `${h}ч ${m.toString().padStart(2, '0')}м ${s.toString().padStart(2, '0')}с`
  }
  if (m > 0) {
    return `${m.toString().padStart(2, '0')}м ${s.toString().padStart(2, '0')}с`
  }
  return `${s.toString().padStart(2, '0')}с`
}

export { formatDuration }
