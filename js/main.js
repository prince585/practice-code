/**
 * Google Store Clone - Main Application Entry Point
 * Application initialization, routing, and component orchestration
 */

import { utils } from './utils.js';
import productAPI from './api.js';
import cartManager from './cart.js';
import uiManager from './ui.js';

// Application Configuration
const APP_CONFIG = {
  NAME: 'Google Store Clone',
  VERSION: '1.0.0',
  API_BASE_URL: './data',
  DEBUG: process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost',
};

// Application Class
class GoogleStoreApp {
  constructor() {
    this.isInitialized = false;
    this.currentRoute = 'home';
    this.isLoading = false;
    this.error = null;
    this.components = new Map();
    this.eventHandlers = new Map();
  }

  /**
   * Initialize the application
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      this.showLoadingState();

      // Initialize core services
      await this.initializeServices();

      // Setup routing
      this.setupRouting();

      // Setup event listeners
      this.setupEventListeners();

      // Load initial data
      await this.loadInitialData();

      // Render initial view
      this.renderInitialView();

      // Setup performance monitoring
      this.setupPerformanceMonitoring();

      // Setup error handling
      this.setupErrorHandling();

      this.isInitialized = true;
      this.hideLoadingState();

      console.log(`${APP_CONFIG.NAME} v${APP_CONFIG.VERSION} initialized successfully`);

      // Announce to screen readers
      this.announceToScreenReader('Google Store Clone loaded successfully');

    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.handleError(error);
      this.hideLoadingState();
    }
  }

  /**
   * Initialize core services
   */
  async initializeServices() {
    // Initialize UI manager
    await uiManager.initialize();

    // Initialize cart manager
    await cartManager.initialize();

    // Initialize product API
    await productAPI.loadProducts();

    console.log('Core services initialized');
  }

  /**
   * Setup client-side routing
   */
  setupRouting() {
    // Handle browser navigation
    window.addEventListener('popstate', (e) => {
      this.handleRouteChange();
    });

    // Handle initial route
    this.handleRouteChange();

    // Setup smooth scrolling for anchor links
    this.setupSmoothScrolling();

    console.log('Routing system initialized');
  }

