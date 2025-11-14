/**
 * Google Store Clone - API Module
 * Product data fetching, search, filtering, and data management
 */

import { utils } from './utils.js';

// API Configuration
const API_CONFIG = {
  DATA_URL: './data/products.json',
  CACHE_KEY: 'google_store_products',
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  ITEMS_PER_PAGE: 12,
  MAX_PRICE: 2000,
};

// Product API Class
class ProductAPI {
  constructor() {
    this.products = [];
    this.categories = [];
    this.isLoading = false;
    this.error = null;
    this.lastFetch = null;
    this.cache = this.loadCache();
  }

  /**
   * Load products from cache or fetch from API
   * @param {boolean} forceRefresh - Force refresh from API
   * @returns {Promise<Array>} Array of products
   */
  async loadProducts(forceRefresh = false) {
    // Check cache first
    if (!forceRefresh && this.isCacheValid()) {
      this.products = this.cache.products;
      this.categories = this.cache.categories;
      return this.products;
    }

    this.isLoading = true;
    this.error = null;

    try {
      const response = await fetch(API_CONFIG.DATA_URL);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Validate data structure
      if (!data.products || !Array.isArray(data.products)) {
        throw new Error('Invalid products data structure');
      }

      // Process products
      this.products = this.processProducts(data.products);
      this.categories = data.categories || [];

      // Update cache
      this.updateCache();

      this.lastFetch = new Date();
      return this.products;

    } catch (error) {
      this.error = error.message;
      console.error('Failed to load products:', error);

      // Fallback to cached data if available
      if (this.cache.products) {
        this.products = this.cache.products;
        this.categories = this.cache.categories;
        return this.products;
      }

      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Process and normalize products data
   * @param {Array} products - Raw products data
   * @returns {Array} Processed products
   */
  processProducts(products) {
    return products.map(product => ({
      ...product,
      id: product.id || utils.generateId('product'),
      price: parseFloat(product.price) || 0,
      rating: parseFloat(product.rating) || 0,
      stock: parseInt(product.stock) || 0,
      popularity: parseInt(product.popularity) || 0,
      images: Array.isArray(product.images) ? product.images : [],
      specs: product.specs || {},
      category: product.category || 'accessories',
      description: product.description || '',
      name: product.name || 'Unknown Product',

      // Computed properties
      inStock: (product.stock || 0) > 0,
      isNew: this.isNewProduct(product.popularity),
      onSale: this.isOnSale(product.price, product.rating),
    }));
  }

  /**
   * Check if product is new (based on popularity)
   * @param {number} popularity - Product popularity score
   * @returns {boolean} True if product is considered new
   */
  isNewProduct(popularity) {
    return (popularity || 0) >= 85;
  }

  /**
   * Check if product is on sale (simple heuristic)
   * @param {number} price - Product price
   * @param {number} rating - Product rating
   * @returns {boolean} True if product might be on sale
   */
  isOnSale(price, rating) {
    // Simple heuristic: products with high ratings might be on sale
    return (rating || 0) >= 4.5 && (price || 0) > 100;
  }

  /**
   * Get all categories
   * @returns {Array} Array of categories
   */
  getCategories() {
    return this.categories;
  }

  /**
   * Get products by category
   * @param {string} categoryId - Category ID
   * @returns {Array} Products in the category
   */
  getProductsByCategory(categoryId) {
    return this.products.filter(product => product.category === categoryId);
  }

  /**
   * Search products
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Array} Search results
   */
  searchProducts(query, options = {}) {
    if (!query || query.trim() === '') {
      return this.products;
    }

    const searchTerms = query.toLowerCase().trim().split(/\s+/);

    return this.products.filter(product => {
      const searchableText = [
        product.name,
        product.description,
        product.category,
        ...Object.values(product.specs).join(' ').split(' ')
      ].join(' ').toLowerCase();

      // Check if all search terms are found
      return searchTerms.every(term => searchableText.includes(term));
    });
  }

  /**
   * Filter products
   * @param {Array} products - Products to filter
   * @param {object} filters - Filter criteria
   * @returns {Array} Filtered products
   */
  filterProducts(products, filters = {}) {
    let filtered = [...products];

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(product =>
        filters.categories.includes(product.category)
      );
    }

    // Price range filter
    if (filters.priceMin !== undefined) {
      filtered = filtered.filter(product => product.price >= filters.priceMin);
    }
    if (filters.priceMax !== undefined) {
      filtered = filtered.filter(product => product.price <= filters.priceMax);
    }

    // Rating filter
    if (filters.rating !== undefined) {
      filtered = filtered.filter(product => product.rating >= filters.rating);
    }

    // In stock filter
    if (filters.inStock) {
      filtered = filtered.filter(product => product.inStock);
    }

    // New products filter
    if (filters.isNew) {
      filtered = filtered.filter(product => product.isNew);
    }

    // On sale filter
    if (filters.onSale) {
      filtered = filtered.filter(product => product.onSale);
    }

    return filtered;
  }

  /**
   * Sort products
   * @param {Array} products - Products to sort
   * @param {string} sortBy - Sort criteria
   * @param {string} order - Sort order ('asc' or 'desc')
   * @returns {Array} Sorted products
   */
  sortProducts(products, sortBy = 'popularity', order = 'desc') {
    const sorted = [...products];

    switch (sortBy) {
      case 'price':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'rating':
        sorted.sort((a, b) => a.rating - b.rating);
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'popularity':
      default:
        sorted.sort((a, b) => a.popularity - b.popularity);
        break;
    }

    // Reverse order if descending
    if (order === 'desc') {
      sorted.reverse();
    }

    return sorted;
  }

  /**
   * Get paginated products
   * @param {Array} products - Products to paginate
   * @param {number} page - Page number (1-based)
   * @param {number} perPage - Items per page
   * @returns {object} Paginated result
   */
  paginateProducts(products, page = 1, perPage = API_CONFIG.ITEMS_PER_PAGE) {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const items = products.slice(startIndex, endIndex);

    return {
      items,
      page,
      perPage,
      total: products.length,
      totalPages: Math.ceil(products.length / perPage),
      hasNext: endIndex < products.length,
      hasPrev: page > 1,
    };
  }

  /**
   * Get product by ID
   * @param {string} productId - Product ID
   * @returns {object|null} Product object or null
   */
  getProductById(productId) {
    return this.products.find(product => product.id === productId) || null;
  }

  /**
   * Get related products
   * @param {string} productId - Product ID
   * @param {number} limit - Maximum number of related products
   * @returns {Array} Related products
   */
  getRelatedProducts(productId, limit = 6) {
    const product = this.getProductById(productId);
    if (!product) return [];

    const related = this.products.filter(p =>
      p.id !== productId && (
        p.category === product.category ||
        Math.abs(p.price - product.price) < product.price * 0.3
      )
    );

    // Sort by relevance (same category first, then similar price)
    related.sort((a, b) => {
      if (a.category === product.category && b.category !== product.category) return -1;
      if (b.category === product.category && a.category !== product.category) return 1;
      return Math.abs(a.price - product.price) - Math.abs(b.price - product.price);
    });

    return related.slice(0, limit);
  }

  /**
   * Get featured products
   * @param {number} limit - Maximum number of products
   * @returns {Array} Featured products
   */
  getFeaturedProducts(limit = 8) {
    // Sort by popularity and get top products
    const featured = [...this.products]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);

    return featured;
  }

