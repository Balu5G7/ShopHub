// ============== Navigation ==============
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    window.scrollTo(0, 0);

    // Close mobile menu
    document.querySelector('.nav-links').classList.remove('show');

    switch (page) {
        case 'home':
            loadProducts();
            loadCategories();
            break;
        case 'cart':
            loadCart();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'login':
            updateAuthUI();
            break;
    }
}

function toggleMobileMenu() {
    document.querySelector('.nav-links').classList.toggle('show');
}

// ============== Toast Notifications ==============
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============== Auth UI ==============
function updateAuthUI() {
    const authLink = document.getElementById('authLink');
    const user = getUser();

    if (user) {
        authLink.innerHTML = `<i class="fas fa-user"></i> ${user.name}`;
        authLink.onclick = () => showUserMenu();
    } else {
        authLink.innerHTML = `<i class="fas fa-user"></i> Login`;
        authLink.onclick = () => showPage('login');
    }
}

function showUserMenu() {
    const user = getUser();
    if (!user) return;

    // Simple dropdown with user options
    const choice = confirm(`Logged in as ${user.name}\n\nClick OK to view orders\nClick Cancel to logout`);
    if (choice) {
        showPage('orders');
    } else {
        logout();
        updateAuthUI();
        updateCartCount();
        showPage('home');
        showToast('Logged out successfully', 'success');
    }
}

// ============== Auth Form ==============
let isLoginMode = true;

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('authTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const toggleText = document.getElementById('authToggleText');
    const toggleLink = document.getElementById('authToggleLink');
    const nameGroup = document.getElementById('authName').parentElement;

    if (isLoginMode) {
        title.textContent = 'Login';
        submitBtn.textContent = 'Login';
        toggleText.textContent = "Don't have an account?";
        toggleLink.textContent = 'Register';
        nameGroup.style.display = 'none';
    } else {
        title.textContent = 'Register';
        submitBtn.textContent = 'Register';
        toggleText.textContent = 'Already have an account?';
        toggleLink.textContent = 'Login';
        nameGroup.style.display = 'block';
    }

    document.getElementById('authError').classList.remove('show');
}

async function handleAuth() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value.trim();
    const errorEl = document.getElementById('authError');

    errorEl.classList.remove('show');

    if (!email || !password) {
        errorEl.textContent = 'Please fill in all required fields';
        errorEl.classList.add('show');
        return;
    }

    if (!isLoginMode && !name) {
        errorEl.textContent = 'Please enter your name';
        errorEl.classList.add('show');
        return;
    }

    try {
        if (isLoginMode) {
            await login(email, password);
            showToast('Logged in successfully!', 'success');
        } else {
            await register(name, email, password);
            showToast('Account created successfully!', 'success');
        }

        updateAuthUI();
        updateCartCount();
        showPage('home');
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.add('show');
    }
}

// ============== Products ==============
let currentCategory = '';
let currentSearch = '';