  /**
   * Handle route changes
   */
  async handleRouteChange() {
    try {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const params = utils.getUrlParams();

      let route = 'home';

      // Parse route from URL
      if (hash && hash.startsWith('#')) {
        route = hash.substring(1);
      } else if (path !== '/') {
        route = path.replace(/^\//, '');
      }

      // Handle special routes
      if (params.q) {
        route = 'search';
      }

      if (route !== this.currentRoute) {
        await this.navigateToRoute(route, params);
        this.currentRoute = route;
      }

    } catch (error) {
      console.error('Route change failed:', error);
      this.handleError(error);
    }
  }

  /**
   * Navigate to specific route
   * @param {string} route - Route name
   * @param {object} params - Route parameters
   */
  async navigateToRoute(route, params = {}) {
    try {
      this.showLoadingState();

      // Hide current view
      this.hideCurrentView();

      // Render new view
      switch (route) {
        case 'home':
        case '':
          await this.renderHomePage();
          break;
        case 'products':
          await this.renderProductsPage(params);
          break;
        case 'search':
          await this.renderSearchPage(params);
          break;
        case 'category':
          await this.renderCategoryPage(params);
          break;
        case 'product':
          await this.renderProductDetailPage(params);
          break;
        case 'cart':
          await this.renderCartPage();
          break;
        case 'checkout':
          await this.renderCheckoutPage();
          break;
        case 'wishlist':
          await this.renderWishlistPage();
          break;
        case 'profile':
          await this.renderProfilePage();
          break;
        default:
          await this.renderNotFoundPage();
          break;
      }

      this.hideLoadingState();

      // Update page title
      this.updatePageTitle(route);

      // Announce route change to screen readers
      this.announceToScreenReader(`Navigated to ${route} page`);

    } catch (error) {
      console.error(`Failed to navigate to route "${route}":`, error);
      this.handleError(error);
      this.hideLoadingState();
    }
  }

  /**
   * Render home page
   */
  async renderHomePage() {
    try {
      // Get featured products
      const featuredProducts = productAPI.getFeaturedProducts(8);
      const newProducts = productAPI.getNewProducts(4);

      // Update hero section (if needed)
      this.updateHeroSection();

      // Render featured products
      this.renderFeaturedProducts(featuredProducts);

      // Update main content
      const mainContent = document.querySelector('.main');
      if (mainContent) {
        mainContent.innerHTML = `
          <section class="featured" aria-labelledby="featured-title">
            <div class="container">
              <h2 id="featured-title" class="section-title">Featured Products</h2>
              <div class="products-grid" id="featured-products-grid">
                <!-- Products will be rendered here -->
              </div>
            </div>
          </section>
        `;

        this.renderProductGrid('featured-products-grid', featuredProducts);
      }

    } catch (error) {
      console.error('Failed to render home page:', error);
      throw error;
    }
  }

  /**
   * Render products page
   * @param {object} params - URL parameters
   */
  async renderProductsPage(params = {}) {
    try {
      const searchParams = {
        page: parseInt(params.page) || 1,
        perPage: parseInt(params.perPage) || 12,
        sortBy: params.sort || 'popularity',
        sortOrder: params.order || 'desc',
      };

      // Add filters from params
      if (params.category) {
        searchParams.categories = params.category.split(',');
      }
      if (params.maxPrice) {
        searchParams.priceMax = parseFloat(params.maxPrice);
      }
      if (params.minRating) {
        searchParams.rating = parseFloat(params.minRating);
      }
      if (params.inStock === 'true') {
        searchParams.inStock = true;
      }

      // Perform search
      const results = await productAPI.advancedSearch(searchParams);

      // Render products page
      this.renderProductsList(results);

    } catch (error) {
      console.error('Failed to render products page:', error);
      throw error;
    }
  }

  /**
   * Render search page
   * @param {object} params - Search parameters
   */
  async renderSearchPage(params) {
    try {
      const query = params.q || '';
      if (!query) {
        // Redirect to products page if no query
        this.navigateToRoute('products');
        return;
      }

      // Update search input
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.value = query;
      }

      // Perform search
      await this.renderProductsPage(params);

      // Show search results header
      this.showSearchResultsHeader(query);

    } catch (error) {
      console.error('Failed to render search page:', error);
      throw error;
    }
  }

  /**
   * Render category page
   * @param {object} params - Category parameters
   */
  async renderCategoryPage(params) {
    try {
      const categoryId = params.category;
      if (!categoryId) {
        this.navigateToRoute('products');
        return;
      }

      // Update filters to show selected category
      const categoryCheckbox = document.querySelector(`input[name="category"][value="${categoryId}"]`);
      if (categoryCheckbox) {
        categoryCheckbox.checked = true;
      }

      // Apply category filter
      await this.renderProductsPage({ category: categoryId, ...params });

    } catch (error) {
      console.error('Failed to render category page:', error);
      throw error;
    }
  }

  /**
   * Render product detail page
   * @param {object} params - Product parameters
   */
  async renderProductDetailPage(params) {
    try {
      const productId = params.id;
      if (!productId) {
        this.navigateToRoute('products');
        return;
      }

      // Get product details
      const product = productAPI.getProductById(productId);
      if (!product) {
        this.renderNotFoundPage();
        return;
      }

      // Get related products
      const relatedProducts = productAPI.getRelatedProducts(productId, 4);

      // Render product detail modal
      this.renderProductDetailModal(product, relatedProducts);

    } catch (error) {
      console.error('Failed to render product detail page:', error);
      throw error;
    }
  }