  /**
   * Get new products
   * @param {number} limit - Maximum number of products
   * @returns {Array} New products
   */
  getNewProducts(limit = 8) {
    const newProducts = this.products.filter(product => product.isNew);
    return newProducts.slice(0, limit);
  }

  /**
   * Get products on sale
   * @param {number} limit - Maximum number of products
   * @returns {Array} Products on sale
   */
  getSaleProducts(limit = 8) {
    const saleProducts = this.products.filter(product => product.onSale);
    return saleProducts.slice(0, limit);
  }

  /**
   * Get price range for products
   * @param {Array} products - Products to analyze
   * @returns {object} Price range info
   */
  getPriceRange(products = this.products) {
    if (products.length === 0) {
      return { min: 0, max: 0, average: 0 };
    }

    const prices = products.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    return { min, max, average: Math.round(average * 100) / 100 };
  }

  /**
   * Get category statistics
   * @returns {object} Category statistics
   */
  getCategoryStats() {
    const stats = {};

    this.categories.forEach(category => {
      const categoryProducts = this.getProductsByCategory(category.id);
      const priceRange = this.getPriceRange(categoryProducts);

      stats[category.id] = {
        name: category.name,
        count: categoryProducts.length,
        priceRange,
        averageRating: categoryProducts.reduce((sum, p) => sum + p.rating, 0) / categoryProducts.length || 0,
      };
    });

    return stats;
  }