async function loadProducts() {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '<div class="loading">Loading products...</div>';

    try {
        const params = {};
        if (currentCategory) params.category = currentCategory;
        if (currentSearch) params.search = currentSearch;

        const products = await getProducts(params);

        if (products.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1">
                    <i class="fas fa-box-open"></i>
                    <h3>No products found</h3>
                    <p>Try adjusting your search or filter</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = products.map(product => `
            <div class="product-card" onclick="showProductDetail(${product.id})">
                <img src="${product.image || 'https://via.placeholder.com/400x300?text=No+Image'}" 
                     alt="${product.name}"
                     onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
                <div class="product-card-body">
                    <span class="category-tag">${product.category}</span>
                    <h3>${product.name}</h3>
                    <div class="price">$${product.price.toFixed(2)}</div>
                    <div class="stock-info ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                        ${product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Error loading products</h3>
                <p>${err.message}</p>
            </div>
        `;
    }
}

async function loadCategories() {
    const container = document.getElementById('categoryList');

    try {
        const categories = await getCategories();
        container.innerHTML = categories.map(cat => `
            <button class="category-btn" onclick="filterByCategory('${cat}')">${cat}</button>
        `).join('');
    } catch (err) {
        console.error('Failed to load categories:', err);
    }
}

function filterByCategory(category) {
    currentCategory = category;
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    if (category) {
        event.target.classList.add('active');
    } else {
        document.querySelector('.category-btn:first-child').classList.add('active');
    }
    loadProducts();
}

function handleSearch(event) {
    if (event && event.key && event.key !== 'Enter') return;
    currentSearch = document.getElementById('searchInput').value.trim();
    loadProducts();
}

async function showProductDetail(id) {
    showPage('product');
    const container = document.getElementById('productDetail');
    container.innerHTML = '<div class="loading">Loading product details...</div>';

    try {
        const product = await getProduct(id);
        const user = getUser();

        container.innerHTML = `
            <img src="${product.image || 'https://via.placeholder.com/600x400?text=No+Image'}" 
                 alt="${product.name}"
                 onerror="this.src='https://via.placeholder.com/600x400?text=No+Image'">
            <div class="product-detail-info">
                <span class="category-tag">${product.category}</span>
                <h1>${product.name}</h1>
                <div class="price">$${product.price.toFixed(2)}</div>
                <p class="description">${product.description}</p>
                <div class="stock-info ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                    <strong>${product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}</strong>
                </div>
                ${product.stock > 0 ? `
                    <div class="quantity-control">
                        <label>Quantity:</label>
                        <input type="number" id="detailQty" value="1" min="1" max="${product.stock}">
                    </div>
                    <button class="btn btn-primary" onclick="addToCartFromDetail(${product.id})">
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                ` : `
                    <button class="btn btn-secondary" disabled>
                        <i class="fas fa-times"></i> Out of Stock
                    </button>
                `}
                ${!user ? '<p style="margin-top: 16px; color: var(--gray); font-size: 0.9rem;"><i class="fas fa-info-circle"></i> Please <a href="#" onclick="showPage(\'login\')" style="color: var(--primary);">login</a> to add items to cart.</p>' : ''}
            </div>
        `;
    } catch (err) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Error loading product</h3>
                <p>${err.message}</p>
            </div>
        `;
    }
}

async function addToCartFromDetail(productId) {
    if (!isAuthenticated()) {
        showToast('Please login to add items to cart', 'error');
        showPage('login');
        return;
    }

    const qty = parseInt(document.getElementById('detailQty').value) || 1;

    try {
        await addToCart(productId, qty);
        showToast('Added to cart!', 'success');
        updateCartCount();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ============== Cart ==============
async function updateCartCount() {
    const badge = document.getElementById('cartCount');
    if (!isAuthenticated()) {
        badge.textContent = '0';
        return;
    }

    try {
        const items = await getCart();
        const count = items.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = count;
    } catch (err) {
        badge.textContent = '0';
    }
}

async function loadCart() {
    const container = document.getElementById('cartContent');

    if (!isAuthenticated()) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart"></i>
                <h3>Please login to view your cart</h3>
                <p>You need to be logged in to add items to your cart</p>
                <button class="btn btn-primary" onclick="showPage('login')" style="margin-top: 16px;">
                    <i class="fas fa-user"></i> Login
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = '<div class="loading">Loading cart...</div>';

    try {
        const items = await getCart();

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-shopping-cart"></i>
                    <h3>Your cart is empty</h3>
                    <p>Browse our products and add items to your cart</p>
                    <button class="btn btn-primary" onclick="showPage('home')" style="margin-top: 16px;">
                        <i class="fas fa-store"></i> Start Shopping
                    </button>
                </div>
            `;
            return;
        }

        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shipping = subtotal >= 50 ? 0 : 5.99;
        const total = subtotal + shipping;

        container.innerHTML = `
            <div class="cart-items">
                ${items.map(item => `
                    <div class="cart-item">
                        <img src="${item.image || 'https://via.placeholder.com/80?text=No+Image'}" 
                             alt="${item.name}"
                             onerror="this.src='https://via.placeholder.com/80?text=No+Image'">
                        <div class="cart-item-info">
                            <h4>${item.name}</h4>
                            <div class="item-price">$${(item.price * item.quantity).toFixed(2)}</div>
                        </div>
                        <div class="cart-item-actions">
                            <button onclick="updateCartQty(${item.id}, ${item.quantity - 1})">-</button>
                            <span>${item.quantity}</span>
                            <button onclick="updateCartQty(${item.id}, ${item.quantity + 1})">+</button>
                            <button class="remove-btn" onclick="removeCartItem(${item.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="cart-summary">
                <h3>Order Summary</h3>
                <div class="cart-summary-row">
                    <span>Subtotal</span>
                    <span>$${subtotal.toFixed(2)}</span>
                </div>
                <div class="cart-summary-row">
                    <span>Shipping</span>
                    <span>${shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
                </div>
                <div class="cart-summary-row total">
                    <span>Total</span>
                    <span>$${total.toFixed(2)}</span>
                </div>
                <div class="cart-actions">
                    <button class="btn btn-primary" onclick="showPage('checkout')">
                        <i class="fas fa-credit-card"></i> Proceed to Checkout
                    </button>
                    <button class="btn btn-secondary" onclick="showPage('home')">
                        <i class="fas fa-store"></i> Continue Shopping
                    </button>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Error loading cart</h3>
                <p>${err.message}</p>
            </div>
        `;
    }
}

async function updateCartQty(itemId, newQty) {
    if (newQty <= 0) {
        await removeCartItem(itemId);
        return;
    }

    try {
        await updateCartItem(itemId, newQty);
        loadCart();
        updateCartCount();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function removeCartItem(itemId) {
    try {
        await removeFromCart(itemId);
        loadCart();
        updateCartCount();
        showToast('Item removed from cart', 'info');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ============== Checkout ==============
async function loadCheckoutSummary() {
    const container = document.getElementById('checkoutSummary');

    if (!isAuthenticated()) {
        showPage('login');
        return;
    }

    try {
        const items = await getCart();

        if (items.length === 0) {
            showToast('Your cart is empty', 'error');
            showPage('cart');
            return;
        }

        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shipping = subtotal >= 50 ? 0 : 5.99;
        const total = subtotal + shipping;

        container.innerHTML = `
            <h3>Order Summary</h3>
            ${items.map(item => `
                <div class="checkout-item">
                    <span>${item.name} × ${item.quantity}</span>
                    <span>$${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            `).join('')}
            <div class="checkout-item" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--gray-light);">
                <span>Subtotal</span>
                <span>$${subtotal.toFixed(2)}</span>
            </div>
            <div class="checkout-item">
                <span>Shipping</span>
                <span>${shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
            </div>
            <div class="checkout-total">
                <span>Total</span>
                <span>$${total.toFixed(2)}</span>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<p style="color: var(--danger);">${err.message}</p>`;
    }
}

async function placeOrder() {
    const address = document.getElementById('shippingAddress').value.trim();

    if (!address) {
        showToast('Please enter a shipping address', 'error');
        return;
    }

    try {
        const order = await createOrder(address);
        showToast('Order placed successfully!', 'success');
        updateCartCount();
        showPage('orders');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ============== Orders ==============
async function loadOrders() {
    const container = document.getElementById('ordersContent');

    if (!isAuthenticated()) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box"></i>
                <h3>Please login to view your orders</h3>
                <p>You need to be logged in to see your order history</p>
                <button class="btn btn-primary" onclick="showPage('login')" style="margin-top: 16px;">
                    <i class="fas fa-user"></i> Login
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = '<div class="loading">Loading orders...</div>';

    try {
        const orders = await getOrders();

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h3>No orders yet</h3>
                    <p>Start shopping to see your orders here</p>
                    <button class="btn btn-primary" onclick="showPage('home')" style="margin-top: 16px;">
                        <i class="fas fa-store"></i> Start Shopping
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="orders-list">
                ${orders.map(order => `
                    <div class="order-card">
                        <div class="order-header">
                            <span class="order-id">Order #${order.id}</span>
                            <span class="order-status ${order.status}">${order.status}</span>
                        </div>
                        <div class="order-items">
                            ${order.items.map(item => `
                                <div class="order-item">
                                    <span>${item.name} × ${item.quantity}</span>
                                    <span>$${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="order-total">
                            <span>Total</span>
                            <span>$${order.total.toFixed(2)}</span>
                        </div>
                        <div style="margin-top: 8px; font-size: 0.8rem; color: var(--gray);">
                            <i class="fas fa-calendar"></i> ${new Date(order.created_at).toLocaleDateString()}
                            <i class="fas fa-map-marker-alt" style="margin-left: 12px;"></i> ${order.shipping_address}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Error loading orders</h3>
                <p>${err.message}</p>
            </div>
        `;
    }
}

// ============== Initialization ==============
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    updateCartCount();
    loadProducts();
    loadCategories();

    // Set initial auth form state
    toggleAuthMode();
});

// Override showPage for checkout to load summary
const originalShowPage = showPage;
showPage = function(page) {
    originalShowPage(page);
    if (page === 'checkout') {
        loadCheckoutSummary();
    }
};