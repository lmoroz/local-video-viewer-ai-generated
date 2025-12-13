import {performance} from 'perf_hooks';
import {config} from '../config';

export class PerformanceTimer {
  private label: string;
  private start: number;

  constructor(label: string) {
    this.label = label;
    this.start = performance.now();
  }

  end(): string | void {
    if (config.DEBUG_PERF) {
      const duration = (performance.now() - this.start).toFixed(2);
      console.log(`[PERF] ${this.label}: ${duration}ms`);
      return duration;
    }
  }
}