  /**
   * Advanced search with filters and sorting
   * @param {object} searchParams - Search parameters
   * @returns {object} Search results with pagination
   */
  async advancedSearch(searchParams = {}) {
    await this.loadProducts();

    let products = [...this.products];

    // Apply search filter
    if (searchParams.query) {
      products = this.searchProducts(searchParams.query);
    }

    // Apply filters
    const filters = {};
    if (searchParams.categories) filters.categories = searchParams.categories;
    if (searchParams.priceMin !== undefined) filters.priceMin = searchParams.priceMin;
    if (searchParams.priceMax !== undefined) filters.priceMax = searchParams.priceMax;
    if (searchParams.rating !== undefined) filters.rating = searchParams.rating;
    if (searchParams.inStock) filters.inStock = true;
    if (searchParams.isNew) filters.isNew = true;
    if (searchParams.onSale) filters.onSale = true;

    products = this.filterProducts(products, filters);

    // Apply sorting
    const sortBy = searchParams.sortBy || 'popularity';
    const sortOrder = searchParams.sortOrder || 'desc';
    products = this.sortProducts(products, sortBy, sortOrder);

    // Apply pagination
    const page = parseInt(searchParams.page) || 1;
    const perPage = parseInt(searchParams.perPage) || API_CONFIG.ITEMS_PER_PAGE;
    const paginated = this.paginateProducts(products, page, perPage);

    return {
      ...paginated,
      filters,
      searchParams,
      facets: this.getSearchFacets(products),
    };
  }

  /**
   * Get search facets for filtering
   * @param {Array} products - Products to analyze
   * @returns {object} Search facets
   */
  getSearchFacets(products = this.products) {
    const categories = {};
    const priceRange = this.getPriceRange(products);
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    products.forEach(product => {
      // Category counts
      if (!categories[product.category]) {
        categories[product.category] = 0;
      }
      categories[product.category]++;

      // Rating counts
      const ratingFloor = Math.floor(product.rating);
      if (ratingFloor >= 1 && ratingFloor <= 5) {
        ratingCounts[ratingFloor]++;
      }
    });

    return {
      categories,
      priceRange,
      ratingCounts,
      totalProducts: products.length,
      inStockCount: products.filter(p => p.inStock).length,
    };
  }

  /**
   * Load cache from localStorage
   * @returns {object|null} Cached data or null
   */
  loadCache() {
    try {
      const cached = localStorage.getItem(API_CONFIG.CACHE_KEY);
      if (!cached) return null;

      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp > API_CONFIG.CACHE_DURATION) {
        localStorage.removeItem(API_CONFIG.CACHE_KEY);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to load cache:', error);
      return null;
    }
  }

  /**
   * Update cache with current data
   */
  updateCache() {
    try {
      const cacheData = {
        products: this.products,
        categories: this.categories,
        timestamp: Date.now(),
      };

      localStorage.setItem(API_CONFIG.CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to update cache:', error);
    }
  }

  /**
   * Check if cache is valid
   * @returns {boolean} True if cache is valid
   */
  isCacheValid() {
    return this.cache &&
           (Date.now() - this.cache.timestamp) < API_CONFIG.CACHE_DURATION;
  }

  /**
   * Clear cache
   */
  clearCache() {
    localStorage.removeItem(API_CONFIG.CACHE_KEY);
    this.cache = null;
  }

  /**
   * Get loading state
   * @returns {boolean} True if currently loading
   */
  getLoadingState() {
    return this.isLoading;
  }

  /**
   * Get error state
   * @returns {string|null} Error message or null
   */
  getError() {
    return this.error;
  }
}

// Create singleton instance
const productAPI = new ProductAPI();

// Export the API instance and class
export { ProductAPI, productAPI };
export default productAPI;