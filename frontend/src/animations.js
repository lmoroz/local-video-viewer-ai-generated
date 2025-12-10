import { animate } from '@okikio/animate'
// import anime from 'animejs/lib/anime.es.js';

//transitions using animate
//animates end event is `onfinish`
function fadeIn(el, done) {
  animate({
    targets: el,
    opacity: [0, 1],
    easing: 'easeInOutSine',
    onfinish: done
  })
}

function fadeOut(el, done) {
  animate({
    targets: el,
    opacity: [1, 0],
    easing: 'easeInOutSine',
    onfinish: done
  })
}

//end

//transitions using animejs
//animejs end event is `complete`
function useFadeIn(el, done) {
  console.log(el)
  anime({
    targets: el,
    opacity: [0, 1],
    easing: 'easeInOutSine',
    complete: done
  })
}

function useFadeOut(el, done) {
  anime({
    targets: el,
    opacity: [1, 0],
    easing: 'easeInOutSine',
    complete: done
  })
}

export {
  fadeIn,
  fadeOut
  // useFadeOut, useFadeIn
}
