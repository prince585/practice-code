/**
 * Google Store Clone - Cart Module
 * Shopping cart functionality with localStorage persistence
 */

import { utils } from './utils.js';
import productAPI from './api.js';

// Cart Configuration
const CART_CONFIG = {
  STORAGE_KEY: 'google_store_cart',
  TAX_RATE: 0.08, // 8% tax rate
  SHIPPING_THRESHOLD: 50, // Free shipping over $50
  SHIPPING_COST: 9.99,
  MAX_QUANTITY: 10,
};

// Cart Class
class Cart {
  constructor() {
    this.items = [];
    this.listeners = new Set();
    this.loadFromStorage();
  }

  /**
   * Add item to cart
   * @param {string} productId - Product ID
   * @param {number} quantity - Quantity to add (default: 1)
   * @param {object} options - Additional options
   * @returns {Promise<boolean>} True if item was added successfully
   */
  async addItem(productId, quantity = 1, options = {}) {
    try {
      // Validate inputs
      if (!productId || quantity < 1) {
        throw new Error('Invalid product ID or quantity');
      }

      // Get product details
      const product = productAPI.getProductById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Check stock availability
      if (!product.inStock) {
        throw new Error('Product is out of stock');
      }

      const currentQuantity = this.getItemQuantity(productId);
      const newQuantity = currentQuantity + quantity;

      if (newQuantity > product.stock) {
        throw new Error(`Only ${product.stock} items available in stock`);
      }

      if (newQuantity > CART_CONFIG.MAX_QUANTITY) {
        throw new Error(`Maximum quantity per item is ${CART_CONFIG.MAX_QUANTITY}`);
      }

      // Add or update item
      const existingItemIndex = this.items.findIndex(item => item.id === productId);

      if (existingItemIndex > -1) {
        // Update existing item
        this.items[existingItemIndex].quantity = newQuantity;
        this.items[existingItemIndex].updatedAt = new Date().toISOString();
      } else {
        // Add new item
        const cartItem = {
          id: product.id,
          quantity: quantity,
          addedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Cache product data for offline access
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            images: product.images,
            category: product.category,
            inStock: product.inStock,
          },
        };

        this.items.push(cartItem);
      }

      // Save to storage and notify listeners
      this.saveToStorage();
      this.notifyListeners('add', { productId, quantity, product });

      return true;

    } catch (error) {
      console.error('Failed to add item to cart:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   * @param {string} productId - Product ID to remove
   * @param {number} quantity - Quantity to remove (default: all)
   * @returns {boolean} True if item was removed successfully
   */
  removeItem(productId, quantity = null) {
    const itemIndex = this.items.findIndex(item => item.id === productId);

    if (itemIndex === -1) {
      return false;
    }

    if (quantity === null || quantity >= this.items[itemIndex].quantity) {
      // Remove entire item
      const removedItem = this.items.splice(itemIndex, 1)[0];
      this.saveToStorage();
      this.notifyListeners('remove', { productId, removedItem });
      return true;
    } else {
      // Reduce quantity
      this.items[itemIndex].quantity -= quantity;
      this.items[itemIndex].updatedAt = new Date().toISOString();
      this.saveToStorage();
      this.notifyListeners('update', { productId, quantity: this.items[itemIndex].quantity });
      return true;
    }
  }

  /**
   * Update item quantity
   * @param {string} productId - Product ID
   * @param {number} quantity - New quantity
   * @returns {boolean} True if quantity was updated successfully
   */
  async updateItemQuantity(productId, quantity) {
    try {
      // Validate inputs
      if (!productId || quantity < 0) {
        throw new Error('Invalid product ID or quantity');
      }

      if (quantity > CART_CONFIG.MAX_QUANTITY) {
        throw new Error(`Maximum quantity per item is ${CART_CONFIG.MAX_QUANTITY}`);
      }

      const itemIndex = this.items.findIndex(item => item.id === productId);

      if (itemIndex === -1) {
        throw new Error('Item not found in cart');
      }

      // Get product to check stock
      const product = productAPI.getProductById(productId);
      if (product && quantity > product.stock) {
        throw new Error(`Only ${product.stock} items available in stock`);
      }

      if (quantity === 0) {
        // Remove item if quantity is 0
        return this.removeItem(productId);
      }

      // Update quantity
      this.items[itemIndex].quantity = quantity;
      this.items[itemIndex].updatedAt = new Date().toISOString();

      this.saveToStorage();
      this.notifyListeners('update', { productId, quantity });

      return true;

    } catch (error) {
      console.error('Failed to update item quantity:', error);
      throw error;
    }
  }

  /**
   * Get item quantity
   * @param {string} productId - Product ID
   * @returns {number} Item quantity or 0 if not found
   */
  getItemQuantity(productId) {
    const item = this.items.find(item => item.id === productId);
    return item ? item.quantity : 0;
  }

  /**
   * Check if item is in cart
   * @param {string} productId - Product ID
   * @returns {boolean} True if item is in cart
   */
  hasItem(productId) {
    return this.items.some(item => item.id === productId);
  }

  /**
   * Get cart items with full product details
   * @returns {Array} Array of cart items with product data
   */
  async getCartItems() {
    const itemsWithProducts = [];

    for (const cartItem of this.items) {
      // Try to get fresh product data
      let product = productAPI.getProductById(cartItem.id);

      // Fallback to cached product data
      if (!product && cartItem.product) {
        product = cartItem.product;
      }

      if (product) {
        itemsWithProducts.push({
          ...cartItem,
          product,
          subtotal: cartItem.quantity * product.price,
          inStock: product.inStock,
        });
      }
    }

    return itemsWithProducts;
  }

  /**
   * Get cart summary
   * @returns {object} Cart summary with totals
   */
  async getCartSummary() {
    const items = await this.getCartItems();
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    // Calculate shipping
    const shippingCost = subtotal >= CART_CONFIG.SHIPPING_THRESHOLD ? 0 : CART_CONFIG.SHIPPING_COST;

    // Calculate tax
    const taxAmount = subtotal * CART_CONFIG.TAX_RATE;

    // Calculate total
    const total = subtotal + shippingCost + taxAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      shippingCost: Math.round(shippingCost * 100) / 100,
      total: Math.round(total * 100) / 100,
      itemCount,
      items: items.length,
      freeShippingEligible: subtotal >= CART_CONFIG.SHIPPING_THRESHOLD,
      freeShippingRemaining: Math.max(0, CART_CONFIG.SHIPPING_THRESHOLD - subtotal),
    };
  }

  /**
   * Check if cart is empty
   * @returns {boolean} True if cart is empty
   */
  isEmpty() {
    return this.items.length === 0;
  }

  /**
   * Get total number of items in cart
   * @returns {number} Total item count
   */
  getItemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Clear entire cart
   */
  clearCart() {
    this.items = [];
    this.saveToStorage();
    this.notifyListeners('clear');
  }

  /**
   * Validate cart items (check stock, product availability)
   * @returns {Promise<object>} Validation results
   */
  async validateCart() {
    const validation = {
      isValid: true,
      invalidItems: [],
      outOfStockItems: [],
      updatedItems: [],
    };

    const validItems = [];

    for (const cartItem of this.items) {
      const product = productAPI.getProductById(cartItem.id);

      if (!product) {
        // Product no longer exists
        validation.invalidItems.push({
          id: cartItem.id,
          name: cartItem.product?.name || 'Unknown Product',
          reason: 'Product no longer available',
        });
        continue;
      }

      if (!product.inStock) {
        // Product is out of stock
        validation.outOfStockItems.push({
          id: cartItem.id,
          name: product.name,
          currentQuantity: cartItem.quantity,
        });
        continue;
      }

      if (cartItem.quantity > product.stock) {
        // Quantity exceeds stock
        const validQuantity = product.stock;
        validation.updatedItems.push({
          id: cartItem.id,
          name: product.name,
          oldQuantity: cartItem.quantity,
          newQuantity: validQuantity,
        });

        // Update cart item quantity
        cartItem.quantity = validQuantity;
        cartItem.updatedAt = new Date().toISOString();
      }

      validItems.push(cartItem);
    }

    // Update cart with only valid items
    this.items = validItems;

    if (validation.invalidItems.length > 0 || validation.outOfStockItems.length > 0) {
      validation.isValid = false;
    }

    // Save changes
    this.saveToStorage();

    if (!validation.isValid) {
      this.notifyListeners('validation', validation);
    }

    return validation;
  }

  /**
   * Merge cart with data from localStorage (for synchronization)
   * @param {Array} cartData - Cart data to merge
   */
  mergeCart(cartData) {
    if (!Array.isArray(cartData)) return;

    // Merge items by product ID
    cartData.forEach(newItem => {
      const existingIndex = this.items.findIndex(item => item.id === newItem.id);

      if (existingIndex > -1) {
        // Update existing item quantity
        this.items[existingIndex].quantity = Math.max(
          this.items[existingIndex].quantity,
          newItem.quantity
        );
        this.items[existingIndex].updatedAt = new Date().toISOString();
      } else {
        // Add new item
        this.items.push({
          ...newItem,
          addedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    this.saveToStorage();
    this.notifyListeners('merge');
  }

  /**
   * Export cart data
   * @returns {object} Cart data for backup
   */
  exportCart() {
    return {
      items: this.items,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
  }

  /**
   * Import cart data
   * @param {object} cartData - Cart data to import
   * @returns {boolean} True if import was successful
   */
  importCart(cartData) {
    try {
      if (!cartData || !Array.isArray(cartData.items)) {
        throw new Error('Invalid cart data');
      }

      this.items = cartData.items;
      this.saveToStorage();
      this.notifyListeners('import');
      return true;

    } catch (error) {
      console.error('Failed to import cart:', error);
      return false;
    }
  }

  /**
   * Add event listener
   * @param {string} event - Event type
   * @param {Function} callback - Event callback
   */
  addEventListener(event, callback) {
    this.listeners.add({ event, callback });
  }

  /**
   * Remove event listener
   * @param {string} event - Event type
   * @param {Function} callback - Event callback
   */
  removeEventListener(event, callback) {
    this.listeners.forEach(listener => {
      if (listener.event === event && listener.callback === callback) {
        this.listeners.delete(listener);
      }
    });
  }

  /**
   * Notify all listeners of an event
   * @param {string} event - Event type
   * @param {*} data - Event data
   */
  notifyListeners(event, data = null) {
    this.listeners.forEach(listener => {
      if (listener.event === event || listener.event === '*') {
        try {
          listener.callback(event, data);
        } catch (error) {
          console.error('Error in cart event listener:', error);
        }
      }
    });
  }

  /**
   * Save cart to localStorage
   */
  saveToStorage() {
    try {
      const cartData = {
        items: this.items,
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem(CART_CONFIG.STORAGE_KEY, JSON.stringify(cartData));
    } catch (error) {
      console.error('Failed to save cart to storage:', error);
    }
  }

  /**
   * Load cart from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(CART_CONFIG.STORAGE_KEY);
      if (!stored) {
        this.items = [];
        return;
      }

      const cartData = JSON.parse(stored);

      // Validate cart data
      if (!Array.isArray(cartData.items)) {
        throw new Error('Invalid cart data structure');
      }

      // Clean up old cart data (older than 30 days)
      const savedDate = new Date(cartData.savedAt);
      const now = new Date();
      const daysDiff = (now - savedDate) / (1000 * 60 * 60 * 24);

      if (daysDiff > 30) {
        console.log('Cart data expired, clearing...');
        this.items = [];
        this.saveToStorage();
        return;
      }

      this.items = cartData.items;

    } catch (error) {
      console.error('Failed to load cart from storage:', error);
      this.items = [];
      this.saveToStorage(); // Clear corrupted data
    }
  }

  /**
   * Get storage usage information
   * @returns {object} Storage info
   */
  getStorageInfo() {
    try {
      const stored = localStorage.getItem(CART_CONFIG.STORAGE_KEY);
      if (!stored) {
        return { size: 0, items: 0, lastSaved: null };
      }

      const cartData = JSON.parse(stored);

      return {
        size: new Blob([stored]).size, // Size in bytes
        items: cartData.items?.length || 0,
        lastSaved: cartData.savedAt || null,
      };

    } catch (error) {
      return { size: 0, items: 0, lastSaved: null, error: error.message };
    }
  }
}

// Cart Manager Class (handles UI and business logic)
class CartManager {
  constructor() {
    this.cart = new Cart();
    this.isInitialized = false;
  }

  /**
   * Initialize cart manager
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Validate cart on initialization
      await this.cart.validateCart();

      // Add event listeners
      this.cart.addEventListener('*', this.handleCartEvent.bind(this));

      this.isInitialized = true;

    } catch (error) {
      console.error('Failed to initialize cart manager:', error);
    }
  }

  /**
   * Handle cart events
   * @param {string} event - Event type
   * @param {*} data - Event data
   */
  handleCartEvent(event, data) {
    // Update UI components that depend on cart
    this.updateCartBadge();
    this.updateCartSidebar();

    // Show notifications for important events
    switch (event) {
      case 'add':
        this.showNotification('Item added to cart', 'success');
        break;
      case 'remove':
        this.showNotification('Item removed from cart', 'info');
        break;
      case 'clear':
        this.showNotification('Cart cleared', 'info');
        break;
      case 'validation':
        this.handleValidationResults(data);
        break;
    }
  }

  /**
   * Update cart badge
   */
  updateCartBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;

    const itemCount = this.cart.getItemCount();

    badge.textContent = itemCount;
    badge.classList.toggle('active', itemCount > 0);
  }

  /**
   * Update cart sidebar
   */
  async updateCartSidebar() {
    const cartItems = document.getElementById('cart-items');
    if (!cartItems) return;

    const items = await this.cart.getCartItems();
    const summary = await this.cart.getCartSummary();

    // Clear existing content
    cartItems.innerHTML = '';

    if (items.length === 0) {
      // Show empty cart message
      cartItems.innerHTML = `
        <div class="cart-empty">
          <p>Your cart is empty</p>
          <a href="#products" class="button--primary">Start Shopping</a>
        </div>
      `;
    } else {
      // Render cart items
      items.forEach(item => {
        const cartItemElement = this.createCartItemElement(item);
        cartItems.appendChild(cartItemElement);
      });
    }

    // Update summary
    this.updateCartSummary(summary);

    // Update checkout button
    const checkoutButton = document.getElementById('cart-checkout');
    if (checkoutButton) {
      checkoutButton.disabled = items.length === 0;
    }
  }

  /**
   * Create cart item element
   * @param {object} item - Cart item
   * @returns {HTMLElement} Cart item element
   */
  createCartItemElement(item) {
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    cartItem.dataset.productId = item.id;

    const imageUrl = item.product.images?.[0] || 'assets/images/placeholder-product.jpg';

    cartItem.innerHTML = `
      <div class="cart-item__image">
        <img src="${imageUrl}" alt="${item.product.name}" loading="lazy">
      </div>
      <div class="cart-item__details">
        <h3 class="cart-item__name">${item.product.name}</h3>
        <p class="cart-item__price">${utils.formatCurrency(item.product.price)}</p>
        <div class="cart-item__quantity">
          <div class="quantity-controls">
            <button class="quantity-controls__button" data-action="decrease" data-product-id="${item.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M19 13H5v-2h14v2z"/>
              </svg>
            </button>
            <input type="number" class="quantity-controls__input" value="${item.quantity}" min="1" max="${CART_CONFIG.MAX_QUANTITY}" data-product-id="${item.id}">
            <button class="quantity-controls__button" data-action="increase" data-product-id="${item.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div class="cart-item__actions">
        <button class="cart-item__remove" data-product-id="${item.id}" title="Remove item">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      </div>
    `;

    // Add event listeners
    this.addCartItemEventListeners(cartItem);

    return cartItem;
  }

  /**
   * Add event listeners to cart item
   * @param {HTMLElement} cartItem - Cart item element
   */
  addCartItemEventListeners(cartItem) {
    const productId = cartItem.dataset.productId;

    // Quantity controls
    cartItem.addEventListener('click', (e) => {
      const button = e.target.closest('.quantity-controls__button');
      if (button) {
        const action = button.dataset.action;
        this.handleQuantityChange(productId, action);
      }
    });

    // Quantity input
    const quantityInput = cartItem.querySelector('.quantity-controls__input');
    if (quantityInput) {
      quantityInput.addEventListener('change', (e) => {
        const newQuantity = parseInt(e.target.value) || 1;
        this.handleQuantityUpdate(productId, newQuantity);
      });
    }

    // Remove button
    const removeButton = cartItem.querySelector('.cart-item__remove');
    if (removeButton) {
      removeButton.addEventListener('click', () => {
        this.handleItemRemove(productId);
      });
    }
  }

  /**
   * Handle quantity change
   * @param {string} productId - Product ID
   * @param {string} action - Action (increase/decrease)
   */
  async handleQuantityChange(productId, action) {
    try {
      const currentQuantity = this.cart.getItemQuantity(productId);
      let newQuantity = currentQuantity;

      if (action === 'increase') {
        newQuantity = Math.min(currentQuantity + 1, CART_CONFIG.MAX_QUANTITY);
      } else if (action === 'decrease') {
        newQuantity = Math.max(currentQuantity - 1, 1);
      }

      if (newQuantity !== currentQuantity) {
        await this.cart.updateItemQuantity(productId, newQuantity);
      }
    } catch (error) {
      this.showNotification(error.message, 'error');
    }
  }

  /**
   * Handle quantity update from input
   * @param {string} productId - Product ID
   * @param {number} quantity - New quantity
   */
  async handleQuantityUpdate(productId, quantity) {
    try {
      await this.cart.updateItemQuantity(productId, quantity);
    } catch (error) {
      this.showNotification(error.message, 'error');
      // Reset input to current quantity
      const input = document.querySelector(`.quantity-controls__input[data-product-id="${productId}"]`);
      if (input) {
        input.value = this.cart.getItemQuantity(productId);
      }
    }
  }

  /**
   * Handle item removal
   * @param {string} productId - Product ID
   */
  handleItemRemove(productId) {
    if (confirm('Are you sure you want to remove this item from your cart?')) {
      this.cart.removeItem(productId);
    }
  }

  /**
   * Update cart summary
   * @param {object} summary - Cart summary
   */
  updateCartSummary(summary) {
    const subtotalElement = document.getElementById('cart-subtotal');
    const taxElement = document.getElementById('cart-tax');
    const totalElement = document.getElementById('cart-total');

    if (subtotalElement) {
      subtotalElement.textContent = utils.formatCurrency(summary.subtotal);
    }
    if (taxElement) {
      taxElement.textContent = utils.formatCurrency(summary.taxAmount);
    }
    if (totalElement) {
      totalElement.textContent = utils.formatCurrency(summary.total);
    }
  }

  /**
   * Handle validation results
   * @param {object} validation - Validation results
   */
  handleValidationResults(validation) {
    if (validation.invalidItems.length > 0) {
      this.showNotification(
        `${validation.invalidItems.length} item(s) removed from cart (no longer available)`,
        'warning'
      );
    }

    if (validation.outOfStockItems.length > 0) {
      this.showNotification(
        `${validation.outOfStockItems.length} item(s) removed from cart (out of stock)`,
        'warning'
      );
    }

    if (validation.updatedItems.length > 0) {
      this.showNotification(
        `Quantities updated for ${validation.updatedItems.length} item(s) due to stock limitations`,
        'info'
      );
    }
  }

  /**
   * Show notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, warning, info)
   */
  showNotification(message, type = 'info') {
    // Simple notification implementation
    // In a real app, you might use a more sophisticated notification system
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  /**
   * Get cart instance
   * @returns {Cart} Cart instance
   */
  getCart() {
    return this.cart;
  }
}

// Create singleton instance
const cartManager = new CartManager();

// Export the classes and instances
export { Cart, CartManager, cartManager };
export default cartManager;