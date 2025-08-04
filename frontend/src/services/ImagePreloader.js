/**
 * ImagePreloader.js
 * 
 * Service for preloading images during the waiting room phase
 * to ensure smooth gameplay experience.
 */

class ImagePreloader {
  constructor() {
    this.preloadedImages = new Map();
    this.loadingPromises = new Map();
    this.preloadStats = {
      total: 0,
      loaded: 0,
      failed: 0,
      progress: 0
    };
  }

  /**
   * Preload images from questions data
   * @param {Array} questions - Array of questions with image URLs
   * @param {Function} onProgress - Progress callback (loaded, total, percentage)
   * @returns {Promise} Promise that resolves when all images are processed
   */
  async preloadQuestionImages(questions, onProgress) {
    const imageUrls = this.extractImageUrls(questions);
    
    this.preloadStats = {
      total: imageUrls.length,
      loaded: 0,
      failed: 0,
      progress: 0
    };

    console.log(`🖼️ Starting to preload ${imageUrls.length} images...`);

    if (imageUrls.length === 0) {
      onProgress && onProgress(0, 0, 100);
      return { success: true, stats: this.preloadStats };
    }

    // Create loading promises for all images
    const loadPromises = imageUrls.map((url, index) => 
      this.preloadSingleImage(url, index, onProgress)
    );

    // Wait for all images to be processed (loaded or failed)
    await Promise.allSettled(loadPromises);

    const finalStats = {
      ...this.preloadStats,
      progress: 100
    };

    console.log(`✅ Image preloading complete:`, finalStats);
    onProgress && onProgress(finalStats.loaded, finalStats.total, 100);

    return {
      success: true,
      stats: finalStats,
      successRate: finalStats.total > 0 ? (finalStats.loaded / finalStats.total) * 100 : 100
    };
  }

  /**
   * Extract all image URLs from questions
   * @param {Array} questions - Questions array
   * @returns {Array} Array of unique image URLs
   */
  extractImageUrls(questions) {
    const urls = new Set();

    questions.forEach(question => {
      // Question image
      if (question.image_url) {
        urls.add(question.image_url);
      }

      // Answer images
      if (question._dbData?.answers) {
        question._dbData.answers.forEach(answer => {
          if (answer.image_url) {
            urls.add(answer.image_url);
          }
        });
      }

      // Explanation image
      if (question._dbData?.explanation_image_url) {
        urls.add(question._dbData.explanation_image_url);
      }
      if (question.explanation_image_url) {
        urls.add(question.explanation_image_url);
      }
    });

    return Array.from(urls).filter(url => url && url.trim() !== '');
  }

  /**
   * Preload a single image
   * @param {String} url - Image URL
   * @param {Number} index - Image index for tracking
   * @param {Function} onProgress - Progress callback
   * @returns {Promise} Promise that resolves when image loads or fails
   */
  async preloadSingleImage(url, index, onProgress) {
    // Check if already loaded or loading
    if (this.preloadedImages.has(url)) {
      this.updateProgress(onProgress);
      return this.preloadedImages.get(url);
    }

    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url);
    }

    // Create loading promise
    const loadPromise = new Promise((resolve, reject) => {
      const img = new Image();
      
      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
        img.onabort = null;
      };

      img.onload = () => {
        cleanup();
        this.preloadedImages.set(url, { success: true, img, url });
        this.preloadStats.loaded++;
        this.updateProgress(onProgress);
        resolve({ success: true, img, url });
      };

      img.onerror = (error) => {
        cleanup();
        console.warn(`❌ Failed to preload image: ${url}`, error);
        this.preloadedImages.set(url, { success: false, error, url });
        this.preloadStats.failed++;
        this.updateProgress(onProgress);
        resolve({ success: false, error, url }); // Resolve, don't reject
      };

      img.onabort = () => {
        cleanup();
        this.preloadedImages.set(url, { success: false, error: 'aborted', url });
        this.preloadStats.failed++;
        this.updateProgress(onProgress);
        resolve({ success: false, error: 'aborted', url });
      };

      // Start loading
      img.src = url;

      // Set timeout for very slow images
      setTimeout(() => {
        if (!this.preloadedImages.has(url)) {
          cleanup();
          console.warn(`⏰ Image load timeout: ${url}`);
          this.preloadedImages.set(url, { success: false, error: 'timeout', url });
          this.preloadStats.failed++;
          this.updateProgress(onProgress);
          resolve({ success: false, error: 'timeout', url });
        }
      }, 15000); // 15 second timeout
    });

    this.loadingPromises.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Update progress and call callback
   * @param {Function} onProgress - Progress callback
   */
  updateProgress(onProgress) {
    const processed = this.preloadStats.loaded + this.preloadStats.failed;
    const progress = this.preloadStats.total > 0 ? 
      Math.round((processed / this.preloadStats.total) * 100) : 100;
    
    this.preloadStats.progress = progress;
    onProgress && onProgress(processed, this.preloadStats.total, progress);
  }

  /**
   * Check if an image is preloaded
   * @param {String} url - Image URL
   * @returns {Boolean} True if image is successfully preloaded
   */
  isImagePreloaded(url) {
    const result = this.preloadedImages.get(url);
    return result && result.success;
  }

  /**
   * Get preloaded image element
   * @param {String} url - Image URL
   * @returns {HTMLImageElement|null} Preloaded image element or null
   */
  getPreloadedImage(url) {
    const result = this.preloadedImages.get(url);
    return result && result.success ? result.img : null;
  }

  /**
   * Clear all preloaded images from memory
   */
  clearCache() {
    this.preloadedImages.clear();
    this.loadingPromises.clear();
    this.preloadStats = {
      total: 0,
      loaded: 0,
      failed: 0,
      progress: 0
    };
    console.log('🗑️ Image preloader cache cleared');
  }

  /**
   * Get current preload statistics
   * @returns {Object} Current preload stats
   */
  getStats() {
    return { ...this.preloadStats };
  }

  /**
   * Preload critical images first (first question and its options)
   * @param {Array} questions - Questions array
   * @param {Function} onProgress - Progress callback
   * @returns {Promise} Promise that resolves when critical images are loaded
   */
  async preloadCriticalImages(questions, onProgress) {
    if (!questions || questions.length === 0) {
      return { success: true, stats: this.preloadStats };
    }

    const firstQuestion = questions[0];
    const criticalUrls = [];

    // First question image
    if (firstQuestion.image_url) {
      criticalUrls.push(firstQuestion.image_url);
    }

    // First question answer images
    if (firstQuestion._dbData?.answers) {
      firstQuestion._dbData.answers.forEach(answer => {
        if (answer.image_url) {
          criticalUrls.push(answer.image_url);
        }
      });
    }

    console.log(`🚀 Preloading ${criticalUrls.length} critical images...`);

    // Update stats for critical images only
    this.preloadStats.total = criticalUrls.length;

    const loadPromises = criticalUrls.map((url, index) => 
      this.preloadSingleImage(url, index, onProgress)
    );

    await Promise.allSettled(loadPromises);

    return {
      success: true,
      stats: this.preloadStats,
      criticalImagesLoaded: this.preloadStats.loaded
    };
  }
}

// Create singleton instance
const imagePreloader = new ImagePreloader();

export default imagePreloader;
