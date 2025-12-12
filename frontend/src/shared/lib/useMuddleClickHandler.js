export default e => {
  if (e.button !== 1) return
  if (!window.electronAPI) return

  console.log('middleClickHandler e.target = ', e.target)
  console.log("middleClickHandler e.target.closest('a') = ", e.target.closest('a'))
  const link = e.target.closest('a')
  if (!link) return
  console.log('middleClickHandler link = ', link)

  const href = link.getAttribute('href')
  console.log('href = ', href)
  if (href.startsWith('#')) {
    e.preventDefault()
    window.electronAPI.openNewWindow(href.replace('#', ''))
  }
}
