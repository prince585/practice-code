/**
 * Google Store Clone - Utils Module
 * General helper functions and utilities
 */

// Utility Functions
export const utils = {
  /**
   * Format currency amount
   * @param {number} amount - The amount to format
   * @param {string} currency - Currency code (default: USD)
   * @returns {string} Formatted currency string
   */
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  },

  /**
   * Format rating with stars
   * @param {number} rating - Rating value (0-5)
   * @param {number} maxRating - Maximum rating value (default: 5)
   * @returns {string} Star representation
   */
  formatRating(rating, maxRating = 5) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0);

    let stars = '';

    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars += '★';
    }

    // Half star
    if (hasHalfStar) {
      stars += '☆';
    }

    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
      stars += '☆';
    }

    return stars;
  },

  /**
   * Format file size
   * @param {number} bytes - Size in bytes
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  /**
   * Format date
   * @param {Date|string|number} date - Date to format
   * @param {object} options - Formatting options
   * @returns {string} Formatted date string
   */
  formatDate(date, options = {}) {
    const dateObj = new Date(date);
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };

    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(dateObj);
  },

  /**
   * Format relative time (e.g., "2 hours ago")
   * @param {Date|string|number} date - Date to format
   * @returns {string} Relative time string
   */
  formatRelativeTime(date) {
    const dateObj = new Date(date);
    const now = new Date();
    const diffMs = now - dateObj;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    if (diffYears > 0) return rtf.format(-diffYears, 'year');
    if (diffMonths > 0) return rtf.format(-diffMonths, 'month');
    if (diffWeeks > 0) return rtf.format(-diffWeeks, 'week');
    if (diffDays > 0) return rtf.format(-diffDays, 'day');
    if (diffHours > 0) return rtf.format(-diffHours, 'hour');
    if (diffMinutes > 0) return rtf.format(-diffMinutes, 'minute');
    return rtf.format(-diffSeconds, 'second');
  },

  /**
   * Debounce function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @param {boolean} immediate - Execute immediately on first call
   * @returns {Function} Debounced function
   */
  debounce(func, wait, immediate = false) {
    let timeout;

    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };

      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);

      if (callNow) func(...args);
    };
  },

  /**
   * Throttle function
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} Throttled function
   */
  throttle(func, limit) {
    let inThrottle;

    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Generate unique ID
   * @param {string} prefix - Optional prefix
   * @returns {string} Unique ID
   */
  generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Clamp number between min and max
   * @param {number} value - Value to clamp
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Clamped value
   */
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  /**
   * Check if value is empty
   * @param {*} value - Value to check
   * @returns {boolean} True if value is empty
   */
  isEmpty(value) {
    if (value == null) return true;
    if (typeof value === 'string' || Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  },

  /**
   * Deep clone object
   * @param {*} obj - Object to clone
   * @returns {*} Cloned object
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => utils.deepClone(item));
    if (typeof obj === 'object') {
      const cloned = {};
      Object.keys(obj).forEach(key => {
        cloned[key] = utils.deepClone(obj[key]);
      });
      return cloned;
    }
  },

  /**
   * Generate slug from string
   * @param {string} text - Text to convert
   * @returns {string} Slug string
   */
  slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  },

  /**
   * Truncate text
   * @param {string} text - Text to truncate
   * @param {number} length - Maximum length
   * @param {string} suffix - Suffix to add (default: "...")
   * @returns {string} Truncated text
   */
  truncateText(text, length, suffix = '...') {
    if (text.length <= length) return text;
    return text.substring(0, length - suffix.length) + suffix;
  },

  /**
   * Capitalize first letter of each word
   * @param {string} text - Text to capitalize
   * @returns {string} Capitalized text
   */
  capitalizeWords(text) {
    return text.replace(/\b\w/g, char => char.toUpperCase());
  },

  /**
   * Pluralize word based on count
   * @param {number} count - Count value
   * @param {string} word - Word to pluralize
   * @param {string} plural - Custom plural form (optional)
   * @returns {string} Pluralized word
   */
  pluralize(count, word, plural) {
    if (count === 1) return word;
    return plural || `${word}s`;
  },

  /**
   * Check if element is in viewport
   * @param {Element} element - Element to check
   * @param {number} threshold - Visibility threshold (0-1)
   * @returns {boolean} True if element is visible
   */
  isInViewport(element, threshold = 0) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;

    const vertInView = (rect.top <= windowHeight * (1 - threshold)) && ((rect.top + rect.height) >= windowHeight * threshold);
    const horInView = (rect.left <= windowWidth * (1 - threshold)) && ((rect.left + rect.width) >= windowWidth * threshold);

    return vertInView && horInView;
  },

  /**
   * Smooth scroll to element
   * @param {Element|string} target - Target element or selector
   * @param {object} options - Scroll options
   */
  scrollTo(target, options = {}) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (!element) return;

    const defaultOptions = {
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
      ...options
    };

    element.scrollIntoView(defaultOptions);
  },

  /**
   * Get URL parameters
   * @param {string} url - URL to parse (default: current URL)
   * @returns {object} URL parameters object
   */
  getUrlParams(url = window.location.href) {
    const urlObj = new URL(url);
    const params = {};

    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return params;
  },

  /**
   * Update URL parameters
   * @param {object} params - Parameters to update
   * @param {boolean} replace - Replace current history state
   */
  updateUrlParams(params, replace = false) {
    const url = new URL(window.location);

    Object.keys(params).forEach(key => {
      if (params[key] === null || params[key] === undefined || params[key] === '') {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, params[key]);
      }
    });

    if (replace) {
      window.history.replaceState({}, '', url);
    } else {
      window.history.pushState({}, '', url);
    }
  },

  /**
   * Copy text to clipboard
   * @param {string} text - Text to copy
   * @returns {Promise<boolean>} True if copy was successful
   */
  async copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand('copy');
        textArea.remove();
        return result;
      }
    } catch (error) {
      console.error('Failed to copy text to clipboard:', error);
      return false;
    }
  },

  /**
   * Download file from data
   * @param {string} data - Data to download
   * @param {string} filename - File name
   * @param {string} mimeType - MIME type
   */
  downloadFile(data, filename, mimeType = 'text/plain') {
    const blob = new Blob([data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Validate email address
   * @param {string} email - Email to validate
   * @returns {boolean} True if email is valid
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate phone number (US format)
   * @param {string} phone - Phone number to validate
   * @returns {boolean} True if phone is valid
   */
  isValidPhone(phone) {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    const digitsOnly = phone.replace(/\D/g, '');
    return phoneRegex.test(phone) && digitsOnly.length >= 10;
  },

  /**
   * Format phone number
   * @param {string} phone - Phone number to format
   * @returns {string} Formatted phone number
   */
  formatPhone(phone) {
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length === 10) {
      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    }
    return phone;
  },

  /**
   * Get device type based on screen width
   * @returns {string} Device type (mobile, tablet, desktop)
   */
  getDeviceType() {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  },

  /**
   * Check if device supports touch
   * @returns {boolean} True if device supports touch
   */
  isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

  /**
   * Get random item from array
   * @param {Array} array - Array to pick from
   * @returns {*} Random item
   */
  getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  },

  /**
   * Shuffle array
   * @param {Array} array - Array to shuffle
   * @returns {Array} Shuffled array
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  /**
   * Array chunking
   * @param {Array} array - Array to chunk
   * @param {number} size - Chunk size
   * @returns {Array} Array of chunks
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },

  /**
   * Remove duplicates from array
   * @param {Array} array - Array to deduplicate
   * @param {Function} keyFn - Optional function to get comparison key
   * @returns {Array} Deduplicated array
   */
  removeDuplicates(array, keyFn) {
    if (!keyFn) {
      return [...new Set(array)];
    }

    const seen = new Set();
    return array.filter(item => {
      const key = keyFn(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
};

// Export default for convenience
export default utils;