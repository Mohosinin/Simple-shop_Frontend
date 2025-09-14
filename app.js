// API Configuration
const API_BASE_URL = 'https://simple-shop-backend.vercel.app/api';

class APIService {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('API Error Response:', data);
                throw new Error(data.message || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async getProducts() {
        return this.apiCall('/products');
    }

    async getProduct(id) {
        return this.apiCall(`/products/${id}`);
    }

    async createProduct(productData) {
        return this.apiCall('/products', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
    }

    async updateProduct(id, productData) {
        return this.apiCall(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(productData)
        });
    }

    async deleteProduct(id) {
        return this.apiCall(`/products/${id}`, {
            method: 'DELETE'
        });
    }

    async getOrders() {
        return this.apiCall('/orders');
    }

    async createOrder(orderData) {
        console.log('Creating order with data:', orderData);
        return this.apiCall('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    }

    async getOrder(id) {
        return this.apiCall(`/orders/${id}`);
    }

    async updateOrder(id, orderData) {
        return this.apiCall(`/orders/${id}`, {
            method: 'PUT',
            body: JSON.stringify(orderData)
        });
    }

    async deleteOrder(id) {
        return this.apiCall(`/orders/${id}`, {
            method: 'DELETE'
        });
    }
}

const api = new APIService();

class SimpleShop {
    constructor() {
        this.products = [];
        this.orders = [];
        this.cart = [];
        this.isConnected = false;

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        // Load products first
        await this.loadProducts();
        
        // Then validate and load cart
        await this.validateAndLoadCart();
        
        this.setupEventListeners();
        this.updateCartDisplay();
        this.navigateTo('products');
    }

    // Validate cart items against database products
    async validateAndLoadCart() {
        try {
            // Get cart from localStorage
            const savedCart = JSON.parse(localStorage.getItem('cart')) || [];
            
            // Validate each cart item against database
            const validatedCart = [];
            
            for (const cartItem of savedCart) {
                const productExists = this.products.find(p => p._id === cartItem.id);
                
                if (productExists) {
                    // Update cart item with latest product info
                    validatedCart.push({
                        id: productExists._id,
                        name: productExists.name,
                        price: productExists.price,
                        image: productExists.image,
                        quantity: cartItem.quantity
                    });
                } else {
                    console.log(`Removing invalid cart item: ${cartItem.name} (ID: ${cartItem.id})`);
                }
            }
            
            // Update cart with validated items
            this.cart = validatedCart;
            localStorage.setItem('cart', JSON.stringify(this.cart));
            
            if (savedCart.length !== validatedCart.length) {
                this.showSuccess('Cart updated - removed items that are no longer available');
            }
            
        } catch (error) {
            console.error('Error validating cart:', error);
            // Reset cart on error
            this.cart = [];
            localStorage.removeItem('cart');
        }
    }

    setupEventListeners() {
        // Navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.getAttribute('data-page');
                this.navigateTo(page);
            });
        });

