const {performance} = require('perf_hooks');
const config = require('../config'); // Импортируем конфиг

class PerformanceTimer {
  constructor(label) {
    this.label = label;
    this.start = performance.now();
  }

  end() {
    if (config.DEBUG_PERF) {
      const duration = (performance.now() - this.start).toFixed(2);
      console.log(`[PERF] ${ this.label }: ${ duration }ms`);
      return duration;
    }
  }
}

module.exports = PerformanceTimer;
