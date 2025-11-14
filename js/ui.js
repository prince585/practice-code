/**
 * Google Store Clone - UI Module
 * UI interactions, DOM manipulation, modal management, form handling, and theme switching
 */

import { utils } from './utils.js';
import productAPI from './api.js';
import cartManager from './cart.js';

// UI Configuration
const UI_CONFIG = {
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 300,
  LAZY_LOADING_THRESHOLD: 100,
  MODAL_BACKDROP_CLASS: 'modal-backdrop',
  TOAST_CONTAINER_ID: 'toast-container',
};

// UI Manager Class
class UIManager {
  constructor() {
    this.isInitialized = false;
    this.activeModals = new Set();
    this.toastContainer = null;
    this.observers = new Map();
    this.eventListeners = new Map();
  }

  /**
   * Initialize UI manager
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize components
      this.initializeTheme();
      this.initializeModals();
      this.initializeSearch();
      this.initializeFilters();
      this.initializeCart();
      this.initializeMobileMenu();
      this.initializeLazyLoading();
      this.initializeTooltips();
      this.initializeAccessibility();

      this.isInitialized = true;
      console.log('UI Manager initialized successfully');

    } catch (error) {
      console.error('Failed to initialize UI manager:', error);
    }
  }

  /**
   * Initialize theme functionality
   */
  initializeTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    this.setTheme(savedTheme);

