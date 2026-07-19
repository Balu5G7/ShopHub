const API_BASE = 'http://localhost:3001/api';

// Auth Token Management - All stored under shophub namespace
function getToken() {
    return localStorage.getItem('shophub_token');
}

function setToken(token) {
    localStorage.setItem('shophub_token', token);
}

function removeToken() {
    localStorage.removeItem('shophub_token');
}

function getUser() {
    const user = localStorage.getItem('shophub_user');
    return user ? JSON.parse(user) : null;
}

function setUser(user) {
    localStorage.setItem('shophub_user', JSON.stringify(user));
}

function removeUser() {
    localStorage.removeItem('shophub_user');
}

function isAuthenticated() {
    return !!getToken();
}

// API Request Helper
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (err) {
        if (err.message === 'Failed to fetch') {
            throw new Error('Unable to connect to server. Please make sure the server is running.');
        }
        throw err;
    }
}

// Auth API
async function login(email, password) {
    const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    setToken(data.token);
    setUser(data.user);
    return data.user;
}

async function register(name, email, password) {
    const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
    });
    setToken(data.token);
    setUser(data.user);
    return data.user;
}

async function getCurrentUser() {
    return await apiRequest('/auth/me');
}

function logout() {
    removeToken();
    removeUser();
}

// Products API
async function getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/products?${query}`);
}

async function getProduct(id) {
    return await apiRequest(`/products/${id}`);
}

async function getCategories() {
    return await apiRequest('/products/categories');
}

// Cart API
async function getCart() {
    return await apiRequest('/cart');
}

async function addToCart(productId, quantity = 1) {
    return await apiRequest('/cart', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, quantity })
    });
}

async function updateCartItem(itemId, quantity) {
    return await apiRequest(`/cart/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity })
    });
}

async function removeFromCart(itemId) {
    return await apiRequest(`/cart/${itemId}`, {
        method: 'DELETE'
    });
}

async function clearCart() {
    return await apiRequest('/cart', {
        method: 'DELETE'
    });
}

// Orders API
async function getOrders() {
    return await apiRequest('/orders');
}

async function getOrder(id) {
    return await apiRequest(`/orders/${id}`);
}

async function createOrder(shippingAddress) {
    return await apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify({ shipping_address: shippingAddress })
    });
}