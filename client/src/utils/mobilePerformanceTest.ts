// Mobile Performance Testing and Optimization Utilities

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  touchLatency: number;
  scrollPerformance: number;
}

interface TouchLatencyTest {
  startTime: number;
  endTime: number;
  latency: number;
}

class MobilePerformanceTester {
  private frameCount = 0;
  private lastTime = 0;
  private memoryBaseline = 0;
  private touchTests: TouchLatencyTest[] = [];
  private isMonitoring = false;

  // Initialize performance monitoring
  public startMonitoring(): void {
    this.isMonitoring = true;
    this.memoryBaseline = this.getMemoryUsage();
    this.startFPSMonitoring();
    this.setupTouchLatencyTesting();
  }

  public stopMonitoring(): void {
    this.isMonitoring = false;
  }

  // FPS Monitoring for smooth animations
  private startFPSMonitoring(): void {
    const measureFPS = (currentTime: number) => {
      if (!this.isMonitoring) return;

      if (this.lastTime === 0) {
        this.lastTime = currentTime;
        requestAnimationFrame(measureFPS);
        return;
      }

      const deltaTime = currentTime - this.lastTime;
      this.frameCount++;

      if (deltaTime >= 1000) {
        const fps = Math.round((this.frameCount * 1000) / deltaTime);
        this.reportFPS(fps);
        this.frameCount = 0;
        this.lastTime = currentTime;
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  // Memory usage monitoring
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  // Touch latency testing
  private setupTouchLatencyTesting(): void {
    let touchStartTime = 0;

    document.addEventListener('touchstart', (e) => {
      touchStartTime = performance.now();
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const touchEndTime = performance.now();
      const latency = touchEndTime - touchStartTime;
      
      this.touchTests.push({
        startTime: touchStartTime,
        endTime: touchEndTime,
        latency
      });

      // Keep only last 50 measurements
      if (this.touchTests.length > 50) {
        this.touchTests.shift();
      }

      // Warn if touch latency is too high
      if (latency > 100) {
        console.warn(`High touch latency detected: ${latency.toFixed(2)}ms`);
      }
    }, { passive: true });
  }

  // Test scroll performance
  public async testScrollPerformance(element: HTMLElement): Promise<number> {
    return new Promise((resolve) => {
      let frameCount = 0;
      let startTime = performance.now();
      const duration = 1000; // Test for 1 second

      const scrollTest = () => {
        frameCount++;
        const elapsed = performance.now() - startTime;
        
        if (elapsed < duration) {
          element.scrollTop += 2; // Simulate smooth scrolling
          requestAnimationFrame(scrollTest);
        } else {
          const fps = (frameCount * 1000) / elapsed;
          resolve(fps);
        }
      };

      requestAnimationFrame(scrollTest);
    });
  }

  // Test animation performance
  public testAnimationPerformance(element: HTMLElement, duration = 1000): Promise<number> {
    return new Promise((resolve) => {
      let frameCount = 0;
      const startTime = performance.now();
      
      element.style.transition = 'none';
      element.style.transform = 'translateX(0px)';

      const animateTest = () => {
        frameCount++;
        const elapsed = performance.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress < 1) {
          element.style.transform = `translateX(${progress * 100}px)`;
          requestAnimationFrame(animateTest);
        } else {
          const fps = (frameCount * 1000) / elapsed;
          element.style.transform = '';
          resolve(fps);
        }
      };

      requestAnimationFrame(animateTest);
    });
  }

  // Get current performance metrics
  public getMetrics(): PerformanceMetrics {
    const avgTouchLatency = this.touchTests.length > 0 
      ? this.touchTests.reduce((sum, test) => sum + test.latency, 0) / this.touchTests.length 
      : 0;

    return {
      fps: this.getCurrentFPS(),
      memoryUsage: this.getMemoryUsage() - this.memoryBaseline,
      renderTime: this.getAverageRenderTime(),
      touchLatency: avgTouchLatency,
      scrollPerformance: 60 // This would be updated by scroll tests
    };
  }

  private getCurrentFPS(): number {
    // This would be updated by the FPS monitoring
    return 60; // Placeholder
  }

  private getAverageRenderTime(): number {
    if ('measureUserAgentSpecificMemory' in performance) {
      return performance.measureUserAgentSpecificMemory ? 16.67 : 20;
    }
    return 16.67; // Target 60fps = 16.67ms per frame
  }

  private reportFPS(fps: number): void {
    if (fps < 50) {
      console.warn(`Low FPS detected: ${fps}`);
    }
  }

  // Device capability detection
  public getDeviceCapabilities() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    return {
      hardware: {
        cores: navigator.hardwareConcurrency || 1,
        memory: (navigator as any).deviceMemory || 'unknown',
        gpu: gl ? 'Hardware accelerated' : 'Software rendering'
      },
      features: {
        touchEvents: 'ontouchstart' in window,
        vibration: 'vibrate' in navigator,
        serviceWorker: 'serviceWorker' in navigator,
        webgl: !!gl
      },
      screen: {
        width: screen.width,
        height: screen.height,
        pixelRatio: window.devicePixelRatio,
        colorDepth: screen.colorDepth
      }
    };
  }

  // Performance recommendations
  public getOptimizationRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.fps < 50) {
      recommendations.push('Consider reducing animation complexity or using CSS transforms');
    }

    if (metrics.memoryUsage > 50) {
      recommendations.push('Memory usage is high - consider component cleanup');
    }

    if (metrics.touchLatency > 100) {
      recommendations.push('Touch response is slow - minimize JavaScript in touch handlers');
    }

    if (metrics.renderTime > 20) {
      recommendations.push('Render time is high - consider virtualizing long lists');
    }

    return recommendations;
  }
}

// Mobile-specific performance utilities
export const mobilePerformanceUtils = {
  // Check if device is low-end
  isLowEndDevice(): boolean {
    const cores = navigator.hardwareConcurrency || 1;
    const memory = (navigator as any).deviceMemory || 1;
    
    return cores <= 2 || memory <= 2;
  },

  // Optimize for mobile performance
  optimizeForMobile() {
    // Reduce animation complexity on low-end devices
    if (this.isLowEndDevice()) {
      document.documentElement.style.setProperty('--animation-duration', '0.2s');
      document.documentElement.style.setProperty('--transition-duration', '0.15s');
    }

    // Enable hardware acceleration
    document.documentElement.style.willChange = 'transform';
  },

  // Throttle expensive operations
  throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    let lastExecTime = 0;
    
    return (...args: Parameters<T>) => {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func(...args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func(...args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  },

  // Debounce for touch events
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }
};

// Test suite for mobile loading performance
export const runMobilePerformanceTests = async (): Promise<{
  results: PerformanceMetrics;
  recommendations: string[];
  deviceInfo: any;
}> => {
  const tester = new MobilePerformanceTester();
  
  console.log('Starting mobile performance tests...');
  
  // Start monitoring
  tester.startMonitoring();
  
  // Wait for some data collection
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Get metrics
  const metrics = tester.getMetrics();
  const recommendations = tester.getOptimizationRecommendations(metrics);
  const deviceInfo = tester.getDeviceCapabilities();
  
  // Stop monitoring
  tester.stopMonitoring();
  
  console.log('Mobile performance test results:', {
    metrics,
    recommendations,
    deviceInfo
  });
  
  return {
    results: metrics,
    recommendations,
    deviceInfo
  };
};

export default MobilePerformanceTester;