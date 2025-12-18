/* ========================================
   REX FOOD DELIVERY - OPTIMIZED JAVASCRIPT
   Consolidated, performant, and secure
======================================== */

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately
 */
function debounce(func, wait, immediate) {
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
}

/**
 * Throttle function to limit function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Sanitize input to prevent XSS attacks
 * @param {string} input - Input to sanitize
 */
function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Format currency
 * @param {number} amount - Amount to format
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
}

/**
 * Show loading state
 * @param {HTMLElement} element - Element to show loading on
 */
function showLoading(element) {
  element.innerHTML = '<div class="loading"></div>';
  element.disabled = true;
}

/**
 * Hide loading state
 * @param {HTMLElement} element - Element to hide loading on
 * @param {string} originalContent - Original content to restore
 */
function hideLoading(element, originalContent) {
  element.innerHTML = originalContent;
  element.disabled = false;
}


// ========================================
// CART MANAGEMENT
// ========================================

class CartManager {
  constructor() {
    this.activeOrderId = this.loadActiveOrderId();
    this.orders = this.loadOrders();
    this.orderTemplates = this.loadOrderTemplates();
    this.listeners = [];
    this.init();
  }


  init() {
    this.initializeDefaultOrder();
    this.updateCartDisplay();
    this.bindEvents();
  }

  // Load active order ID from localStorage
  loadActiveOrderId() {
    try {
      return localStorage.getItem('rex-active-order-id') || 'default';
    } catch (error) {
      console.error('Error loading active order ID:', error);
      return 'default';
    }
  }

  // Load orders from localStorage
  loadOrders() {
    try {
      const ordersData = localStorage.getItem('rex-orders');
      return ordersData ? JSON.parse(ordersData) : {};
    } catch (error) {
      console.error('Error loading orders:', error);
      return {};
    }
  }

  // Load order templates from localStorage
  loadOrderTemplates() {
    try {
      const templatesData = localStorage.getItem('rex-order-templates');
      return templatesData ? JSON.parse(templatesData) : [];
    } catch (error) {
      console.error('Error loading order templates:', error);
      return [];
    }
  }

  // Save orders to localStorage
  saveOrders() {
    try {
      localStorage.setItem('rex-orders', JSON.stringify(this.orders));
      this.notifyListeners();
    } catch (error) {
      console.error('Error saving orders:', error);
    }
  }

  // Save active order ID to localStorage
  saveActiveOrderId() {
    try {
      localStorage.setItem('rex-active-order-id', this.activeOrderId);
    } catch (error) {
      console.error('Error saving active order ID:', error);
    }
  }

  // Save order templates to localStorage
  saveOrderTemplates() {
    try {
      localStorage.setItem('rex-order-templates', JSON.stringify(this.orderTemplates));
      this.notifyListeners();
    } catch (error) {
      console.error('Error saving order templates:', error);
    }
  }

  // Get current cart (for backward compatibility)
  get cart() {
    return this.orders[this.activeOrderId] || [];
  }

  // Set current cart (for backward compatibility)
  set cart(items) {
    this.orders[this.activeOrderId] = items;
    this.saveOrders();
    this.updateCartDisplay();
  }


  // Initialize default order if none exists
  initializeDefaultOrder() {
    if (!this.orders['default']) {
      this.orders['default'] = [];
      this.saveOrders();
    }
  }

  // Add item to cart
  addItem(item) {
    if (!item || !item.name || !item.price) {
      console.error('Invalid item data');
      return false;
    }

    const sanitizedItem = {
      name: sanitizeInput(item.name),
      price: parseFloat(item.price),
      quantity: parseInt(item.quantity) || 1,
      id: item.id || this.generateItemId(item.name)
    };

    const existingItem = this.cart.find(cartItem => 
      cartItem.name === sanitizedItem.name && 
      cartItem.price === sanitizedItem.price
    );

    if (existingItem) {
      existingItem.quantity += sanitizedItem.quantity;
    } else {
      this.cart.push(sanitizedItem);
    }


    this.saveOrders();
    this.updateCartDisplay();
    this.showNotification(`${sanitizedItem.name} added to cart!`, 'success');
    return true;
  }

  // Remove item from cart
  removeItem(index) {
    if (index >= 0 && index < this.cart.length) {
      const itemName = this.cart[index].name;

      this.cart.splice(index, 1);
      this.saveOrders();
      this.updateCartDisplay();
      this.showNotification(`${itemName} removed from cart!`, 'info');
    }
  }