  /**
   * Render product grid
   * @param {string} containerId - Container element ID
   * @param {Array} products - Products to render
   */
  renderProductGrid(containerId, products) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (products.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <h3>No products found</h3>
          <p>Try adjusting your filters or search criteria.</p>
          <button class="button--primary" onclick="app.clearFilters()">Clear Filters</button>
        </div>
      `;
      return;
    }

    container.innerHTML = products.map(product => this.createProductCard(product)).join('');

    // Add event listeners to product cards
    this.addProductCardEventListeners(container);
  }

  /**
   * Create product card HTML
   * @param {object} product - Product object
   * @returns {string} Product card HTML
   */
  createProductCard(product) {
    const imageUrl = product.images?.[0] || 'assets/images/placeholder-product.jpg';
    const badge = product.isNew ? '<span class="product-card__badge">New</span>' : '';

    return `
      <article class="product-card" data-product-id="${product.id}">
        <div class="product-card__image">
          <img src="${imageUrl}" alt="${product.name}" loading="lazy">
          ${badge}
        </div>
        <div class="product-card__content">
          <div class="product-card__category">${product.category}</div>
          <h3 class="product-card__name">${product.name}</h3>
          <p class="product-card__description">${utils.truncateText(product.description, 120)}</p>
          <div class="product-card__meta">
            <span class="product-card__price">${utils.formatCurrency(product.price)}</span>
            <div class="product-card__rating">
              <span class="rating-stars">${utils.formatRating(product.rating)}</span>
              <span>(${product.rating})</span>
            </div>
          </div>
          <div class="product-card__actions">
            <button class="button--primary product-card__add-to-cart" data-product-id="${product.id}">
              Add to Cart
            </button>
            <button class="button--ghost product-card__wishlist" data-product-id="${product.id}" aria-label="Add to wishlist">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  /**
   * Add event listeners to product cards
   * @param {HTMLElement} container - Container element
   */
  addProductCardEventListeners(container) {
    // Add to cart buttons
    container.addEventListener('click', async (e) => {
      const addToCartBtn = e.target.closest('.product-card__add-to-cart');
      if (addToCartBtn) {
        const productId = addToCartBtn.dataset.productId;
        await this.handleAddToCart(productId);
      }

      // Wishlist buttons
      const wishlistBtn = e.target.closest('.product-card__wishlist');
      if (wishlistBtn) {
        const productId = wishlistBtn.dataset.productId;
        this.handleWishlistToggle(productId, wishlistBtn);
      }

      // Product card click (for navigation)
      const productCard = e.target.closest('.product-card');
      if (productCard && !addToCartBtn && !wishlistBtn && !e.target.closest('.product-card__actions')) {
        const productId = productCard.dataset.productId;
        this.viewProductDetail(productId);
      }
    });
  }

  /**
   * Handle add to cart
   * @param {string} productId - Product ID
   */
  async handleAddToCart(productId) {
    try {
      const cart = cartManager.getCart();
      await cart.addItem(productId, 1);

      // Show success feedback
      uiManager.showToast('Product added to cart', 'success');

      // Update cart UI
      cartManager.updateCartBadge();

    } catch (error) {
      console.error('Failed to add to cart:', error);
      uiManager.showToast(error.message, 'error');
    }
  }

  /**
   * Handle wishlist toggle
   * @param {string} productId - Product ID
   * @param {HTMLElement} button - Wishlist button
   */
  handleWishlistToggle(productId, button) {
    // Get current wishlist from localStorage
    let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');

    const index = wishlist.indexOf(productId);
    if (index > -1) {
      // Remove from wishlist
      wishlist.splice(index, 1);
      button.classList.remove('active');
      uiManager.showToast('Removed from wishlist', 'info');
    } else {
      // Add to wishlist
      wishlist.push(productId);
      button.classList.add('active');
      uiManager.showToast('Added to wishlist', 'success');
    }

    // Save to localStorage
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }

  /**
   * View product detail
   * @param {string} productId - Product ID
   */
  viewProductDetail(productId) {
    // Update URL without page reload
    utils.updateUrlParams({ id: productId, view: 'product' }, true);

    // Open product modal
    this.renderProductDetailModal(productId);
  }

  /**
   * Render product detail modal
   * @param {string|object} productIdOrProduct - Product ID or product object
   * @param {Array} relatedProducts - Related products
   */
  async renderProductDetailModal(productIdOrProduct, relatedProducts = null) {
    try {
      let product;

      if (typeof productIdOrProduct === 'string') {
        product = productAPI.getProductById(productIdOrProduct);
      } else {
        product = productIdOrProduct;
      }

      if (!product) {
        uiManager.showToast('Product not found', 'error');
        return;
      }

      if (!relatedProducts) {
        relatedProducts = productAPI.getRelatedProducts(product.id, 4);
      }

      // Create modal content
      const modalContent = this.createProductDetailContent(product, relatedProducts);

      // Update modal
      const modalContentElement = document.getElementById('product-modal-content');
      if (modalContentElement) {
        modalContentElement.innerHTML = modalContent;
      }

      // Add event listeners
      this.addProductDetailEventListeners(product);

      // Open modal
      uiManager.openModal('product-modal');

    } catch (error) {
      console.error('Failed to render product detail modal:', error);
      uiManager.showToast('Failed to load product details', 'error');
    }
  }

  /**
   * Create product detail content
   * @param {object} product - Product object
   * @param {Array} relatedProducts - Related products
   * @returns {string} HTML content
   */
  createProductDetailContent(product, relatedProducts) {
    const mainImage = product.images?.[0] || 'assets/images/placeholder-product.jpg';
    const thumbnails = product.images?.slice(1, 4) || [];

    return `
      <div class="product-detail">
        <div class="product-detail__gallery">
          <div class="product-detail__main-image">
            <img src="${mainImage}" alt="${product.name}" id="product-main-image">
          </div>
          ${thumbnails.length > 0 ? `
            <div class="product-detail__thumbnails">
              ${thumbnails.map((thumb, index) => `
                <button class="product-detail__thumbnail" data-image="${thumb}">
                  <img src="${thumb}" alt="Product image ${index + 2}" loading="lazy">
                </button>
              `).join('')}
            </div>
          ` : ''}
        </div>
        <div class="product-detail__info">
          <h1 class="product-detail__name">${product.name}</h1>
          <div class="product-detail__rating">
            <span class="rating-stars">${utils.formatRating(product.rating)}</span>
            <span>${product.rating} (${Math.floor(Math.random() * 100) + 10} reviews)</span>
          </div>
          <div class="product-detail__price">${utils.formatCurrency(product.price)}</div>
          <div class="product-detail__description">
            <p>${product.description}</p>
          </div>
          <div class="product-detail__specs">
            <h3>Specifications</h3>
            <dl class="specs-list">
              ${Object.entries(product.specs).map(([key, value]) => `
                <div class="specs-list__item">
                  <dt>${utils.capitalizeWords(key.replace(/_/g, ' '))}</dt>
                  <dd>${value}</dd>
                </div>
              `).join('')}
            </dl>
          </div>
          <div class="product-detail__actions">
            <div class="quantity-selector">
              <label for="product-quantity">Quantity:</label>
              <input type="number" id="product-quantity" value="1" min="1" max="10">
            </div>
            <button class="button--primary product-detail__add-to-cart" data-product-id="${product.id}">
              Add to Cart
            </button>
          </div>
          ${product.stock > 0 ? `
            <div class="product-detail__stock">In Stock (${product.stock} available)</div>
          ` : `
            <div class="product-detail__stock out-of-stock">Out of Stock</div>
          `}
        </div>
      </div>
      ${relatedProducts.length > 0 ? `
        <div class="product-detail__related">
          <h2>Related Products</h2>
          <div class="products-grid products-grid--small">
            ${relatedProducts.map(related => this.createProductCard(related)).join('')}
          </div>
        </div>
      ` : ''}
    `;
  }

  /**
   * Add event listeners to product detail modal
   * @param {object} product - Product object
   */
  addProductDetailEventListeners(product) {
    // Add to cart button
    const addToCartBtn = document.querySelector('.product-detail__add-to-cart');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', async () => {
        const quantity = parseInt(document.getElementById('product-quantity')?.value || 1);
        await this.handleAddToCart(product.id, quantity);
      });
    }

    // Thumbnail clicks
    const thumbnails = document.querySelectorAll('.product-detail__thumbnail');
    thumbnails.forEach(thumbnail => {
      thumbnail.addEventListener('click', () => {
        const imageSrc = thumbnail.dataset.image;
        const mainImage = document.getElementById('product-main-image');
        if (mainImage && imageSrc) {
          mainImage.src = imageSrc;
        }
      });
    });

    // Related products event listeners
    const relatedContainer = document.querySelector('.product-detail__related .products-grid');
    if (relatedContainer) {
      this.addProductCardEventListeners(relatedContainer);
    }
  }

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    // Search events
    document.addEventListener('search', (e) => {
      const query = e.detail.query;
      if (query) {
        utils.updateUrlParams({ q: query, page: null }, true);
      }
    });

    // Filter events
    document.addEventListener('filters:apply', (e) => {
      this.handleFilterChange(e.detail.filters);
    });

    // Sort events
    document.addEventListener('sort', (e) => {
      this.handleSortChange(e.detail);
    });

    // Modal events
    document.addEventListener('modal:open', (e) => {
      this.handleModalOpen(e.detail.modal);
    });

    document.addEventListener('modal:close', (e) => {
      this.handleModalClose(e.detail.modal);
    });

    // Cart events
    const cart = cartManager.getCart();
    cart.addEventListener('*', this.handleCartEvent.bind(this));

    // Keyboard shortcuts
    this.setupKeyboardShortcuts();

    console.log('Event listeners setup complete');
  }

  /**
   * Handle filter change
   * @param {object} filters - Applied filters
   */
  handleFilterChange(filters) {
    // Update URL and reload products
    utils.updateUrlParams({ page: null }, true);
    this.renderProductsPage(filters);
  }

  /**
   * Handle sort change
   * @param {object} sortParams - Sort parameters
   */
  handleSortChange(sortParams) {
    // Reload products with new sort
    this.renderProductsPage();
  }

  /**
   * Handle modal open
   * @param {HTMLElement} modal - Modal element
   */
  handleModalOpen(modal) {
    // Add analytics tracking if needed
    if (APP_CONFIG.DEBUG) {
      console.log('Modal opened:', modal.id);
    }
  }

  /**
   * Handle modal close
   * @param {HTMLElement} modal - Modal element
   */
  handleModalClose(modal) {
    // Clear product view parameter if closing product modal
    if (modal.id === 'product-modal') {
      utils.updateUrlParams({ id: null, view: null }, true);
    }
  }

  /**
   * Handle cart events
   * @param {string} eventType - Event type
   * @param {*} data - Event data
   */
  handleCartEvent(eventType, data) {
    switch (eventType) {
      case 'add':
        this.trackEvent('cart_add', data);
        break;
      case 'remove':
        this.trackEvent('cart_remove', data);
        break;
      case 'checkout':
        this.trackEvent('checkout_start', data);
        break;
    }
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only handle shortcuts when not in input fields
      if (e.target.matches('input, textarea, select')) return;

      switch (e.key.toLowerCase()) {
        case 'k':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            document.getElementById('search-input')?.focus();
          }
          break;
        case '/':
          e.preventDefault();
          document.getElementById('search-input')?.focus();
          break;
        case 'c':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            uiManager.openModal('cart-sidebar');
          }
          break;
        case 'n':
          if (e.altKey) {
            e.preventDefault();
            this.navigateToRoute('products');
          }
          break;
      }
    });
  }

  /**
   * Setup smooth scrolling
   */
  setupSmoothScrolling() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (link) {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          utils.scrollTo(targetElement);
        }
      }
    });
  }

  /**
   * Load initial data
   */
  async loadInitialData() {
    try {
      // Products are already loaded in initializeServices
      console.log('Initial data loaded successfully');
    } catch (error) {
      console.error('Failed to load initial data:', error);
      throw error;
    }
  }

  /**
   * Render initial view
   */
  renderInitialView() {
    // Handle initial route based on URL
    this.handleRouteChange();
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    if (!APP_CONFIG.DEBUG) return;

    // Monitor page load performance
    if ('performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfData = performance.getEntriesByType('navigation')[0];
          console.log('Page Load Performance:', {
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
            totalTime: perfData.loadEventEnd - perfData.loadEventStart,
          });
        }, 0);
      });
    }
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    // Global error handler
    window.addEventListener('error', (e) => {
      console.error('Global error:', e.error);
      this.handleError(e.error);
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
      console.error('Unhandled promise rejection:', e.reason);
      this.handleError(e.reason);
    });
  }

  /**
   * Handle application errors
   * @param {Error} error - Error object
   */
  handleError(error) {
    this.error = error;

    // Log error
    console.error('Application error:', error);

    // Show user-friendly error message
    uiManager.showToast('Something went wrong. Please try again.', 'error');

    // Track error (in production, you might send to an error tracking service)
    this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      url: window.location.href,
    });
  }

  /**
   * Track analytics events
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  trackEvent(event, data = null) {
    if (APP_CONFIG.DEBUG) {
      console.log('Analytics Event:', event, data);
    }

    // In production, you would send to analytics service
    // For demo purposes, just log to console
  }

  /**
   * Show loading state
   */
  showLoadingState() {
    this.isLoading = true;
    document.body.classList.add('loading');
  }

  /**
   * Hide loading state
   */
  hideLoadingState() {
    this.isLoading = false;
    document.body.classList.remove('loading');
  }

  /**
   * Hide current view
   */
  hideCurrentView() {
    // Implement view hiding logic
    // This could be used for transitions
  }

  /**
   * Update page title
   * @param {string} route - Current route
   */
  updatePageTitle(route) {
    const titles = {
      home: 'Google Store - Smart Devices, Accessories & More',
      products: 'Products - Google Store',
      search: 'Search Results - Google Store',
      cart: 'Shopping Cart - Google Store',
      checkout: 'Checkout - Google Store',
      wishlist: 'Wishlist - Google Store',
      profile: 'My Account - Google Store',
    };

    const title = titles[route] || 'Google Store';
    document.title = title;
  }

  /**
   * Announce to screen readers
   * @param {string} message - Message to announce
   */
  announceToScreenReader(message) {
    const liveRegion = document.getElementById('live-region');
    if (liveRegion) {
      liveRegion.textContent = message;
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    // Clear URL parameters
    utils.updateUrlParams({
      q: null,
      category: null,
      maxPrice: null,
      minRating: null,
      inStock: null,
      page: null,
    }, true);

    // Clear UI filters
    uiManager.clearAllFilters();

    // Reload products
    this.renderProductsPage();
  }

  /**
   * Render products list
   * @param {object} results - Search results
   */
  renderProductsList(results) {
    // Update active filters display
    this.updateActiveFilters(results.filters);

    // Render products grid
    this.renderProductGrid('products-grid', results.items);

    // Render pagination
    this.renderPagination(results);

    // Update results count
    this.updateResultsCount(results.total, results.page, results.perPage);
  }

  /**
   * Update active filters display
   * @param {object} filters - Active filters
   */
  updateActiveFilters(filters) {
    const container = document.getElementById('active-filters');
    if (!container) return;

    const pills = [];

    // Category filters
    if (filters.categories && filters.categories.length > 0) {
      filters.categories.forEach(category => {
        pills.push({
          type: 'category',
          value: category,
          label: category.charAt(0).toUpperCase() + category.slice(1),
        });
      });
    }

    // Price filter
    if (filters.priceMax !== undefined) {
      pills.push({
        type: 'price',
        value: filters.priceMax,
        label: `Under ${utils.formatCurrency(filters.priceMax)}`,
      });
    }

    // Rating filter
    if (filters.rating !== undefined) {
      pills.push({
        type: 'rating',
        value: filters.rating,
        label: `${filters.rating}+ Stars`,
      });
    }

    // In stock filter
    if (filters.inStock) {
      pills.push({
        type: 'inStock',
        value: true,
        label: 'In Stock',
      });
    }

    // Render filter pills
    container.innerHTML = pills.map(pill => `
      <div class="active-filter-pill" data-type="${pill.type}" data-value="${pill.value}">
        <span>${pill.label}</span>
        <button class="active-filter-pill__remove" aria-label="Remove filter">
          <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    `).join('');

    // Add remove handlers
    container.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.active-filter-pill__remove');
      if (removeBtn) {
        const pill = removeBtn.closest('.active-filter-pill');
        this.removeFilter(pill.dataset.type, pill.dataset.value);
      }
    });
  }

  /**
   * Remove specific filter
   * @param {string} type - Filter type
   * @param {string} value - Filter value
   */
  removeFilter(type, value) {
    const urlParams = utils.getUrlParams();

    switch (type) {
      case 'category':
        const categories = (urlParams.category || '').split(',').filter(c => c !== value);
        if (categories.length > 0) {
          urlParams.category = categories.join(',');
        } else {
          delete urlParams.category;
        }
        break;
      case 'price':
        delete urlParams.maxPrice;
        break;
      case 'rating':
        delete urlParams.minRating;
        break;
      case 'inStock':
        delete urlParams.inStock;
        break;
    }

    utils.updateUrlParams(urlParams, true);
    this.renderProductsPage();
  }

  /**
   * Render pagination
   * @param {object} pagination - Pagination data
   */
  renderPagination(pagination) {
    const container = document.getElementById('pagination');
    if (!container) return;

    if (pagination.totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let paginationHTML = '';

    // Previous button
    if (pagination.hasPrev) {
      paginationHTML += `
        <button class="pagination__button" data-page="${pagination.page - 1}">
          Previous
        </button>
      `;
    }

    // Page numbers
    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.totalPages, pagination.page + 2);

    if (startPage > 1) {
      paginationHTML += `
        <button class="pagination__button" data-page="1">1</button>
      `;
      if (startPage > 2) {
        paginationHTML += '<span class="pagination__ellipsis">...</span>';
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      const activeClass = i === pagination.page ? 'active' : '';
      paginationHTML += `
        <button class="pagination__button ${activeClass}" data-page="${i}">${i}</button>
      `;
    }

    if (endPage < pagination.totalPages) {
      if (endPage < pagination.totalPages - 1) {
        paginationHTML += '<span class="pagination__ellipsis">...</span>';
      }
      paginationHTML += `
        <button class="pagination__button" data-page="${pagination.totalPages}">${pagination.totalPages}</button>
      `;
    }

    // Next button
    if (pagination.hasNext) {
      paginationHTML += `
        <button class="pagination__button" data-page="${pagination.page + 1}">
          Next
        </button>
      `;
    }

    container.innerHTML = paginationHTML;

    // Add click handlers
    container.addEventListener('click', (e) => {
      const button = e.target.closest('.pagination__button');
      if (button && !button.classList.contains('active')) {
        const page = parseInt(button.dataset.page);
        utils.updateUrlParams({ page }, true);
        this.renderProductsPage();
      }
    });
  }

  /**
   * Update results count
   * @param {number} total - Total results
   * @param {number} page - Current page
   * @param {number} perPage - Items per page
   */
  updateResultsCount(total, page, perPage) {
    const start = (page - 1) * perPage + 1;
    const end = Math.min(page * perPage, total);

    // You could update a results count element here
    // For example: <div class="results-count">Showing ${start}-${end} of ${total} products</div>
  }

  /**
   * Show search results header
   * @param {string} query - Search query
   */
  showSearchResultsHeader(query) {
    // You could add a search results header here
    console.log(`Search results for: "${query}"`);
  }

  /**
   * Render 404 page
   */
  renderNotFoundPage() {
    const mainContent = document.querySelector('.main');
    if (mainContent) {
      mainContent.innerHTML = `
        <div class="container text-center">
          <h1>Page Not Found</h1>
          <p>Sorry, we couldn't find the page you're looking for.</p>
          <a href="#home" class="button--primary">Return to Home</a>
        </div>
      `;
    }
  }

  /**
   * Update hero section
   */
  updateHeroSection() {
    // Hero section is already in HTML, but you could update it dynamically here
  }

  /**
   * Render featured products
   * @param {Array} products - Featured products
   */
  renderFeaturedProducts(products) {
    this.renderProductGrid('featured-products-grid', products);
  }

  /**
   * Render cart page
   */
  renderCartPage() {
    // Open cart sidebar
    uiManager.openModal('cart-sidebar');
  }

  /**
   * Render checkout page
   */
  renderCheckoutPage() {
    // This would implement the checkout flow
    console.log('Checkout page would be rendered here');
  }

  /**
   * Render wishlist page
   */
  renderWishlistPage() {
    // This would implement the wishlist page
    console.log('Wishlist page would be rendered here');
  }

  /**
   * Render profile page
   */
  renderProfilePage() {
    // This would implement the user profile page
    console.log('Profile page would be rendered here');
  }

  /**
   * Get application info
   * @returns {object} Application information
   */
  getInfo() {
    return {
      name: APP_CONFIG.NAME,
      version: APP_CONFIG.VERSION,
      isInitialized: this.isInitialized,
      currentRoute: this.currentRoute,
      isLoading: this.isLoading,
      error: this.error,
    };
  }
}

// Create and initialize application
const app = new GoogleStoreApp();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app.initialize();
  });
} else {
  app.initialize();
}

// Export for global access and testing
window.GoogleStoreApp = GoogleStoreApp;
window.app = app;

export { GoogleStoreApp, app };
export default app;