    // Add click handler
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      this.setTheme(newTheme);
    });

    // Listen for system theme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addListener((e) => {
        const savedTheme = localStorage.getItem('theme');
        if (!savedTheme) {
          this.setTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  /**
   * Set theme
   * @param {string} theme - Theme name ('light' or 'dark')
   */
  setTheme(theme) {
    if (!['light', 'dark'].includes(theme)) return;

    // Add transition class for smooth theme switching
    document.documentElement.classList.add('theme-switching');

    // Update theme
    document.documentElement.setAttribute('data-theme', theme);

    // Update theme toggle button
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.setAttribute('aria-pressed', theme === 'dark');
    }

    // Save to localStorage
    localStorage.setItem('theme', theme);

    // Remove transition class after animation
    setTimeout(() => {
      document.documentElement.classList.remove('theme-switching');
    }, UI_CONFIG.ANIMATION_DURATION);

    // Show theme indicator
    this.showThemeIndicator(theme);
  }

  /**
   * Show theme change indicator
   * @param {string} theme - Theme name
   */
  showThemeIndicator(theme) {
    const indicator = document.createElement('div');
    indicator.className = 'theme-indicator';
    indicator.textContent = `${theme.charAt(0).toUpperCase() + theme.slice(1)} theme activated`;
    document.body.appendChild(indicator);

    // Trigger animation
    setTimeout(() => indicator.classList.add('show'), 10);

    // Remove indicator
    setTimeout(() => {
      indicator.classList.remove('show');
      setTimeout(() => indicator.remove(), UI_CONFIG.ANIMATION_DURATION);
    }, 2000);
  }

  /**
   * Initialize modal functionality
   */
  initializeModals() {
    // Product modal
    this.initializeModal('product-modal', 'product-modal-overlay', 'product-modal-close');

    // Cart sidebar
    this.initializeModal('cart-sidebar', 'cart-overlay', 'cart-close');

    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModals.size > 0) {
        this.closeTopModal();
      }
    });

    // Click outside to close modals
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains(UI_CONFIG.MODAL_BACKDROP_CLASS)) {
        this.closeModal(e.target.closest('.modal, .cart-sidebar'));
      }
    });
  }

  /**
   * Initialize specific modal
   * @param {string} modalId - Modal ID
   * @param {string} overlayId - Overlay element ID
   * @param {string} closeId - Close button ID
   */
  initializeModal(modalId, overlayId, closeId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const overlay = document.getElementById(overlayId);
    const closeBtn = document.getElementById(closeId);

    // Add backdrop class
    if (overlay) {
      overlay.classList.add(UI_CONFIG.MODAL_BACKDROP_CLASS);
    }

    // Close button handler
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeModal(modal);
      });
    }

    // Add modal-specific event listeners
    if (modalId === 'product-modal') {
      this.initializeProductModal(modal);
    }
  }

  /**
   * Initialize product modal specific functionality
   * @param {HTMLElement} modal - Product modal element
   */
  initializeProductModal(modal) {
    // Add keyboard navigation for image gallery
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // Handle image gallery navigation
        this.handleImageGalleryNavigation(e.key);
      }
    });
  }

  /**
   * Open modal
   * @param {HTMLElement|string} modal - Modal element or ID
   * @param {object} options - Modal options
   */
  openModal(modal, options = {}) {
    const modalElement = typeof modal === 'string' ? document.getElementById(modal) : modal;
    if (!modalElement) return;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Add to active modals
    this.activeModals.add(modalElement);

    // Add active class for styling
    modalElement.classList.add('active');
    modalElement.setAttribute('aria-hidden', 'false');

    // Focus management
    this.trapFocus(modalElement);

    // Trigger open event
    this.emitModalEvent('open', modalElement, options);
  }

  /**
   * Close modal
   * @param {HTMLElement|string} modal - Modal element or ID
   */
  closeModal(modal) {
    const modalElement = typeof modal === 'string' ? document.getElementById(modal) : modal;
    if (!modalElement || !this.activeModals.has(modalElement)) return;

    // Remove from active modals
    this.activeModals.delete(modalElement);

    // Remove active class
    modalElement.classList.remove('active');
    modalElement.setAttribute('aria-hidden', 'true');

    // Restore body scroll if no modals are active
    if (this.activeModals.size === 0) {
      document.body.style.overflow = '';
    }

    // Restore focus
    this.removeFocusTrap(modalElement);

    // Trigger close event
    this.emitModalEvent('close', modalElement);
  }

  /**
   * Close top modal (for multiple modals)
   */
  closeTopModal() {
    if (this.activeModals.size > 0) {
      const topModal = Array.from(this.activeModals).pop();
      this.closeModal(topModal);
    }
  }

  /**
   * Close all modals
   */
  closeAllModals() {
    this.activeModals.forEach(modal => this.closeModal(modal));
  }

  /**
   * Trap focus within modal
   * @param {HTMLElement} modal - Modal element
   */
  trapFocus(modal) {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement.focus();

    // Handle tab key navigation
    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTabKey);
    modal._focusTrapHandler = handleTabKey;
  }

  /**
   * Remove focus trap from modal
   * @param {HTMLElement} modal - Modal element
   */
  removeFocusTrap(modal) {
    if (modal._focusTrapHandler) {
      modal.removeEventListener('keydown', modal._focusTrapHandler);
      delete modal._focusTrapHandler;
    }
  }

  /**
   * Emit modal event
   * @param {string} eventType - Event type
   * @param {HTMLElement} modal - Modal element
   * @param {*} data - Event data
   */
  emitModalEvent(eventType, modal, data = null) {
    const event = new CustomEvent(`modal:${eventType}`, {
      detail: { modal, data },
      bubbles: true,
    });
    modal.dispatchEvent(event);
  }

  /**
   * Initialize search functionality
   */
  initializeSearch() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.querySelector('.search__button');

    if (!searchInput) return;

    // Debounced search handler
    const debouncedSearch = utils.debounce((query) => {
      this.handleSearch(query);
    }, UI_CONFIG.DEBOUNCE_DELAY);

    // Input handler
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      debouncedSearch(query);
    });

    // Submit handler
    searchInput.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = searchInput.value.trim();
      this.handleSearch(query);
    });

    // Button handler
    if (searchButton) {
      searchButton.addEventListener('click', () => {
        const query = searchInput.value.trim();
        this.handleSearch(query);
      });
    }
  }

  /**
   * Handle search
   * @param {string} query - Search query
   */
  async handleSearch(query) {
    try {
      // Update URL with search query
      if (query) {
        utils.updateUrlParams({ q: query }, true);
      } else {
        utils.updateUrlParams({ q: null }, true);
      }

      // Trigger search event
      const event = new CustomEvent('search', {
        detail: { query },
        bubbles: true,
      });
      document.dispatchEvent(event);

    } catch (error) {
      console.error('Search failed:', error);
      this.showToast('Search failed. Please try again.', 'error');
    }
  }

  /**
   * Initialize filter functionality
   */
  initializeFilters() {
    // Category filters
    const categoryFilters = document.getElementById('category-filters');
    if (categoryFilters) {
      this.populateCategoryFilters();
    }

    // Price range slider
    const priceRange = document.getElementById('price-range');
    if (priceRange) {
      this.initializePriceRange(priceRange);
    }

    // Rating filters
    const ratingFilters = document.getElementById('rating-filters');
    if (ratingFilters) {
      this.initializeRatingFilters(ratingFilters);
    }

    // In stock filter
    const inStockFilter = document.getElementById('in-stock-only');
    if (inStockFilter) {
      inStockFilter.addEventListener('change', () => {
        this.applyFilters();
      });
    }

    // Sort dropdown
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.handleSort(e.target.value);
      });
    }

    // Clear filters button
    const clearFilters = document.getElementById('clear-filters');
    if (clearFilters) {
      clearFilters.addEventListener('click', () => {
        this.clearAllFilters();
      });
    }

    // Load filters from URL
    this.loadFiltersFromUrl();
  }

  /**
   * Populate category filters
   */
  async populateCategoryFilters() {
    try {
      const categories = productAPI.getCategories();
      const container = document.getElementById('category-filters');

      if (!container) return;

      container.innerHTML = categories.map(category => `
        <label class="filter-option">
          <input type="checkbox" name="category" value="${category.id}">
          <span>${category.name}</span>
          <span class="filter-option__count" data-category="${category.id}">0</span>
        </label>
      `).join('');

      // Add event listeners
      container.addEventListener('change', (e) => {
        if (e.target.name === 'category') {
          this.applyFilters();
        }
      });

    } catch (error) {
      console.error('Failed to populate category filters:', error);
    }
  }

  /**
   * Initialize price range slider
   * @param {HTMLElement} slider - Price range slider
   */
  initializePriceRange(slider) {
    const maxPriceDisplay = document.getElementById('price-max');
    const priceRangeValues = slider.closest('.filter-group__options').querySelector('.price-range__values');

    if (maxPriceDisplay) {
      const updateDisplay = () => {
        maxPriceDisplay.textContent = utils.formatCurrency(slider.value);
      };

      slider.addEventListener('input', updateDisplay);
      updateDisplay();

      // Apply filter on change
      slider.addEventListener('change', () => {
        this.applyFilters();
      });
    }

    // Set max value from products
    this.updatePriceRangeLimits();
  }

  /**
   * Update price range limits
   */
  async updatePriceRangeLimits() {
    try {
      const products = await productAPI.loadProducts();
      const priceRange = productAPI.getPriceRange(products);

      const priceSlider = document.getElementById('price-range');
      if (priceSlider && priceRange.max > 0) {
        priceSlider.max = priceRange.max;
        priceSlider.value = Math.min(priceSlider.value, priceRange.max);

        // Update display
        const maxPriceDisplay = document.getElementById('price-max');
        if (maxPriceDisplay) {
          maxPriceDisplay.textContent = utils.formatCurrency(priceRange.max);
        }
      }
    } catch (error) {
      console.error('Failed to update price range limits:', error);
    }
  }

  /**
   * Initialize rating filters
   * @param {HTMLElement} container - Rating filters container
   */
  initializeRatingFilters(container) {
    container.addEventListener('change', (e) => {
      if (e.target.name === 'rating') {
        this.applyFilters();
      }
    });
  }

  /**
   * Apply filters
   */
  async applyFilters() {
    try {
      const filters = this.getActiveFilters();

      // Update URL with filters
      this.updateUrlWithFilters(filters);

      // Trigger filter event
      const event = new CustomEvent('filters:apply', {
        detail: { filters },
        bubbles: true,
      });
      document.dispatchEvent(event);

    } catch (error) {
      console.error('Failed to apply filters:', error);
    }
  }

  /**
   * Get active filters
   * @returns {object} Active filters object
   */
  getActiveFilters() {
    const filters = {};

    // Category filters
    const categoryCheckboxes = document.querySelectorAll('input[name="category"]:checked');
    if (categoryCheckboxes.length > 0) {
      filters.categories = Array.from(categoryCheckboxes).map(cb => cb.value);
    }

    // Price range
    const priceSlider = document.getElementById('price-range');
    if (priceSlider && priceSlider.value < priceSlider.max) {
      filters.priceMax = parseFloat(priceSlider.value);
    }

    // Rating filters
    const ratingCheckboxes = document.querySelectorAll('input[name="rating"]:checked');
    if (ratingCheckboxes.length > 0) {
      const ratings = Array.from(ratingCheckboxes).map(cb => parseInt(cb.value));
      filters.rating = Math.max(...ratings);
    }

    // In stock filter
    const inStockFilter = document.getElementById('in-stock-only');
    if (inStockFilter && inStockFilter.checked) {
      filters.inStock = true;
    }

    return filters;
  }

  /**
   * Update URL with filters
   * @param {object} filters - Filters object
   */
  updateUrlWithFilters(filters) {
    const urlParams = {};

    // Map filters to URL parameters
    if (filters.categories && filters.categories.length > 0) {
      urlParams.category = filters.categories.join(',');
    }
    if (filters.priceMax !== undefined) {
      urlParams.maxPrice = filters.priceMax;
    }
    if (filters.rating !== undefined) {
      urlParams.minRating = filters.rating;
    }
    if (filters.inStock) {
      urlParams.inStock = 'true';
    }

    utils.updateUrlParams(urlParams, true);
  }

  /**
   * Load filters from URL
   */
  loadFiltersFromUrl() {
    const urlParams = utils.getUrlParams();

    // Category filters
    if (urlParams.category) {
      const categories = urlParams.category.split(',');
      categories.forEach(categoryId => {
        const checkbox = document.querySelector(`input[name="category"][value="${categoryId}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }

    // Price range
    if (urlParams.maxPrice) {
      const priceSlider = document.getElementById('price-range');
      if (priceSlider) {
        priceSlider.value = Math.min(parseFloat(urlParams.maxPrice), priceSlider.max);
        const maxPriceDisplay = document.getElementById('price-max');
        if (maxPriceDisplay) {
          maxPriceDisplay.textContent = utils.formatCurrency(priceSlider.value);
        }
      }
    }

    // Rating filter
    if (urlParams.minRating) {
      const minRating = parseInt(urlParams.minRating);
      const checkboxes = document.querySelectorAll('input[name="rating"]');
      checkboxes.forEach(checkbox => {
        checkbox.checked = parseInt(checkbox.value) === minRating;
      });
    }

    // In stock filter
    if (urlParams.inStock === 'true') {
      const inStockFilter = document.getElementById('in-stock-only');
      if (inStockFilter) inStockFilter.checked = true;
    }
  }

  /**
   * Handle sort
   * @param {string} sortValue - Sort value
   */
  handleSort(sortValue) {
    // Map sort values to API parameters
    const sortMap = {
      'popularity': { sortBy: 'popularity', order: 'desc' },
      'price-low': { sortBy: 'price', order: 'asc' },
      'price-high': { sortBy: 'price', order: 'desc' },
      'rating': { sortBy: 'rating', order: 'desc' },
      'name-asc': { sortBy: 'name', order: 'asc' },
      'name-desc': { sortBy: 'name', order: 'desc' },
    };

    const sortParams = sortMap[sortValue] || sortMap['popularity'];

    // Update URL
    utils.updateUrlParams({
      sort: sortParams.sortBy,
      order: sortParams.order,
    }, true);

    // Trigger sort event
    const event = new CustomEvent('sort', {
      detail: { sortValue, ...sortParams },
      bubbles: true,
    });
    document.dispatchEvent(event);
  }

  /**
   * Clear all filters
   */
  clearAllFilters() {
    // Clear all checkboxes
    const checkboxes = document.querySelectorAll('.filters input[type="checkbox"]');
    checkboxes.forEach(checkbox => checkbox.checked = false);

    // Reset price slider
    const priceSlider = document.getElementById('price-range');
    if (priceSlider) {
      priceSlider.value = priceSlider.max;
      const maxPriceDisplay = document.getElementById('price-max');
      if (maxPriceDisplay) {
        maxPriceDisplay.textContent = utils.formatCurrency(priceSlider.max);
      }
    }

    // Reset sort
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.value = 'popularity';
    }

    // Clear URL parameters
    utils.updateUrlParams({
      category: null,
      maxPrice: null,
      minRating: null,
      inStock: null,
      sort: null,
      order: null,
    }, true);

    // Apply filters (which will be empty)
    this.applyFilters();
  }

  /**
   * Initialize cart functionality
   */
  initializeCart() {
    // Cart toggle button
    const cartToggle = document.getElementById('cart-toggle');
    if (cartToggle) {
      cartToggle.addEventListener('click', () => {
        this.openModal('cart-sidebar');
      });
    }

    // Checkout button
    const checkoutButton = document.getElementById('cart-checkout');
    if (checkoutButton) {
      checkoutButton.addEventListener('click', () => {
        this.handleCheckout();
      });
    }
  }

  /**
   * Handle checkout process
   */
  async handleCheckout() {
    try {
      const cart = cartManager.getCart();
      if (cart.isEmpty()) {
        this.showToast('Your cart is empty', 'warning');
        return;
      }

      // Validate cart
      const validation = await cart.validateCart();
      if (!validation.isValid) {
        this.showToast('Please review your cart before checkout', 'warning');
        return;
      }

      // Proceed to checkout (this would normally navigate to checkout page)
      this.showToast('Proceeding to checkout...', 'success');

      // For demo purposes, show checkout form in modal
      this.showCheckoutModal();

    } catch (error) {
      console.error('Checkout failed:', error);
      this.showToast('Checkout failed. Please try again.', 'error');
    }
  }

  /**
   * Show checkout modal
   */
  showCheckoutModal() {
    // This would typically be a separate page or modal
    // For demo purposes, show a simple form
    console.log('Checkout flow would start here');
  }

  /**
   * Initialize mobile menu
   */
  initializeMobileMenu() {
    const menuToggle = document.getElementById('mobile-menu-toggle');
    if (!menuToggle) return;

    menuToggle.addEventListener('click', () => {
      const isExpanded = menuToggle.classList.contains('active');
      this.toggleMobileMenu(!isExpanded);
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.header') && this.isMobileMenuOpen()) {
        this.toggleMobileMenu(false);
      }
    });

    // Close mobile menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isMobileMenuOpen()) {
        this.toggleMobileMenu(false);
      }
    });
  }

  /**
   * Toggle mobile menu
   * @param {boolean} isOpen - Whether menu should be open
   */
  toggleMobileMenu(isOpen) {
    const menuToggle = document.getElementById('mobile-menu-toggle');
    if (!menuToggle) return;

    menuToggle.classList.toggle('active', isOpen);
    menuToggle.setAttribute('aria-expanded', isOpen);

    // Create mobile navigation if it doesn't exist
    if (isOpen && !document.querySelector('.mobile-nav')) {
      this.createMobileNavigation();
    }

    // Show/hide mobile navigation
    const mobileNav = document.querySelector('.mobile-nav');
    if (mobileNav) {
      mobileNav.classList.toggle('active', isOpen);
    }

    // Prevent body scroll when menu is open
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  /**
   * Check if mobile menu is open
   * @returns {boolean} True if mobile menu is open
   */
  isMobileMenuOpen() {
    const menuToggle = document.getElementById('mobile-menu-toggle');
    return menuToggle?.classList.contains('active') || false;
  }

  /**
   * Create mobile navigation
   */
  createMobileNavigation() {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    const mobileNav = document.createElement('nav');
    mobileNav.className = 'mobile-nav';
    mobileNav.setAttribute('role', 'navigation');
    mobileNav.setAttribute('aria-label', 'Mobile navigation');

    // Clone navigation links
    const navList = nav.querySelector('.nav__list');
    if (navList) {
      const mobileNavList = navList.cloneNode(true);

      const content = document.createElement('div');
      content.className = 'mobile-nav__content';
      content.innerHTML = `
        <div class="mobile-nav__header">
          <span class="logo__text">Menu</span>
          <button class="mobile-nav__close" id="mobile-nav-close">
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      `;
      content.appendChild(mobileNavList);

      mobileNav.appendChild(content);
      document.body.appendChild(mobileNav);

      // Add close button handler
      const closeBtn = document.getElementById('mobile-nav-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.toggleMobileMenu(false);
        });
      }
    }
  }

  /**
   * Initialize lazy loading for images
   */
  initializeLazyLoading() {
    const images = document.querySelectorAll('img[loading="lazy"]');

    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.setAttribute('lazy', 'loaded');
            imageObserver.unobserve(img);
          }
        });
      }, {
        rootMargin: `${UI_CONFIG.LAZY_LOADING_THRESHOLD}px`,
      });

      images.forEach(img => {
        img.setAttribute('lazy', 'loading');
        imageObserver.observe(img);
      });
    } else {
      // Fallback for browsers that don't support IntersectionObserver
      images.forEach(img => {
        img.setAttribute('lazy', 'loaded');
      });
    }
  }

  /**
   * Initialize tooltips
   */
  initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[title], [data-tooltip]');

    tooltipElements.forEach(element => {
      let tooltip = null;
      let timeout = null;

      const showTooltip = () => {
        if (timeout) clearTimeout(timeout);

        const text = element.getAttribute('title') || element.getAttribute('data-tooltip');
        if (!text) return;

        // Remove title to prevent default tooltip
        element.setAttribute('data-original-title', element.getAttribute('title'));
        element.removeAttribute('title');

        // Create tooltip
        tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        document.body.appendChild(tooltip);

        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';

        // Show tooltip
        setTimeout(() => tooltip.classList.add('show'), 10);
      };

      const hideTooltip = () => {
        if (tooltip) {
          tooltip.remove();
          tooltip = null;
        }

        // Restore title
        const originalTitle = element.getAttribute('data-original-title');
        if (originalTitle) {
          element.setAttribute('title', originalTitle);
          element.removeAttribute('data-original-title');
        }
      };

      // Mouse events
      element.addEventListener('mouseenter', showTooltip);
      element.addEventListener('mouseleave', hideTooltip);

      // Focus events for accessibility
      element.addEventListener('focus', showTooltip);
      element.addEventListener('blur', hideTooltip);

      // Touch events
      element.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (tooltip) {
          hideTooltip();
        } else {
          showTooltip();
        }
      });
    });
  }

  /**
   * Initialize accessibility features
   */
  initializeAccessibility() {
    // Skip link functionality
    const skipLink = document.querySelector('.skip-link');
    if (skipLink) {
      skipLink.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(skipLink.getAttribute('href'));
        if (target) {
          target.focus();
          target.scrollIntoView();
        }
      });
    }

    // Announce live regions for screen readers
    this.setupLiveRegions();

    // Keyboard navigation enhancements
    this.setupKeyboardNavigation();

    // Focus management
    this.setupFocusManagement();
  }

  /**
   * Setup live regions for screen readers
   */
  setupLiveRegions() {
    // Create live region container
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'visually-hidden';
    liveRegion.id = 'live-region';
    document.body.appendChild(liveRegion);
  }

  /**
   * Setup keyboard navigation enhancements
   */
  setupKeyboardNavigation() {
    // Enhanced focus indicators
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation');
    });

    // Escape key handling
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Close modals, dropdowns, etc.
        this.closeAllModals();

        // Close mobile menu
        if (this.isMobileMenuOpen()) {
          this.toggleMobileMenu(false);
        }
      }
    });
  }

  /**
   * Setup focus management
   */
  setupFocusManagement() {
    // Manage focus within interactive elements
    const interactiveElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    interactiveElements.forEach(element => {
      element.addEventListener('focus', () => {
        // Add focus-visible polyfill if needed
        if (!element.hasAttribute('data-focus-visible-added')) {
          element.addEventListener('blur', () => {
            element.removeAttribute('data-focus-visible');
          }, { once: true });
          element.setAttribute('data-focus-visible', 'true');
        }
      });
    });
  }

  /**
   * Show toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type (success, error, warning, info)
   * @param {number} duration - Duration in milliseconds
   */
  showToast(message, type = 'info', duration = 5000) {
    if (!this.toastContainer) {
      this.createToastContainer();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <div class="toast__content">
        <span class="toast__message">${message}</span>
        <button class="toast__close" aria-label="Close notification">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    `;

    // Add to container
    this.toastContainer.appendChild(toast);

    // Close button handler
    const closeBtn = toast.querySelector('.toast__close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.removeToast(toast);
      });
    }

    // Auto remove after duration
    setTimeout(() => {
      this.removeToast(toast);
    }, duration);

    // Announce to screen readers
    this.announceToScreenReader(message, type);
  }

  /**
   * Create toast container
   */
  createToastContainer() {
    this.toastContainer = document.createElement('div');
    this.toastContainer.id = UI_CONFIG.TOAST_CONTAINER_ID;
    this.toastContainer.setAttribute('aria-live', 'polite');
    this.toastContainer.setAttribute('aria-label', 'Notifications');
    document.body.appendChild(this.toastContainer);
  }

  /**
   * Remove toast
   * @param {HTMLElement} toast - Toast element
   */
  removeToast(toast) {
    if (toast && toast.parentNode) {
      toast.classList.add('removing');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, UI_CONFIG.ANIMATION_DURATION);
    }
  }

  /**
   * Announce message to screen readers
   * @param {string} message - Message to announce
   * @param {string} type - Message type
   */
  announceToScreenReader(message, type) {
    const liveRegion = document.getElementById('live-region');
    if (liveRegion) {
      const announcement = `${type}: ${message}`;
      liveRegion.textContent = announcement;

      // Clear announcement after it's read
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }

  /**
   * Handle image gallery navigation
   * @param {string} direction - Navigation direction ('left' or 'right')
   */
  handleImageGalleryNavigation(direction) {
    // This would handle navigation in product image galleries
    // Implementation would depend on the specific gallery structure
    console.log('Gallery navigation:', direction);
  }

  /**
   * Cleanup event listeners and observers
   */
  cleanup() {
    // Remove event listeners
    this.eventListeners.forEach((handler, element) => {
      element.removeEventListener('click', handler);
    });

    // Disconnect observers
    this.observers.forEach(observer => {
      observer.disconnect();
    });

    // Clear active modals
    this.activeModals.clear();

    // Remove toast container
    if (this.toastContainer) {
      this.toastContainer.remove();
    }

    this.isInitialized = false;
  }
}

// Create singleton instance
const uiManager = new UIManager();

// Export the classes and instances
export { UIManager, uiManager };
export default uiManager;