  // Update item quantity
  updateQuantity(index, quantity) {
    if (index >= 0 && index < this.cart.length) {
      const newQuantity = parseInt(quantity);
      if (newQuantity > 0) {
        this.cart[index].quantity = newQuantity;
      } else {
        this.cart.splice(index, 1);

      }
      this.saveOrders();
      this.updateCartDisplay();
    }
  }

  // Get cart total
  getTotal() {
    return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  // Get cart item count
  getItemCount() {
    return this.cart.reduce((count, item) => count + item.quantity, 0);
  }


  // Clear cart
  clearCart() {
    this.cart = [];
    this.saveOrders();
    this.updateCartDisplay();
    this.showNotification('Cart cleared!', 'info');
  }


  // Update cart display
  updateCartDisplay() {
    const cartCountElement = document.querySelector('.cart-count');
    const cartItemsContainer = document.querySelector('.cart-items');
    const totalAmountElement = document.getElementById('total-amount');
    const orderBar = document.querySelector('.order-summary-bottom');

    if (cartCountElement) {
      cartCountElement.textContent = this.getItemCount();
    }

    if (cartItemsContainer) {
      this.renderCartItems(cartItemsContainer);
    }

    if (totalAmountElement) {
      totalAmountElement.textContent = this.getTotal().toFixed(2);
    }

    // Show/hide order summary bottom bar
    if (orderBar) {
      if (this.cart.length > 0) {
        orderBar.classList.add('show');
      } else {
        orderBar.classList.remove('show');
      }
    }
  }

  // Render cart items
  renderCartItems(container) {
    if (this.cart.length === 0) {
      container.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
      return;
    }

    container.innerHTML = this.cart.map((item, index) => `
      <div class="cart-item" data-index="${index}">
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <p>${formatCurrency(item.price)} x ${item.quantity}</p>
        </div>
        <div class="cart-item-controls">
          <button class="quantity-btn" data-action="decrease" data-index="${index}">-</button>
          <span class="quantity">${item.quantity}</span>
          <button class="quantity-btn" data-action="increase" data-index="${index}">+</button>
          <button class="remove-item" data-index="${index}">Remove</button>
        </div>
        <div class="cart-item-total">
          ${formatCurrency(item.price * item.quantity)}
        </div>
      </div>
    `).join('');
  }

  // Bind cart events
  bindEvents() {
    const cartContainer = document.querySelector('.cart-items');
    if (!cartContainer) return;

    cartContainer.addEventListener('click', (e) => {
      const target = e.target;
      const index = parseInt(target.dataset.index);

      if (target.classList.contains('remove-item')) {
        this.removeItem(index);
      } else if (target.classList.contains('quantity-btn')) {
        const action = target.dataset.action;
        const item = this.cart[index];
        if (item) {
          const newQuantity = action === 'increase' ? item.quantity + 1 : item.quantity - 1;
          this.updateQuantity(index, newQuantity);
        }
      }
    });
  }

  // Generate unique item ID
  generateItemId(name) {
    return `item-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
  }

  // Show notification
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add to page
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);

    // Remove after delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Event listeners
  onChange(callback) {
    this.listeners.push(callback);
  }


  notifyListeners() {
    this.listeners.forEach(callback => callback(this.cart));
  }

  // ========================================
  // MULTIPLE ORDERS FUNCTIONALITY
  // ========================================

  // Create a new order
  createOrder(name = null) {
    const orderId = name || this.generateOrderId();
    if (!this.orders[orderId]) {
      this.orders[orderId] = [];
      this.saveOrders();
      this.switchToOrder(orderId);
      this.showNotification(`Created new order: ${orderId}`, 'success');
    }
    return orderId;
  }

  // Switch to a different order
  switchToOrder(orderId) {
    if (this.orders[orderId]) {
      this.activeOrderId = orderId;
      this.saveActiveOrderId();
      this.updateCartDisplay();
      this.showNotification(`Switched to order: ${orderId}`, 'info');
    } else {
      this.showNotification(`Order not found: ${orderId}`, 'error');
    }
  }

  // Duplicate current order
  duplicateCurrentOrder() {
    const currentItems = [...this.cart];
    const newOrderId = this.generateOrderId('copy');
    this.orders[newOrderId] = currentItems;
    this.saveOrders();
    this.showNotification(`Duplicated order as: ${newOrderId}`, 'success');
    return newOrderId;
  }

  // Delete an order
  deleteOrder(orderId) {
    if (orderId === 'default') {
      this.showNotification('Cannot delete default order', 'error');
      return false;
    }
    
    if (this.orders[orderId]) {
      delete this.orders[orderId];
      this.saveOrders();
      
      // If we deleted the active order, switch to default
      if (this.activeOrderId === orderId) {
        this.switchToOrder('default');
      }
      
      this.showNotification(`Deleted order: ${orderId}`, 'info');
      return true;
    }
    return false;
  }

  // Get all order IDs
  getAllOrderIds() {
    return Object.keys(this.orders);
  }

  // Get order summary
  getOrderSummary(orderId = null) {
    const targetOrderId = orderId || this.activeOrderId;
    const items = this.orders[targetOrderId] || [];
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = items.reduce((count, item) => count + item.quantity, 0);
    
    return {
      orderId: targetOrderId,
      itemCount,
      total,
      items: [...items]
    };
  }

  // Rename order
  renameOrder(oldOrderId, newOrderId) {
    if (this.orders[oldOrderId] && !this.orders[newOrderId]) {
      this.orders[newOrderId] = this.orders[oldOrderId];
      delete this.orders[oldOrderId];
      this.saveOrders();
      
      // Update active order ID if needed
      if (this.activeOrderId === oldOrderId) {
        this.activeOrderId = newOrderId;
        this.saveActiveOrderId();
      }
      
      this.showNotification(`Renamed order to: ${newOrderId}`, 'success');
      return true;
    }
    return false;
  }

  // Generate unique order ID
  generateOrderId(prefix = 'order') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }

  // ========================================
  // ORDER TEMPLATES FUNCTIONALITY
  // ========================================

  // Save current order as template
  saveAsTemplate(templateName) {
    if (!templateName || templateName.trim() === '') {
      this.showNotification('Please enter a template name', 'error');
      return false;
    }

    const sanitizedName = sanitizeInput(templateName.trim());
    
    // Check if template already exists
    if (this.orderTemplates.find(t => t.name === sanitizedName)) {
      this.showNotification('Template with this name already exists', 'error');
      return false;
    }

    const template = {
      id: this.generateOrderId('template'),
      name: sanitizedName,
      items: [...this.cart],
      createdAt: new Date().toISOString(),
      total: this.getTotal(),
      itemCount: this.getItemCount()
    };

    this.orderTemplates.push(template);
    this.saveOrderTemplates();
    this.showNotification(`Saved template: ${sanitizedName}`, 'success');
    return template.id;
  }

  // Load template
  loadTemplate(templateId, targetOrderId = null) {
    const template = this.orderTemplates.find(t => t.id === templateId);
    if (!template) {
      this.showNotification('Template not found', 'error');
      return false;
    }

    const orderId = targetOrderId || this.activeOrderId;
    this.orders[orderId] = [...template.items];
    this.saveOrders();
    this.updateCartDisplay();
    this.showNotification(`Loaded template: ${template.name}`, 'success');
    return true;
  }

  // Delete template
  deleteTemplate(templateId) {
    const index = this.orderTemplates.findIndex(t => t.id === templateId);
    if (index !== -1) {
      const templateName = this.orderTemplates[index].name;
      this.orderTemplates.splice(index, 1);
      this.saveOrderTemplates();
      this.showNotification(`Deleted template: ${templateName}`, 'info');
      return true;
    }
    return false;
  }

  // Get all templates
  getAllTemplates() {
    return [...this.orderTemplates];
  }

  // Get template details
  getTemplate(templateId) {
    return this.orderTemplates.find(t => t.id === templateId);
  }

  // Update template
  updateTemplate(templateId, newName = null, newItems = null) {
    const template = this.orderTemplates.find(t => t.id === templateId);
    if (!template) {
      return false;
    }

    if (newName) {
      template.name = sanitizeInput(newName.trim());
    }

    if (newItems) {
      template.items = [...newItems];
      template.total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      template.itemCount = newItems.reduce((count, item) => count + item.quantity, 0);
    }

    template.updatedAt = new Date().toISOString();
    this.saveOrderTemplates();
    this.showNotification('Template updated successfully', 'success');
    return true;
  }

  // Duplicate template
  duplicateTemplate(templateId, newName = null) {
    const template = this.getTemplate(templateId);
    if (!template) {
      return false;
    }

    const newTemplate = {
      ...template,
      id: this.generateOrderId('template'),
      name: newName || `${template.name} (Copy)`,
      createdAt: new Date().toISOString()
    };

    this.orderTemplates.push(newTemplate);
    this.saveOrderTemplates();
    this.showNotification(`Duplicated template as: ${newTemplate.name}`, 'success');
    return newTemplate.id;
  }
}

// ========================================
// FORM VALIDATION
// ========================================

class FormValidator {
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePhone(phone) {
    const phoneRegex = /^[+]?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
  }

  static validatePassword(password) {
    return password.length >= 6;
  }

  static validateRequired(value) {
    return value && value.trim().length > 0;
  }

  static showFieldError(field, message) {
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }

    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    errorElement.style.color = 'var(--primary-color)';
    errorElement.style.fontSize = '0.9rem';
    errorElement.style.marginTop = '0.25rem';

    field.parentNode.appendChild(errorElement);
    field.classList.add('error');
  }

  static clearFieldError(field) {
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }
    field.classList.remove('error');
  }
}

// ========================================
// ORDER MANAGEMENT
// ========================================

class OrderManager {
  constructor(cartManager) {
    this.cartManager = cartManager;
    this.init();
  }

  init() {
    this.bindOrderForm();
  }


  bindOrderForm() {
    const orderForm = document.querySelector('.order-form');
    if (!orderForm) return;

    orderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.processOrder(orderForm);
    });

    // Real-time validation
    const inputs = orderForm.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => FormValidator.clearFieldError(input));
    });

    // Handle UPI field visibility
    const paymentSelect = orderForm.querySelector('#payment');
    const upiField = orderForm.querySelector('.upi-field');
    const upiInput = orderForm.querySelector('#upi-id');

    if (paymentSelect && upiField && upiInput) {
      paymentSelect.addEventListener('change', () => {
        if (paymentSelect.value === 'upi') {
          upiField.classList.remove('hidden');
          upiInput.setAttribute('required', 'required');
        } else {
          upiField.classList.add('hidden');
          upiInput.removeAttribute('required');
          upiInput.value = '';
          FormValidator.clearFieldError(upiInput);
        }
      });
    }
  }


  validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name || field.id;

    // Clear previous errors
    FormValidator.clearFieldError(field);

    // Required field validation
    if (field.hasAttribute('required') && !FormValidator.validateRequired(value)) {
      FormValidator.showFieldError(field, `${this.getFieldLabel(fieldName)} is required`);
      return false;
    }

    // Specific field validation
    switch (fieldName.toLowerCase()) {
      case 'email':
        if (value && !FormValidator.validateEmail(value)) {
          FormValidator.showFieldError(field, 'Please enter a valid email address');
          return false;
        }
        break;
      case 'phone':
        if (value && !FormValidator.validatePhone(value)) {
          FormValidator.showFieldError(field, 'Please enter a valid phone number');
          return false;
        }
        break;
      case 'password':
        if (value && !FormValidator.validatePassword(value)) {
          FormValidator.showFieldError(field, 'Password must be at least 6 characters long');
          return false;
        }
        break;
      case 'pincode':
        if (value && !/^[0-9]{6}$/.test(value)) {
          FormValidator.showFieldError(field, 'Please enter a valid 6-digit pin code');
          return false;
        }
        break;
      case 'upi-id':
        if (value && !this.validateUPI(value)) {
          FormValidator.showFieldError(field, 'Please enter a valid UPI ID (e.g., username@upi)');
          return false;
        }
        break;
    }

    return true;
  }

  validateUPI(upiId) {
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return upiRegex.test(upiId);
  }


  getFieldLabel(fieldName) {
    const labelMap = {
      'name': 'Name',
      'email': 'Email',
      'phone': 'Phone',
      'address': 'Address',
      'street': 'Street Address',
      'village': 'Village/Locality',
      'district': 'District',
      'state': 'State',
      'country': 'Country',
      'pincode': 'Pin Code',
      'upi-id': 'UPI ID',
      'password': 'Password',
      'payment': 'Payment Method'
    };
    return labelMap[fieldName.toLowerCase()] || fieldName;
  }


  async processOrder(form) {
    const formData = new FormData(form);
    const orderData = Object.fromEntries(formData.entries());

    // Build full address from individual fields
    const fullAddress = this.buildFullAddress(orderData);
    orderData.fullAddress = fullAddress;

    // Validate all fields
    const inputs = form.querySelectorAll('input, textarea, select');
    let isValid = true;

    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });

    if (!isValid) {
      this.showNotification('Please fix the errors above', 'error');
      return;
    }

    // Check if cart is empty
    if (this.cartManager.cart.length === 0) {
      this.showNotification('Your cart is empty!', 'error');
      return;
    }

    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    showLoading(submitButton);

    try {
      // Simulate order processing
      await this.simulateOrderProcessing(orderData);

      // Generate order ID
      const orderId = this.generateOrderId();

      // Show immediate thank you notification
      this.showImmediateThankYou(orderData.name);

      // Clear cart
      this.cartManager.clearCart();

      // Reset form
      form.reset();

      // Show detailed success modal after a short delay
      setTimeout(() => {
        this.showOrderSuccess(orderId, orderData);
      }, 2000);

    } catch (error) {
      console.error('Order processing error:', error);
      this.showNotification('Failed to process order. Please try again.', 'error');
    } finally {
      hideLoading(submitButton, originalText);
    }
  }

  buildFullAddress(orderData) {
    const addressParts = [];
    
    if (orderData.street) addressParts.push(orderData.street);
    if (orderData.village) addressParts.push(orderData.village);
    if (orderData.district) addressParts.push(orderData.district);
    if (orderData.state) addressParts.push(orderData.state);
    if (orderData.country) addressParts.push(orderData.country);
    if (orderData.pincode) addressParts.push(`Pin Code: ${orderData.pincode}`);
    
    return addressParts.join(', ');
  }

  simulateOrderProcessing(orderData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Order processed:', orderData);
        resolve();
      }, 2000);
    });
  }


  generateOrderId() {
    return `REX${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }

  showImmediateThankYou(customerName) {
    const notification = document.createElement('div');
    notification.className = 'thank-you-notification';
    notification.innerHTML = `
      <h3>🎉 Thank You, ${sanitizeInput(customerName)}! 🎉</h3>
      <p>Your order is being prepared with love!</p>
    `;

    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);

    // Hide notification after 2 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }



  showOrderSuccess(orderId, orderData) {
    const modal = document.createElement('div');
    modal.className = 'order-success-modal';
    
    // Build payment method display
    let paymentMethod = '';
    if (orderData.payment === 'upi') {
      paymentMethod = `UPI Payment (${sanitizeInput(orderData['upi-id'])})`;
    } else if (orderData.payment === 'card') {
      paymentMethod = 'Credit/Debit Card';
    } else if (orderData.payment === 'cash') {
      paymentMethod = 'Cash on Delivery';
    } else {
      paymentMethod = 'Payment method not specified';
    }
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>🎉 Order Confirmed! 🎉</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="thank-you-message">
            <h3>Thank You for Your Order!</h3>
            <p>Dear ${sanitizeInput(orderData.name)}, we appreciate your trust in REX Food Delivery!</p>
          </div>
          <div class="order-details">
            <p><strong>🍽️ Order ID:</strong> ${orderId}</p>
            <p><strong>👤 Customer Name:</strong> ${sanitizeInput(orderData.name)}</p>
            <p><strong>📍 Delivery Address:</strong></p>
            <div style="background: rgba(255,255,255,0.5); padding: var(--spacing-xs); border-radius: var(--radius-sm); margin: var(--spacing-xs) 0; font-size: 0.9rem;">
              ${sanitizeInput(orderData.fullAddress)}
            </div>
            <p><strong>💳 Payment Method:</strong> ${paymentMethod}</p>
            <p><strong>💰 Total Amount:</strong> ${formatCurrency(this.cartManager.getTotal())}</p>
            <p><strong>⏱️ Estimated Delivery:</strong> 30-45 minutes</p>
          </div>
          <div class="delivery-message">
            <p>🚚 We're preparing your delicious meal with love and care!</p>
            <p>💝 Thank you for choosing REX Food Delivery. Bon appétit!</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary modal-close">Continue Shopping</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Show modal
    setTimeout(() => modal.classList.add('show'), 100);

    // Close modal events
    const closeButtons = modal.querySelectorAll('.modal-close');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
      });
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
      }
    });
  }

  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 100);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }
}