        // Category filter
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => this.filterProducts(e.target.value));
        }

        // Add product form
        const addProductForm = document.getElementById('add-product-form');
        if (addProductForm) {
            addProductForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitAddProductForm();
            });

            const imageInput = addProductForm.querySelector('#product-image');
            if (imageInput) {
                imageInput.addEventListener('input', function() {
                    SimpleShop.updateImagePreview(this.value);
                });
            }
        }

        // Checkout form
        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCheckout(e);
            });
        }

        // Admin tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = e.target.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });

        // Modal close on background click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.add('hidden');
            }
        });

        this.setupAdminEventListeners();
    }

    setupAdminEventListeners() {
        const productSearch = document.getElementById('product-search');
        if (productSearch) {
            productSearch.addEventListener('input', (e) => this.searchProducts(e.target.value));
        }

        const categoryFilterAdmin = document.getElementById('category-filter-admin');
        if (categoryFilterAdmin) {
            categoryFilterAdmin.addEventListener('change', (e) => this.filterAdminProducts(e.target.value));
        }

        const orderSearch = document.getElementById('order-search');
        if (orderSearch) {
            orderSearch.addEventListener('input', (e) => this.searchOrders(e.target.value));
        }

        const orderStatusFilter = document.getElementById('order-status-filter');
        if (orderStatusFilter) {
            orderStatusFilter.addEventListener('change', (e) => this.filterOrdersByStatus(e.target.value));
        }

        const editProductForm = document.getElementById('edit-product-form');
        if (editProductForm) {
            editProductForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateProduct();
            });
        }
    }

    static updateImagePreview(url) {
        let preview = document.getElementById('image-preview');
        if (!preview) {
            preview = document.createElement('div');
            preview.id = 'image-preview';
            preview.className = 'image-preview';
            const parent = document.getElementById('product-image');
            if (parent && parent.parentNode) {
                parent.parentNode.appendChild(preview);
            }
        }
        preview.innerHTML = url ? `<img src="${url}" alt="Preview">` : '';
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        const activeContent = document.getElementById(`${tabName}-tab`);

        if (activeBtn) activeBtn.classList.add('active');
        if (activeContent) activeContent.classList.add('active');

        switch (tabName) {
            case 'dashboard':
                this.loadDashboardStats();
                this.loadRecentOrders();
                break;
            case 'manage-products':
                this.loadAdminProducts();
                break;
            case 'manage-orders':
                this.loadOrders();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
        }
    }

    async navigateTo(page) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`[data-page="${page}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) targetPage.classList.add('active');

        switch (page) {
            case 'products': 
                await this.loadProducts(); 
                break;
            case 'cart': 
                await this.validateAndLoadCart();
                this.displayCart(); 
                break;
            case 'checkout': 
                await this.validateAndLoadCart();
                this.displayCheckout(); 
                break;
            case 'admin': 
                await this.loadAdminDashboard();
                break;
        }
    }

    async loadAdminDashboard() {
        await this.loadDashboardStats();
        await this.loadRecentOrders();
    }

    async loadDashboardStats() {
        try {
            const [productsResponse, ordersResponse] = await Promise.all([
                api.getProducts(),
                api.getOrders()
            ]);

            const products = productsResponse.data || [];
            const orders = ordersResponse.data || [];

            const totalProducts = products.length;
            const totalOrders = orders.length;
            const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
            const lowStockCount = products.filter(p => p.stock < 5).length;

            const totalProductsEl = document.getElementById('total-products');
            const totalOrdersEl = document.getElementById('total-orders');
            const totalRevenueEl = document.getElementById('total-revenue');
            const lowStockCountEl = document.getElementById('low-stock-count');

            if (totalProductsEl) totalProductsEl.textContent = totalProducts;
            if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
            if (totalRevenueEl) totalRevenueEl.textContent = `$${totalRevenue.toFixed(2)}`;
            if (lowStockCountEl) lowStockCountEl.textContent = lowStockCount;

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    async loadRecentOrders() {
        try {
            const response = await api.getOrders();
            const orders = response.data || [];
            const recentOrders = orders.slice(0, 5);

            const container = document.getElementById('recent-orders');
            if (!container) return;

            if (recentOrders.length === 0) {
                container.innerHTML = '<p>No recent orders</p>';
                return;
            }

            let html = '';
            recentOrders.forEach(order => {
                const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString();
                html += `
                    <div class="recent-order-item">
                        <div class="order-info">
                            <strong>Order #${order._id.substring(0, 8)}</strong>
                            <span>${order.customerName}</span>
                            <span>${orderDate}</span>
                        </div>
                        <div class="order-amount">$${order.totalAmount.toFixed(2)}</div>
                        <div class="order-status status-${order.status || 'pending'}">${order.status || 'pending'}</div>
                    </div>
                `;
            });
            container.innerHTML = html;

        } catch (error) {
            console.error('Error loading recent orders:', error);
        }
    }

    async loadProducts(category = 'all') {
        try {
            const response = await api.getProducts();
            this.products = category === 'all' ? response.data : response.data.filter(p => p.category === category);
            this.displayProducts();
            
            // Validate cart after loading products
            await this.validateAndLoadCart();
            this.updateCartDisplay();
        } catch (error) {
            this.showError('Failed to load products. Please try again.');
            console.error(error);
        }
    }

    displayProducts() {
        const grid = document.getElementById('products-grid');
        if (!grid) return;

        grid.innerHTML = '';
        this.products.forEach(product => {
            const card = this.createProductCard(product);
            grid.appendChild(card);
        });
    }

    filterProducts(category) {
        this.loadProducts(category);
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card fade-in';
        card.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-price">$${product.price.toFixed(2)}</div>
                <p class="product-description">${product.description}</p>
                <div class="product-meta">
                    <span class="product-category">${product.category}</span>
                    <span class="product-stock">Stock: ${product.stock}</span>
                </div>
                <button class="btn btn--primary btn--full-width" onclick="window.shop.addToCart('${product._id}')">
                    Add to Cart
                </button>
            </div>
        `;
        return card;
    }

    async loadAdminProducts() {
        const container = document.getElementById('admin-products');
        if (!container) return;

        if (this.products.length === 0) {
            container.innerHTML = '<p>No products available. Add some products first.</p>';
            return;
        }

        let html = '';
        this.products.forEach(product => {
            const stockStatus = product.stock < 5 ? 'low-stock' : product.stock < 10 ? 'medium-stock' : 'good-stock';
            html += `
                <div class="admin-product-item fade-in">
                    <img src="${product.image}" alt="${product.name}" class="admin-product-image">
                    <div class="admin-product-info">
                        <h4>${product.name}</h4>
                        <div class="admin-product-price">$${product.price.toFixed(2)}</div>
                        <div class="admin-product-meta">
                            Category: ${product.category} | 
                            <span class="stock-status ${stockStatus}">Stock: ${product.stock}</span>
                        </div>
                    </div>
                    <div class="admin-product-actions">
                        <button class="btn btn--secondary btn--sm" onclick="window.shop.editProduct('${product._id}')">Edit</button>
                        <button class="delete-btn btn--sm" onclick="window.shop.deleteProduct('${product._id}')">Delete</button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    searchProducts(query) {
        const filteredProducts = this.products.filter(product => 
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            product.description.toLowerCase().includes(query.toLowerCase()) ||
            product.category.toLowerCase().includes(query.toLowerCase())
        );
        this.displayFilteredProducts(filteredProducts);
    }

    filterAdminProducts(category) {
        const filteredProducts = category === 'all' 
            ? this.products 
            : this.products.filter(product => product.category === category);
        this.displayFilteredProducts(filteredProducts);
    }

    displayFilteredProducts(products) {
        const container = document.getElementById('admin-products');
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = '<p>No products found matching your criteria.</p>';
            return;
        }

        let html = '';
        products.forEach(product => {
            const stockStatus = product.stock < 5 ? 'low-stock' : product.stock < 10 ? 'medium-stock' : 'good-stock';
            html += `
                <div class="admin-product-item fade-in">
                    <img src="${product.image}" alt="${product.name}" class="admin-product-image">
                    <div class="admin-product-info">
                        <h4>${product.name}</h4>
                        <div class="admin-product-price">$${product.price.toFixed(2)}</div>
                        <div class="admin-product-meta">
                            Category: ${product.category} | 
                            <span class="stock-status ${stockStatus}">Stock: ${product.stock}</span>
                        </div>
                    </div>
                    <div class="admin-product-actions">
                        <button class="btn btn--secondary btn--sm" onclick="window.shop.editProduct('${product._id}')">Edit</button>
                        <button class="delete-btn btn--sm" onclick="window.shop.deleteProduct('${product._id}')">Delete</button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    editProduct(productId) {
        const product = this.products.find(p => p._id === productId);
        if (!product) return;

        document.getElementById('edit-product-id').value = product._id;
        document.getElementById('edit-product-name').value = product.name;
        document.getElementById('edit-product-price').value = product.price;
        document.getElementById('edit-product-stock').value = product.stock;
        document.getElementById('edit-product-description').value = product.description;
        document.getElementById('edit-product-category').value = product.category;
        document.getElementById('edit-product-image').value = product.image;

        document.getElementById('edit-product-modal').classList.remove('hidden');
    }

    async updateProduct() {
        const productId = document.getElementById('edit-product-id').value;
        const productData = {
            name: document.getElementById('edit-product-name').value,
            price: parseFloat(document.getElementById('edit-product-price').value),
            stock: parseInt(document.getElementById('edit-product-stock').value),
            description: document.getElementById('edit-product-description').value,
            category: document.getElementById('edit-product-category').value,
            image: document.getElementById('edit-product-image').value
        };

        this.showLoading('Updating product...');
        try {
            await api.updateProduct(productId, productData);
            
            const productIndex = this.products.findIndex(p => p._id === productId);
            if (productIndex !== -1) {
                this.products[productIndex] = { ...this.products[productIndex], ...productData };
            }
            
            this.loadAdminProducts();
            this.displayProducts();
            this.closeModal('edit-product-modal');
            this.showSuccess('Product updated successfully!');
        } catch (error) {
            this.showError('Failed to update product. Please try again.');
            console.error(error);
        } finally {
            this.hideLoading();
        }
    }

    async loadOrders() {
        try {
            const response = await api.getOrders();
            this.orders = response.data || [];
            this.displayOrders();
        } catch (error) {
            console.error('Error loading orders:', error);
            this.showError('Failed to load orders');
        }
    }

    displayOrders(ordersToDisplay = null) {
        const container = document.getElementById('admin-orders');
        if (!container) return;

        const orders = ordersToDisplay || this.orders || [];

        if (orders.length === 0) {
            container.innerHTML = '<p>No orders found.</p>';
            return;
        }

        let html = '';
        orders.forEach(order => {
            const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString();
            const statusClass = `status-${order.status || 'pending'}`;
            
            html += `
                <div class="admin-order-item fade-in">
                    <div class="order-header">
                        <div class="order-id">Order #${order._id.substring(0, 8)}</div>
                        <div class="order-date">${orderDate}</div>
                        <div class="order-status ${statusClass}">${order.status || 'pending'}</div>
                    </div>
                    <div class="order-details">
                        <div class="customer-info">
                            <strong>${order.customerName}</strong>
                            <span>${order.customerEmail}</span>
                        </div>
                        <div class="order-summary">
                            <span>${order.items?.length || 0} items</span>
                            <strong>$${order.totalAmount.toFixed(2)}</strong>
                        </div>
                    </div>
                    <div class="order-actions">
                        <button class="btn btn--secondary btn--sm" onclick="window.shop.viewOrderDetails('${order._id}')">View</button>
                        <select class="form-control status-select" onchange="window.shop.updateOrderStatus('${order._id}', this.value)">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                        <button class="delete-btn btn--sm" onclick="window.shop.deleteOrder('${order._id}')">Delete</button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    searchOrders(query) {
        if (!this.orders) return;

        const filteredOrders = this.orders.filter(order => 
            order.customerName.toLowerCase().includes(query.toLowerCase()) ||
            order.customerEmail.toLowerCase().includes(query.toLowerCase()) ||
            order._id.toLowerCase().includes(query.toLowerCase())
        );
        this.displayOrders(filteredOrders);
    }

    filterOrdersByStatus(status) {
        if (!this.orders) return;

        const filteredOrders = status === 'all' 
            ? this.orders 
            : this.orders.filter(order => (order.status || 'pending') === status);
        this.displayOrders(filteredOrders);
    }

    async viewOrderDetails(orderId) {
        try {
            const response = await api.getOrder(orderId);
            const order = response.data;

            const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString();
            let itemsHtml = '';
            
            if (order.items && order.items.length > 0) {
                order.items.forEach(item => {
                    itemsHtml += `
                        <div class="order-item">
                            <span>${item.name}</span>
                            <span>Qty: ${item.quantity}</span>
                            <span>$${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    `;
                });
            }

            const detailsHtml = `
                <div class="order-details-full">
                    <div class="order-header-full">
                        <h4>Order #${order._id}</h4>
                        <div class="order-status status-${order.status || 'pending'}">${order.status || 'pending'}</div>
                    </div>
                    
                    <div class="customer-details">
                        <h5>Customer Information</h5>
                        <p><strong>Name:</strong> ${order.customerName}</p>
                        <p><strong>Email:</strong> ${order.customerEmail}</p>
                        <p><strong>Phone:</strong> ${order.customerPhone || 'N/A'}</p>
                    </div>
                    
                    <div class="shipping-address">
                        <h5>Shipping Address</h5>
                        <p>${order.address?.street || 'N/A'}</p>
                        <p>${order.address?.city || 'N/A'}, ${order.address?.state || 'N/A'} ${order.address?.zipCode || 'N/A'}</p>
                        <p>${order.address?.country || 'N/A'}</p>
                    </div>
                    
                    <div class="order-items-full">
                        <h5>Items Ordered</h5>
                        ${itemsHtml}
                    </div>
                    
                    <div class="order-total-full">
                        <p><strong>Total Amount: $${order.totalAmount.toFixed(2)}</strong></p>
                        <p>Order Date: ${orderDate}</p>
                    </div>
                </div>
            `;

            document.getElementById('order-details-content').innerHTML = detailsHtml;
            document.getElementById('order-details-modal').classList.remove('hidden');

        } catch (error) {
            console.error('Error loading order details:', error);
            this.showError('Failed to load order details');
        }
    }

    async updateOrderStatus(orderId, newStatus) {
        this.showLoading('Updating order status...');
        try {
            await api.updateOrder(orderId, { status: newStatus });
            
            if (this.orders) {
                const orderIndex = this.orders.findIndex(o => o._id === orderId);
                if (orderIndex !== -1) {
                    this.orders[orderIndex].status = newStatus;
                }
            }
            
            this.displayOrders();
            this.showSuccess('Order status updated successfully!');
        } catch (error) {
            this.showError('Failed to update order status');
            console.error(error);
        } finally {
            this.hideLoading();
        }
    }

    async deleteOrder(orderId) {
        if (!confirm('Are you sure you want to delete this order?')) return;

        this.showLoading('Deleting order...');
        try {
            await api.deleteOrder(orderId);
            
            if (this.orders) {
                this.orders = this.orders.filter(o => o._id !== orderId);
            }
            
            this.displayOrders();
            this.loadDashboardStats();
            this.showSuccess('Order deleted successfully!');
        } catch (error) {
            this.showError('Failed to delete order');
            console.error(error);
        } finally {
            this.hideLoading();
        }
    }

    async refreshOrders() {
        this.showLoading('Refreshing orders...');
        try {
            await this.loadOrders();
            this.showSuccess('Orders refreshed successfully!');
        } catch (error) {
            this.showError('Failed to refresh orders');
        } finally {
            this.hideLoading();
        }
    }

    async loadAnalytics() {
        try {
            const topProductsHtml = this.products
                .filter(p => p.stock < 20)
                .slice(0, 5)
                .map(p => `<div class="analytics-item">${p.name} - $${p.price}</div>`)
                .join('');
            
            const topProductsEl = document.getElementById('top-products');
            if (topProductsEl) {
                topProductsEl.innerHTML = topProductsHtml || '<p>No data available</p>';
            }

            const lowStockProducts = this.products.filter(p => p.stock < 5);
            const lowStockHtml = lowStockProducts
                .map(p => `<div class="analytics-item low-stock">${p.name} - ${p.stock} left</div>`)
                .join('');
            
            const lowStockEl = document.getElementById('low-stock-products');
            if (lowStockEl) {
                lowStockEl.innerHTML = lowStockHtml || '<p>All products well stocked</p>';
            }

            if (this.orders) {
                const statusCount = this.orders.reduce((acc, order) => {
                    const status = order.status || 'pending';
                    acc[status] = (acc[status] || 0) + 1;
                    return acc;
                }, {});

                const statusHtml = Object.entries(statusCount)
                    .map(([status, count]) => `<div class="analytics-item">${status}: ${count}</div>`)
                    .join('');
                
                const statusChartEl = document.getElementById('order-status-chart');
                if (statusChartEl) {
                    statusChartEl.innerHTML = statusHtml || '<p>No orders yet</p>';
                }
            }

        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    addToCart(productId) {
        const product = this.products.find(p => p._id === productId);
        if (!product) {
            this.showError('Product not found!');
            return;
        }

        if (product.stock <= 0) {
            this.showError('Product is out of stock!');
            return;
        }

        const existingItem = this.cart.find(item => item.id === productId);
        if (existingItem) {
            if (existingItem.quantity >= product.stock) {
                this.showError('Cannot add more items than available stock!');
                return;
            }
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                id: productId,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: 1
            });
        }

        localStorage.setItem('cart', JSON.stringify(this.cart));
        this.updateCartDisplay();
        this.showSuccess(`${product.name} added to cart!`);
    }

    updateCartDisplay() {
        const cartCount = document.getElementById('cart-count');
        if (cartCount) {
            const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
            cartCount.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;
        }
    }

    displayCart() {
        const container = document.getElementById('cart-items');
        const summary = document.getElementById('cart-summary');
        
        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = '<div class="empty-cart"><p>Your cart is empty. Start shopping!</p></div>';
            if (summary) summary.style.display = 'none';
            return;
        }

        let html = '';
        let subtotal = 0;

        this.cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            html += `
                <div class="cart-item fade-in">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                    </div>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="window.shop.updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button class="quantity-btn" onclick="window.shop.updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                    </div>
                    <button class="remove-btn" onclick="window.shop.removeFromCart('${item.id}')">Remove</button>
                </div>
            `;
        });

        container.innerHTML = html;

        if (summary) {
            const total = subtotal + 9.99;
            const subtotalEl = document.getElementById('cart-subtotal');
            const totalEl = document.getElementById('cart-total');
            
            if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
            if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
            summary.style.display = 'block';
        }
    }

    updateQuantity(productId, newQuantity) {
        if (newQuantity <= 0) {
            this.removeFromCart(productId);
            return;
        }

        const product = this.products.find(p => p._id === productId);
        if (product && newQuantity > product.stock) {
            this.showError('Cannot exceed available stock!');
            return;
        }

        const item = this.cart.find(item => item.id === productId);
        if (item) {
            item.quantity = newQuantity;
            localStorage.setItem('cart', JSON.stringify(this.cart));
            this.displayCart();
            this.updateCartDisplay();
        }
    }

    removeFromCart(productId) {
        console.log('Removing item from cart:', productId);
        
        // Remove the item from the cart array
        this.cart = this.cart.filter(item => item.id !== productId);
        
        // Update localStorage
        localStorage.setItem('cart', JSON.stringify(this.cart));
        
        // Refresh the display
        this.displayCart();
        this.updateCartDisplay();
        
        this.showSuccess('Item removed from cart');
        console.log('Cart after removal:', this.cart);
    }

    clearCart() {
        if (confirm('Are you sure you want to clear your entire cart?')) {
            this.cart = [];
            localStorage.removeItem('cart');
            this.displayCart();
            this.updateCartDisplay();
            this.showSuccess('Cart cleared successfully!');
        }
    }

    displayCheckout() {
        const container = document.getElementById('checkout-items');
        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = '<p>No items in cart</p>';
            return;
        }

        let html = '';
        let subtotal = 0;

        this.cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            html += `
                <div class="checkout-item">
                    <span>${item.name} x${item.quantity}</span>
                    <span>$${itemTotal.toFixed(2)}</span>
                </div>
            `;
        });

        container.innerHTML = html;

        const total = subtotal + 9.99;
        const checkoutSubtotalEl = document.getElementById('checkout-subtotal');
        const checkoutTotalEl = document.getElementById('checkout-total');
        
        if (checkoutSubtotalEl) checkoutSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;
        if (checkoutTotalEl) checkoutTotalEl.textContent = `$${total.toFixed(2)}`;
    }

    async handleCheckout(e) {
        const formData = new FormData(e.target);
        
        // Validate cart before checkout
        await this.validateAndLoadCart();
        
        if (this.cart.length === 0) {
            this.showError('Your cart is empty!');
            return;
        }
        
        console.log('Cart items:', this.cart);
        
        const customerData = {
            customerName: `${formData.get('firstName')} ${formData.get('lastName')}`,
            customerEmail: formData.get('email'),
            customerPhone: formData.get('phone'),
            address: {
                street: formData.get('address'),
                city: formData.get('city'),
                state: formData.get('state'),
                zipCode: formData.get('zipCode')
            },
            items: this.cart.map(item => ({
                productId: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            })),
            totalAmount: this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 9.99
        };

        console.log('Order data being sent:', customerData);

        this.showLoading('Processing your order...');
        try {
            const response = await api.createOrder(customerData);
            console.log('Order response:', response);
            
            // Clear cart after successful order
            this.cart = [];
            localStorage.removeItem('cart');
            this.updateCartDisplay();
            
            this.showSuccess('Order placed successfully!');
            this.navigateTo('products');
        } catch (error) {
            console.error('Checkout error:', error);
            this.showError('Failed to place order. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async submitAddProductForm() {
        const form = document.getElementById('add-product-form');
        const formData = new FormData(form);

        const productData = {
            name: formData.get('product-name'),
            price: parseFloat(formData.get('product-price')),
            description: formData.get('product-description'),
            category: formData.get('product-category'),
            image: formData.get('product-image'),
            stock: parseInt(formData.get('product-stock'))
        };

        this.showLoading('Adding product...');
        try {
            const response = await api.createProduct(productData);
            this.products.push(response.data);
            form.reset();
            this.loadAdminProducts();
            this.displayProducts();
            this.showSuccess('Product added successfully!');
            
            SimpleShop.updateImagePreview('');
        } catch (error) {
            this.showError('Failed to add product. Please try again.');
            console.error(error);
        } finally {
            this.hideLoading();
        }
    }

    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) return;

        this.showLoading('Deleting product...');
        try {
            await api.deleteProduct(productId);
            this.products = this.products.filter(p => p._id !== productId);
            
            // Remove the deleted product from cart if it exists
            this.cart = this.cart.filter(item => item.id !== productId);
            localStorage.setItem('cart', JSON.stringify(this.cart));
            
            this.loadAdminProducts();
            this.displayProducts();
            this.updateCartDisplay();
            this.showSuccess('Product deleted successfully!');
        } catch (error) {
            this.showError('Failed to delete product. Please try again.');
            console.error(error);
        } finally {
            this.hideLoading();
        }
    }

    // Utility methods
    showLoading(message = 'Loading...') {
        const loadingMessageEl = document.getElementById('loading-message');
        const loadingModalEl = document.getElementById('loading-modal');
        
        if (loadingMessageEl) loadingMessageEl.textContent = message;
        if (loadingModalEl) loadingModalEl.classList.remove('hidden');
    }

    hideLoading() {
        const loadingModalEl = document.getElementById('loading-modal');
        if (loadingModalEl) loadingModalEl.classList.add('hidden');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
    }
}

// Global modal close function
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Initialize the shop
const shop = new SimpleShop();
window.shop = shop;