// Sample products data
const PRODUCTS = [
  { id: 1, name: 'Wireless Headphones', price: 79.99, image: '🎧' },
  { id: 2, name: 'Smart Watch', price: 199.99, image: '⌚' },
  { id: 3, name: 'Laptop Stand', price: 29.99, image: '💻' },
  { id: 4, name: 'USB-C Cable', price: 14.99, image: '🔌' },
  { id: 5, name: 'Portable Charger', price: 49.99, image: '🔋' },
  { id: 6, name: 'Phone Case', price: 19.99, image: '📱' }
];

let cart = [];
let isOnline = navigator.onLine;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  registerServiceWorker();
  initializeApp();
  setupEventListeners();
  loadProductsFromCache();
});

// Register Service Worker
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('service-worker.js');
      console.log('Service Worker registered:', registration);
      updateStatus('App is ready to work offline!');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      updateStatus('Service Worker registration failed');
    }
  }
}

// Initialize app
function initializeApp() {
  // Check online status
  window.addEventListener('online', () => {
    isOnline = true;
    updateStatus('You are back online!');
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    updateStatus('You are offline. Browsing cached content.');
  });

  updateStatus(isOnline ? 'You are online' : 'You are offline');
  
  // Load products
  displayProducts();
  
  // Load cart from localStorage
  loadCart();
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('cart-btn').addEventListener('click', toggleCart);
  document.getElementById('notification-btn').addEventListener('click', requestNotificationPermission);
  document.getElementById('checkout-btn').addEventListener('click', handleCheckout);
}

// Display products
function displayProducts() {
  const productsContainer = document.getElementById('products');
  productsContainer.innerHTML = '';

  PRODUCTS.forEach(product => {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.innerHTML = `
      <div class="product-image">${product.image}</div>
      <h3>${product.name}</h3>
      <p class="price">$${product.price.toFixed(2)}</p>
      <button class="btn btn-primary" onclick="addToCart(${product.id})">Add to Cart</button>
    `;
    productsContainer.appendChild(productCard);
  });

  // Cache products
  if ('caches' in window) {
    caches.open('shophub-v1').then(cache => {
      cache.put('/products', new Response(JSON.stringify(PRODUCTS)));
    });
  }
}

// Load products from cache
async function loadProductsFromCache() {
  if ('caches' in window) {
    try {
      const cache = await caches.open('shophub-v1');
      const cachedProducts = await cache.match('/products');
      if (cachedProducts) {
        console.log('Products loaded from cache');
      }
    } catch (error) {
      console.error('Error loading from cache:', error);
    }
  }
}

// Add to cart
function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (product) {
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
      existingItem.quantity++;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    saveCart();
    updateCartCount();
    showNotification(`${product.name} added to cart!`);
  }
}

// Remove from cart
function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  updateCartCount();
  displayCart();
}

// Update cart count
function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById('cart-count').textContent = count;
}

// Display cart
function displayCart() {
  const cartItemsContainer = document.getElementById('cart-items');
  cartItemsContainer.innerHTML = '';

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p>Your cart is empty</p>';
    return;
  }

  cart.forEach(item => {
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    cartItem.innerHTML = `
      <div class="item-details">
        <span class="item-image">${item.image}</span>
        <div>
          <h4>${item.name}</h4>
          <p>$${item.price.toFixed(2)} x ${item.quantity}</p>
        </div>
      </div>
      <div class="item-actions">
        <p class="item-total">$${(item.price * item.quantity).toFixed(2)}</p>
        <button class="btn-small" onclick="removeFromCart(${item.id})">Remove</button>
      </div>
    `;
    cartItemsContainer.appendChild(cartItem);
  });

  // Update total
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  document.getElementById('total').textContent = total.toFixed(2);
}

// Toggle cart view
function toggleCart() {
  const cartSection = document.getElementById('cart-section');
  const isVisible = cartSection.style.display !== 'none';
  
  if (isVisible) {
    cartSection.style.display = 'none';
  } else {
    cartSection.style.display = 'block';
    displayCart();
  }
}

// Save cart to localStorage
function saveCart() {
  localStorage.setItem('shophub_cart', JSON.stringify(cart));
}

// Load cart from localStorage
function loadCart() {
  const savedCart = localStorage.getItem('shophub_cart');
  if (savedCart) {
    cart = JSON.parse(savedCart);
    updateCartCount();
  }
}

// Handle checkout
function handleCheckout() {
  if (cart.length === 0) {
    showNotification('Cart is empty!');
    return;
  }

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  showNotification(`Order placed! Total: $${total.toFixed(2)}`);
  
  // Clear cart
  cart = [];
  saveCart();
  updateCartCount();
  displayCart();

  // Request background sync if available
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then(registration => {
      registration.sync.register('sync-cart');
    });
  }
}

// Request notification permission
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showNotification('Notifications not supported');
    return;
  }

  if (Notification.permission === 'granted') {
    showNotification('Notifications already enabled!');
    return;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        showNotification('Notifications enabled!');
        sendTestNotification();
      }
    } catch (error) {
      console.error('Notification permission error:', error);
    }
  }
}

// Send test notification
function sendTestNotification() {
  if ('serviceWorker' in navigator && Notification.permission === 'granted') {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification('Welcome to ShopHub!', {
        body: 'You will now receive exclusive deals and offers.',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%232196F3" width="192" height="192"/><text x="50%" y="50%" font-size="100" fill="white" text-anchor="middle" dy=".3em">S</text></svg>',
        tag: 'welcome',
        requireInteraction: true
      });
    });
  }
}

// Show in-app notification
function showNotification(message) {
  // Simple toast notification
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

// Update status
function updateStatus(message) {
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.textContent = message;
  }
}