// ========================================
// AUTHENTICATION
// ========================================

class AuthManager {
  constructor() {
    this.currentUser = this.loadUser();
    this.init();
  }

  init() {
    this.bindAuthForms();
    this.updateAuthUI();
  }

  loadUser() {
    try {
      const userData = localStorage.getItem('rex-user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error loading user:', error);
      return null;
    }
  }

  saveUser(userData) {
    try {
      localStorage.setItem('rex-user', JSON.stringify(userData));
      this.currentUser = userData;
      this.updateAuthUI();
    } catch (error) {
      console.error('Error saving user:', error);
    }
  }

  bindAuthForms() {
    // Login form
    const loginForm = document.querySelector('#login-form, .login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Signup form
    const signupForm = document.querySelector('#signup-form, .signup-form');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => this.handleSignup(e));
    }

    // Logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const credentials = Object.fromEntries(formData.entries());

    // Validate input
    if (!credentials.email || !credentials.password) {
      this.showNotification('Please fill in all fields', 'error');
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    showLoading(submitButton);

    try {
      // Simulate authentication
      await this.simulateLogin(credentials);

      // Create user session
      const userData = {
        email: credentials.email,
        name: credentials.email.split('@')[0],
        loginTime: new Date().toISOString()
      };

      this.saveUser(userData);
      this.showNotification('Login successful!', 'success');

      // Redirect to menu page
      setTimeout(() => {
        window.location.href = 'main.html';
      }, 1500);

    } catch (error) {
      console.error('Login error:', error);
      this.showNotification('Invalid credentials', 'error');
    } finally {
      hideLoading(submitButton, originalText);
    }
  }

  async handleSignup(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const userData = Object.fromEntries(formData.entries());

    // Validate input
    if (!userData.name || !userData.email || !userData.password) {
      this.showNotification('Please fill in all fields', 'error');
      return;
    }

    if (!FormValidator.validateEmail(userData.email)) {
      this.showNotification('Please enter a valid email address', 'error');
      return;
    }

    if (!FormValidator.validatePassword(userData.password)) {
      this.showNotification('Password must be at least 6 characters long', 'error');
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    showLoading(submitButton);

    try {
      // Simulate registration
      await this.simulateSignup(userData);

      this.showNotification('Account created successfully!', 'success');

      // Redirect to login page
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);

    } catch (error) {
      console.error('Signup error:', error);
      this.showNotification('Failed to create account', 'error');
    } finally {
      hideLoading(submitButton, originalText);
    }
  }

  simulateLogin(credentials) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate successful login for any credentials
        if (credentials.email && credentials.password) {
          resolve();
        } else {
          reject(new Error('Invalid credentials'));
        }
      }, 1500);
    });
  }

  simulateSignup(userData) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate successful registration
        if (userData.name && userData.email && userData.password) {
          resolve();
        } else {
          reject(new Error('Invalid data'));
        }
      }, 1500);
    });
  }

  logout() {
    localStorage.removeItem('rex-user');
    this.currentUser = null;
    this.updateAuthUI();
    this.showNotification('Logged out successfully', 'info');
    
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  }

  updateAuthUI() {
    const authLinks = document.querySelectorAll('.auth-link');
    const userDisplay = document.querySelector('.user-display');
    
    if (this.currentUser) {
      // User is logged in
      authLinks.forEach(link => {
        if (link.textContent.includes('Login')) {
          link.textContent = 'Logout';
          link.href = '#';
          link.classList.add('logout-btn');
        }
      });
      
      if (userDisplay) {
        userDisplay.textContent = `Welcome, ${this.currentUser.name}`;
      }
    } else {
      // User is not logged in
      authLinks.forEach(link => {
        if (link.classList.contains('logout-btn')) {
          link.textContent = 'Login';
          link.href = 'login.html';
          link.classList.remove('logout-btn');
        }
      });
      
      if (userDisplay) {
        userDisplay.textContent = '';
      }
    }
  }

  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 100);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }
}


// ========================================
// ORDER MANAGEMENT UI HANDLERS
// ========================================

class OrderManagementUI {
  constructor(cartManager) {
    this.cartManager = cartManager;
    this.init();
  }

  init() {
    this.bindEvents();
    this.updateDisplay();
  }

  bindEvents() {
    // Panel toggle
    const manageOrdersBtn = document.getElementById('manage-orders-btn');
    const orderPanel = document.getElementById('order-management-panel');
    const closePanelBtn = document.getElementById('close-panel-btn');

    if (manageOrdersBtn) {
      manageOrdersBtn.addEventListener('click', () => this.togglePanel());
    }

    if (closePanelBtn) {
      closePanelBtn.addEventListener('click', () => this.closePanel());
    }

    // Action buttons
    const createOrderBtn = document.getElementById('create-new-order-btn');
    const duplicateOrderBtn = document.getElementById('duplicate-order-btn');
    const saveTemplateBtn = document.getElementById('save-template-btn');
    const refreshTemplatesBtn = document.getElementById('refresh-templates-btn');

    if (createOrderBtn) {
      createOrderBtn.addEventListener('click', () => this.createNewOrder());
    }

    if (duplicateOrderBtn) {
      duplicateOrderBtn.addEventListener('click', () => this.duplicateCurrentOrder());
    }

    if (saveTemplateBtn) {
      saveTemplateBtn.addEventListener('click', () => this.showTemplateModal());
    }

    if (refreshTemplatesBtn) {
      refreshTemplatesBtn.addEventListener('click', () => this.updateTemplatesDisplay());
    }

    // Template modal events
    this.bindTemplateModalEvents();

    // Close modal on outside click
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.hideModal(e.target.id);
      }
    });
  }

  bindTemplateModalEvents() {
    const templateModal = document.getElementById('template-modal');
    const templateNameInput = document.getElementById('template-name');
    const saveTemplateConfirmBtn = document.getElementById('save-template-confirm-btn');
    const modalCloseButtons = document.querySelectorAll('.modal-close');

    // Save template
    if (saveTemplateConfirmBtn) {
      saveTemplateConfirmBtn.addEventListener('click', () => this.saveTemplate());
    }

    // Close modals
    modalCloseButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = btn.dataset.modal;
        if (modalId) {
          this.hideModal(modalId);
        }
      });
    });

    // Enter key for template name
    if (templateNameInput) {
      templateNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.saveTemplate();
        }
      });
    }
  }

  togglePanel() {
    const panel = document.getElementById('order-management-panel');
    if (panel) {
      panel.classList.toggle('show');
      if (panel.classList.contains('show')) {
        this.updateDisplay();
      }
    }
  }

  closePanel() {
    const panel = document.getElementById('order-management-panel');
    if (panel) {
      panel.classList.remove('show');
    }
  }

  updateDisplay() {
    this.updateCurrentOrderDisplay();
    this.updateOrdersList();
    this.updateTemplatesDisplay();
  }

  updateCurrentOrderDisplay() {
    const currentOrderName = document.getElementById('current-order-name');
    if (currentOrderName) {
      currentOrderName.textContent = this.cartManager.activeOrderId;
    }
  }

  updateOrdersList() {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;

    const orderIds = this.cartManager.getAllOrderIds();
    
    if (orderIds.length === 0) {
      ordersList.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center; padding: 1rem;">No orders found</p>';
      return;
    }

    ordersList.innerHTML = orderIds.map(orderId => {
      const summary = this.cartManager.getOrderSummary(orderId);
      const isActive = orderId === this.cartManager.activeOrderId;
      
      return `
        <div class="order-item ${isActive ? 'active' : ''}" data-order-id="${orderId}">
          <div class="order-info">
            <div class="order-name">${orderId}</div>
            <div class="order-details">
              ${summary.itemCount} items • ₹${summary.total.toFixed(2)}
              ${isActive ? ' • Active' : ''}
            </div>
          </div>
          <div class="order-actions">
            ${!isActive ? `
              <button class="btn-sm btn-primary" onclick="window.orderManagementUI.switchToOrder('${orderId}')">
                <i class="fas fa-arrow-right"></i>
              </button>
            ` : ''}
            ${orderId !== 'default' ? `
              <button class="btn-sm btn-danger" onclick="window.orderManagementUI.deleteOrder('${orderId}')">
                <i class="fas fa-trash"></i>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  updateTemplatesDisplay() {
    const templatesList = document.getElementById('templates-list');
    if (!templatesList) return;

    const templates = this.cartManager.getAllTemplates();
    
    if (templates.length === 0) {
      templatesList.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center; padding: 1rem;">No templates saved</p>';
      return;
    }

    templatesList.innerHTML = templates.map(template => `
      <div class="template-item" data-template-id="${template.id}">
        <div class="template-info">
          <div class="template-name">${template.name}</div>
          <div class="template-details">
            ${template.itemCount} items • ₹${template.total.toFixed(2)}
            <br>
            <small>Created: ${new Date(template.createdAt).toLocaleDateString()}</small>
          </div>
        </div>
        <div class="template-actions-list">
          <button class="btn-sm btn-success" onclick="window.orderManagementUI.loadTemplate('${template.id}')" title="Load Template">
            <i class="fas fa-download"></i>
          </button>
          <button class="btn-sm btn-secondary" onclick="window.orderManagementUI.duplicateTemplate('${template.id}')" title="Duplicate Template">
            <i class="fas fa-copy"></i>
          </button>
          <button class="btn-sm btn-danger" onclick="window.orderManagementUI.deleteTemplate('${template.id}')" title="Delete Template">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  createNewOrder() {
    const orderName = prompt('Enter name for the new order:');
    if (orderName && orderName.trim()) {
      this.cartManager.createOrder(orderName.trim());
      this.updateDisplay();
    }
  }

  duplicateCurrentOrder() {
    const newOrderId = this.cartManager.duplicateCurrentOrder();
    if (newOrderId) {
      this.updateDisplay();
    }
  }

  switchToOrder(orderId) {
    this.cartManager.switchToOrder(orderId);
    this.updateDisplay();
  }

  deleteOrder(orderId) {
    if (confirm(`Are you sure you want to delete order "${orderId}"?`)) {
      const success = this.cartManager.deleteOrder(orderId);
      if (success) {
        this.updateDisplay();
      }
    }
  }

  showTemplateModal() {
    const modal = document.getElementById('template-modal');
    const previewContainer = document.getElementById('template-items-preview');
    const templateNameInput = document.getElementById('template-name');
    
    if (!modal || !previewContainer || !templateNameInput) return;

    // Clear previous input
    templateNameInput.value = '';

    // Generate template name suggestion
    const currentOrderItems = this.cartManager.cart;
    if (currentOrderItems.length === 0) {
      this.cartManager.showNotification('Cannot save empty order as template', 'error');
      return;
    }

    const suggestedName = `Order_${new Date().toLocaleDateString()}`;
    templateNameInput.value = suggestedName;

    // Show preview
    previewContainer.innerHTML = currentOrderItems.map(item => `
      <div class="template-item-preview">
        <span class="template-item-name">${item.name}</span>
        <span class="template-item-details">₹${item.price} x ${item.quantity} = ₹${(item.price * item.quantity).toFixed(2)}</span>
      </div>
    `).join('');

    this.showModal('template-modal');
  }

  saveTemplate() {
    const templateNameInput = document.getElementById('template-name');
    if (!templateNameInput) return;

    const templateName = templateNameInput.value.trim();
    if (!templateName) {
      this.cartManager.showNotification('Please enter a template name', 'error');
      return;
    }

    const templateId = this.cartManager.saveAsTemplate(templateName);
    if (templateId) {
      this.hideModal('template-modal');
      this.updateTemplatesDisplay();
    }
  }

  loadTemplate(templateId) {
    const success = this.cartManager.loadTemplate(templateId);
    if (success) {
      this.updateDisplay();
    }
  }

  duplicateTemplate(templateId) {
    const newTemplateId = this.cartManager.duplicateTemplate(templateId);
    if (newTemplateId) {
      this.updateTemplatesDisplay();
    }
  }

  deleteTemplate(templateId) {
    if (confirm('Are you sure you want to delete this template?')) {
      const success = this.cartManager.deleteTemplate(templateId);
      if (success) {
        this.updateTemplatesDisplay();
      }
    }
  }

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('show');
    }
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show');
    }
  }
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  // Initialize managers
  window.cartManager = new CartManager();
  window.orderManager = new OrderManager(window.cartManager);
  window.authManager = new AuthManager();
  
  // Initialize order management UI
  window.orderManagementUI = new OrderManagementUI(window.cartManager);

  // Add to cart functionality
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('add-to-cart')) {
      e.preventDefault();
      
      const menuItem = e.target.closest('.menu-item');
      if (!menuItem) return;

      const itemName = menuItem.querySelector('h4')?.textContent;
      const itemPrice = menuItem.querySelector('.price')?.textContent.replace('₹', '').trim();

      if (itemName && itemPrice) {
        const itemData = {
          name: itemName,
          price: parseFloat(itemPrice),
          quantity: 1
        };

        window.cartManager.addItem(itemData);
      }
    }
  });

  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // Image lazy loading
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
          }
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }

  // Form auto-save (for better UX)
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('input', debounce(() => {
        const formData = new FormData(form);
        localStorage.setItem(`form-${form.id || 'default'}`, JSON.stringify(Object.fromEntries(formData.entries())));
      }, 1000));
    });

    // Load saved form data
    const savedData = localStorage.getItem(`form-${form.id || 'default'}`);
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        inputs.forEach(input => {
          if (data[input.name || input.id]) {
            input.value = data[input.name || input.id];
          }
        });
      } catch (error) {
        console.error('Error loading saved form data:', error);
      }
    }
  });

  // Performance monitoring
  if ('performance' in window) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
      }, 0);
    });
  }

  console.log('REX Food Delivery App initialized successfully!');
});

// ========================================
// EXPORT FOR MODULE USAGE
// ========================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CartManager,
    OrderManager,
    AuthManager,
    FormValidator,
    debounce,
    throttle,
    sanitizeInput,
    formatCurrency
  };
}
