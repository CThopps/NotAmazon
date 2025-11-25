// Load the Express framework (makes handling HTTP much easier)
const express = require('express');

// Built-in Node.js module to safely handle file paths
const path = require('path');

// Session middleware to keep track of logged-in users and carts
const session = require('express-session');

// Add MySQL library
const mysql = require('mysql2/promise');

// Create an Express application
// `app` will be used to define routes (GET, POST, etc.)
const app = express();

// Port number where the server will run
// Access it at: http://localhost:8080
const port = 8080;

// MySQL connection pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',          // preset to my MySQL user (change if needed)
    password: '',          // preset to my MySQL password (change if needed)
    database: 'notamazon'
});

/**
 * AUTH MIDDLEWARE
 * Small helper functions to protect routes.
 * - requireLogin: only allows logged-in users (any role).
 * - requireAdmin: only allows users with role === 'admin'.
 */

// Only allow access if there is a logged-in user in the session
function requireLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        // User is not logged in
        return res.status(401).send('You must be logged in to access this page.');
    }
    next(); // User is logged in, continue to the actual route handler
}

// Only allow access if the logged-in user is an admin
function requireAdmin(req, res, next) {
    if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
        // User is either not logged in or not an admin
        return res.status(403).send('Admins only.');
    }
    next(); // User is an admin, continue to the actual route handler
}


/**
 * SESSION SETUP
 * This allows the server to remember data for each user (like login info and cart)
 * across multiple requests by using a session cookie in the browser.
 */
app.use(session({
    // Used to sign the session ID cookie. In a real app, this should be a long, random string
    // stored in an environment variable (not hard-coded).
    secret: 'notamazon-secret-key',
    resave: false,          // Do not save the session back to the store if nothing changed
    saveUninitialized: false, // Do not create a session until something is stored in it
    cookie: {
        maxAge: 1000 * 60 * 60 // Session cookie will last for 1 hour (in milliseconds)
    }
}));


/**
 * MIDDLEWARE SETUP
 * Middleware = Code that runs BEFORE your routes.
 * This allows Express to read data sent through HTML forms
 * (like signup, login, add-to-cart). Without this,
 * req.body will ALWAYS be empty.
 */
app.use(express.urlencoded({ extended: true }));

// This allows Express to handle JSON data (useful later for APIs or AJAX)
app.use(express.json());

// ----------------------------------------------------------
// GET ROUTES (Pages)
// Each of these sends a specific HTML file to the browser.
// These pages are static for now, but routing makes URLs
// clean and prepares us for backend logic.
// ----------------------------------------------------------

// Home / Landing Page – dynamic, shows 3 featured products from DB
app.get('/', async (req, res) => {
    try {
        // OPTION A: random 3 products
        const [rows] = await pool.query(
            'SELECT * FROM products ORDER BY RAND() LIMIT 3'
        );

        // (If you prefer the first 3 products instead, use:
        // 'SELECT * FROM products ORDER BY id LIMIT 3'
        // )

        let featuredHtml = '';

        rows.forEach(prod => {
            featuredHtml += `
                <article class="product">
                    <h3>${prod.name}</h3>
                    <p>${prod.description}</p>
                    <p>Price: $${Number(prod.price).toFixed(2)}</p>

                    <!-- View details goes to /product?id=... -->
                    <form method="GET" action="/product" style="display:inline;">
                        <input type="hidden" name="id" value="${prod.id}">
                        <button type="submit">View Details</button>
                    </form>

                    <!-- Add to cart posts to /cart/add -->
                    <form method="POST" action="/cart/add" style="display:inline;">
                        <input type="hidden" name="productId" value="${prod.id}">
                        <input type="hidden" name="quantity" value="1">
                        <button type="submit">Add to Cart</button>
                    </form>
                </article>
                <hr>
            `;
        });

        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>NotAmazon - Home</title>
            <link rel="stylesheet" href="/styles.css">
        </head>
        <body>
            <header>
                <h1>NotAmazon</h1>
                <nav>
                    <a href="/">Home</a>
                    <a href="/catalogue">Products</a>
                    <a href="/cart">Cart</a>

                    <a href="/admin/products" id="admin-link" style="display:none;">Admin</a>

                    <a href="/Login.html" id="login-link">Login</a>
                    <a href="/signup.html" id="signup-link">Sign Up</a>

                    <form method="POST" action="/logout" id="logout-form"
                          style="display:none; margin:0; padding:0;">
                        <button type="submit">Logout</button>
                    </form>
                </nav>
                <p id="user-info"></p>
            </header>

            <main>
                <h2>Featured Products</h2>

                <section id="featured-products">
                    ${featuredHtml || '<p>No products found.</p>'}
                </section>

                <p><a href="/catalogue">Browse All Products →</a></p>
            </main>

            <script src="/session-ui.js"></script>
        </body>
        </html>
        `;

        res.send(html);
    } catch (err) {
        console.error('Error loading featured products from DB:', err);
        res.status(500).send('Error loading home page.');
    }
});

// Keep old /index.html links working by redirecting to the dynamic home page
app.get('/index.html', (req, res) => {
    res.redirect('/');
});

// Dynamic Catalogue Page
// Dynamic Catalogue Page (now using MySQL instead of in-memory array)
app.get('/catalogue', async (req, res) => {
    try {
        // Get all products from the "products" table
        const [rows] = await pool.query('SELECT * FROM products');

        let productHtml = "";

        rows.forEach(prod => {
            productHtml += `
                <article class="product">
                    <h2>${prod.name}</h2>
                    <p>${prod.description}</p>
                    <p><strong>Price:</strong> $${Number(prod.price).toFixed(2)}</p>

                    <!-- View Details button goes to /product?id=... -->
                    <form method="GET" action="/product">
                        <input type="hidden" name="id" value="${prod.id}">
                        <button type="submit">View Details</button>
                    </form>

                    <!-- Add 1 unit of this product to the cart -->
                    <form method="POST" action="/cart/add">
                        <input type="hidden" name="productId" value="${prod.id}">
                        <input type="hidden" name="quantity" value="1">
                        <button type="submit">Add to Cart</button>
                    </form>
                </article>
                <hr>
            `;
        });

        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>NotAmazon - Catalogue</title>
            <link rel="stylesheet" href="/styles.css">
        </head>
        <body>

        <header>
            <h1>NotAmazon</h1>
            <nav>
                <a href="/">Home</a>
                <a href="/catalogue">Products</a>
                <a href="/cart">Cart</a>

                <a href="/Login.html" id="login-link">Login</a>
                <a href="/signup.html" id="signup-link">Sign Up</a>

                <form method="POST" action="/logout" id="logout-form"
                      style="display:none; margin:0; padding:0;">
                    <button type="submit">Logout</button>
                </form>
            </nav>
            <p id="user-info"></p>
        </header>

        <main>
            <h2>All Products</h2>

            <section id="product-list">
                ${productHtml || '<p>No products found.</p>'}
            </section>
        </main>

        <script src="/session-ui.js"></script>
        </body>
        </html>
        `;

        res.send(html);
    } catch (err) {
        console.error('Error loading products from DB:', err);
        res.status(500).send('Error loading products.');
    }
});

// Dynamic Product Details Page (using MySQL)
app.get('/product', async (req, res) => {
    try {
        // Read ?id= from URL: /product?id=1
        const id = Number(req.query.id);

        if (!id) {
            return res.status(400).send('Product ID is required.');
        }

        // Get this product from the database
        const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).send('Product not found.');
        }

        const product = rows[0];

        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>NotAmazon - ${product.name}</title>
            <link rel="stylesheet" href="/styles.css">
        </head>
        <body>
            <header>
                <h1>NotAmazon</h1>
                <nav>
                    <a href="/">Home</a>
                    <a href="/catalogue">Products</a>
                    <a href="/cart">Cart</a>

                    <a href="/Login.html" id="login-link">Login</a>
                    <a href="/signup.html" id="signup-link">Sign Up</a>

                    <form method="POST" action="/logout" id="logout-form"
                          style="display:none; margin:0; padding:0;">
                        <button type="submit">Logout</button>
                    </form>
                </nav>
                <p id="user-info"></p>
            </header>

            <main>
                <section>
                    <h2>${product.name}</h2>
                    <p><strong>Price:</strong> $${Number(product.price).toFixed(2)}</p>
                    <p><strong>In Stock:</strong> ${product.stock}</p>
                    <p><strong>Description:</strong> ${product.description}</p>

                    <!-- Add to cart form for this specific product -->
                    <form method="POST" action="/cart/add">
                        <input type="hidden" name="productId" value="${product.id}">
                        <label>
                            Quantity:
                            <input type="number" name="quantity" value="1" min="1" max="${product.stock}">
                        </label>
                        <button type="submit">Add to Cart</button>
                    </form>

                    <p><a href="/catalogue">← Back to Products</a></p>
                </section>
            </main>

            <script src="/session-ui.js"></script>
        </body>
        </html>
        `;

        res.send(html);
    } catch (err) {
        console.error('Error loading product from DB:', err);
        res.status(500).send('Error loading product.');
    }
});

app.get('/cart', (req, res) => {
    const cart = req.session.cart || [];

    let total = 0;
    let cartItemsHtml = '';

    if (cart.length === 0) {
        cartItemsHtml = '<p>Your cart is empty.</p>';
    } else {
        cart.forEach(item => {
            const price = Number(item.price);

            // Fallback if price is invalid
            const safePrice = Number.isNaN(price) ? 0 : price;

            total += safePrice * item.quantity;

            cartItemsHtml += `
                <article>
                    <h3>${item.productName || 'Unknown Product'}</h3>
                    <p>Price: $${safePrice.toFixed(2)}</p>

                    <form method="POST" action="/cart/update">
                        <input type="hidden" name="productId" value="${item.productId}">
                        <label>
                            Qty:
                            <input type="number" name="newQuantity" value="${item.quantity}" min="1">
                        </label>
                        <button type="submit">Update</button>
                    </form>

                    <form method="POST" action="/cart/remove">
                        <input type="hidden" name="productId" value="${item.productId}">
                        <button type="submit">Remove</button>
                    </form>
                </article>
                <hr>
            `;
        });
    }

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>NotAmazon - Cart</title>
        <link rel="stylesheet" href="/styles.css">
    </head>
    <body>
        <header>
            <!-- your header/nav stuff here, same as before -->
        </header>

        <main>
            <h2>Your Cart</h2>
            <section>
                ${cartItemsHtml}
            </section>

            <p><strong>Total: $${total.toFixed(2)}</strong></p>

            <p><a href="/catalogue">← Continue Shopping</a></p>

            <form method="GET" action="/checkout">
                <button type="submit">Proceed to Checkout</button>
            </form>
        </main>

        <script src="/session-ui.js"></script>
    </body>
    </html>
    `;

    res.send(html);
});


// Checkout form page
// Only logged-in users should be able to see the checkout page
app.get('/checkout', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

// Order confirmation page (reads last order from MySQL)
app.get('/order-confirmation', requireLogin, async (req, res) => {
    try {
        const lastOrderId = req.session.lastOrderId;

        if (!lastOrderId) {
            return res.status(400).send('No recent order found.');
        }

        // Load the order
        const [orderRows] = await pool.query(
            'SELECT * FROM orders WHERE id = ?',
            [lastOrderId]
        );

        if (orderRows.length === 0) {
            return res.status(404).send('Order not found.');
        }

        const order = orderRows[0];

        // Load the order items + product names
        const [itemRows] = await pool.query(
            `SELECT oi.product_id, oi.price, oi.quantity, p.name AS productName
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = ?`,
            [lastOrderId]
        );

        // Build HTML for items
        let itemsHtml = '';
        itemRows.forEach(item => {
            const priceNum = Number(item.price);        // convert from string to number
            const lineTotal = priceNum * item.quantity;

            itemsHtml += `
                <tr>
                    <td>${item.productName}</td>
                    <td>${item.quantity}</td>
                    <td>$${priceNum.toFixed(2)}</td>
                    <td>$${lineTotal.toFixed(2)}</td>
                </tr>
            `;
        });

        const orderTotalNum = Number(order.total);      // convert from string to number

        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Order Confirmation</title>
            <link rel="stylesheet" href="/styles.css">
        </head>
        <body>
            <header>
                <h1>NotAmazon</h1>
                <nav>
                    <a href="/">Home</a>
                    <a href="/catalogue">Products</a>
                    <a href="/cart">Cart</a>

                    <a href="/Login.html" id="login-link">Login</a>
                    <a href="/signup.html" id="signup-link">Sign Up</a>

                    <form method="POST" action="/logout" id="logout-form"
                          style="display:none; margin:0; padding:0;">
                        <button type="submit">Logout</button>
                    </form>
                </nav>
                <p id="user-info"></p>
            </header>

            <main>
                <h2>Order Confirmation</h2>
                <p>Thank you for your purchase! Your order number is <strong>${order.id}</strong>.</p>

                <h3>Shipping To</h3>
                <p>
                    ${order.full_name}<br>
                    ${order.address}<br>
                    ${order.city}, ${order.province} ${order.postal_code}
                </p>

                <h3>Items</h3>
                <table border="1" cellpadding="5" cellspacing="0">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Line Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml || '<tr><td colspan="4">No items found.</td></tr>'}
                    </tbody>
                </table>

                <p><strong>Order Total:</strong> $${orderTotalNum.toFixed(2)}</p>

                <p><a href="/catalogue">← Continue Shopping</a></p>
            </main>

            <script src="/session-ui.js"></script>
        </body>
        </html>
        `;

        res.send(html);
    } catch (err) {
        console.error('Error loading order confirmation (DB):', err);
        res.status(500).send('Error loading order confirmation.');
    }
});

// Login form page
app.get('/login', (req, res) => {
    // IMPORTANT: Filename is "Login.html" with capital L
    res.sendFile(path.join(__dirname, 'public', 'Login.html'));
});

// Signup form page
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});


// Only admins should be able to see this page
// Admin — view products list (MySQL)
app.get('/admin/products', requireAdmin, async (req, res) => {
    try {
        // Load all products from the DB
        const [rows] = await pool.query('SELECT * FROM products');

        let rowsHtml = '';

        rows.forEach(p => {
            rowsHtml += `
                <tr>
                    <td>${p.id}</td>
                    <td>${p.name}</td>
                    <td>$${Number(p.price).toFixed(2)}</td>
                    <td>${p.stock}</td>
                    <td>${p.description}</td>
                    <td>
                        <!-- Edit button -->
                        <form method="GET" action="/admin/products/edit/${p.id}" style="display:inline;">
                            <button type="submit">Edit</button>
                        </form>

                        <!-- Delete button -->
                        <form method="POST" action="/admin/products/delete/${p.id}" style="display:inline;">
                            <button type="submit">Delete</button>
                        </form>
                    </td>
                </tr>
            `;
        });

        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Admin - Products</title>
            <link rel="stylesheet" href="/styles.css">
        </head>
        <body>
            <header>
                <h1>NotAmazon - Admin</h1>
                <nav>
                    <a href="/">Home</a>
                    <a href="/catalogue">Store Front</a>
                    <a href="/cart">Cart</a>

                    <a href="/Login.html" id="login-link">Login</a>
                    <a href="/signup.html" id="signup-link">Sign Up</a>

                    <form method="POST" action="/logout" id="logout-form"
                          style="display:none; margin:0; padding:0;">
                        <button type="submit">Logout</button>
                    </form>
                </nav>
                <p id="user-info"></p>
            </header>

            <main>
                <h2>Admin - Product List</h2>

                <p><a href="/admin/products/add">Add New Product</a></p>

                <table border="1" cellpadding="5" cellspacing="0">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Description</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml || '<tr><td colspan="6">No products found.</td></tr>'}
                    </tbody>
                </table>

                <p><a href="/catalogue">← Back to Store</a></p>
            </main>

            <script src="/session-ui.js"></script>
        </body>
        </html>
        `;

        res.send(html);
    } catch (err) {
        console.error('Error loading admin products from DB:', err);
        res.status(500).send('Error loading admin product list.');
    }
});

// Admin: show "Add Product" form
app.get('/admin/products/add', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_product_form.html'));
});


// Admin: add a new product (MySQL)
app.post('/admin/products/add', requireAdmin, async (req, res) => {
    try {
        const { name, price, stock, description } = req.body;

        // Basic validation
        if (!name || !price || !stock || !description) {
            return res.status(400).send('All fields are required.');
        }

        const priceNum = Number(price);
        const stockNum = Number(stock);

        if (Number.isNaN(priceNum) || Number.isNaN(stockNum)) {
            return res.status(400).send('Price and stock must be numbers.');
        }

        // Insert into products table
        const [result] = await pool.query(
            'INSERT INTO products (name, price, stock, description) VALUES (?, ?, ?, ?)',
            [name, priceNum, stockNum, description]
        );

        console.log('Admin added product with ID:', result.insertId);

        // Go back to admin product list
        res.redirect('/admin/products');
    } catch (err) {
        console.error('Error adding product (DB):', err);
        res.status(500).send('Error adding product.');
    }
});


// Admin: Load edit page for a product (MySQL)
app.get('/admin/products/edit/:id', requireAdmin, async (req, res) => {
    try {
        const productId = Number(req.params.id);

        if (!productId) {
            return res.status(400).send('Product ID is required.');
        }

        const [rows] = await pool.query(
            'SELECT * FROM products WHERE id = ?',
            [productId]
        );

        if (rows.length === 0) {
            return res.status(404).send('Product not found.');
        }

        const product = rows[0];

        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Edit Product - ${product.name}</title>
            <link rel="stylesheet" href="/styles.css">
        </head>
        <body>

        <header>
            <h1>NotAmazon - Admin</h1>
            <nav>
                <a href="/">Home</a>
                <a href="/catalogue">Store Front</a>
                <a href="/cart">Cart</a>

                <a href="/Login.html" id="login-link">Login</a>
                <a href="/signup.html" id="signup-link">Sign Up</a>

                <form method="POST" action="/logout" id="logout-form"
                      style="display:none; margin:0; padding:0;">
                    <button type="submit">Logout</button>
                </form>
            </nav>
            <p id="user-info"></p>
        </header>

        <main>
            <h2>Edit Product</h2>

            <form method="POST" action="/admin/products/edit/${product.id}">
                <label>
                    Name:
                    <input type="text" name="name" value="${product.name}" required>
                </label><br><br>

                <label>
                    Price:
                    <input type="number" step="0.01" name="price" value="${Number(product.price)}" required>
                </label><br><br>

                <label>
                    Stock:
                    <input type="number" name="stock" value="${product.stock}" required>
                </label><br><br>

                <label>
                    Description:<br>
                    <textarea name="description" required>${product.description}</textarea>
                </label><br><br>

                <button type="submit">Save Changes</button>
            </form>

            <p><a href="/admin/products">← Back to Product List</a></p>
        </main>

        <script src="/session-ui.js"></script>
        </body>
        </html>
        `;

        res.send(html);
    } catch (err) {
        console.error('Error loading product for edit (DB):', err);
        res.status(500).send('Error loading product.');
    }
});

// View current session state
app.get('/debug/session', (req, res) => {
    // Simple counter to show the session persists between requests
    if (!req.session.views) {
        req.session.views = 1;
    } else {
        req.session.views++;
    }

    res.json({
        message: 'Session debug info',
        sessionId: req.sessionID,
        views: req.session.views,
        user: req.session.user || null,          // logged-in user info (if any)
        cart: req.session.cart || []             // current cart (if any)
    });
});


// ----------------------------------------------------------
// POST ROUTES (Actions: signup, login, cart, checkout, admin)
// Some are still placeholders, but login/logout now use sessions.
// ----------------------------------------------------------

// Handle signup form submission (using MySQL users table)
app.post('/signup', async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        // Basic validation
        if (!name || !email || !password) {
            return res.status(400).send('Name, email, and password are required.');
        }

        if (password !== confirmPassword) {
            return res.status(400).send('Passwords do not match.');
        }

        // Check if email is already in use
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            return res.status(400).send('An account with that email already exists.');
        }

        // Insert new user as a "customer" into the users table
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, password, 'customer']   // plain text password for this project
        );

        const newUserId = result.insertId;
        console.log('New user created (DB):', { id: newUserId, name, email });

        // Optionally log them in immediately
        req.session.user = {
            id: newUserId,
            name,
            email,
            role: 'customer'
        };

        // Redirect to home (or catalogue) after signup
        res.redirect('/');
    } catch (err) {
        console.error('Error during signup (DB):', err);
        res.status(500).send('Error during signup.');
    }
});

// Handle login form submission (using MySQL users table)
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).send('Email and password are required.');
        }

        // Look up the user in the database (plain-text password for this project)
        const [rows] = await pool.query(
            'SELECT id, name, email, password, role FROM users WHERE email = ? AND password = ?',
            [email, password]
        );

        if (rows.length === 0) {
            // No user found with that email/password
            return res.status(401).send('Invalid email or password.');
        }

        const user = rows[0];

        // Save minimal user info in session
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        console.log('User logged in (DB):', req.session.user);

        if (user.role === 'admin') {
            res.redirect('/admin/products');
        } else {
            res.redirect('/');
        }

    } catch (err) {
        console.error('Error during login (DB):', err);
        res.status(500).send('Error during login.');
    }
});


// Handle logout action
app.post('/logout', (req, res) => {
    console.log('Logout requested');

    // Destroy the entire session (removes user, cart, etc.)
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Error logging out.');
        }

        // Optional: clear the session cookie on the client
        // res.clearCookie('connect.sid');

        // Redirect to home page after logout
        res.redirect('/');
    });
});

// Add an item to the cart (now using MySQL for product lookup)
app.post('/cart/add', async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        const id = Number(productId);
        const qty = Number(quantity) || 1;

        if (!id) {
            return res.status(400).send('Product ID is required.');
        }

        // Look up product in the database
        const [rows] = await pool.query(
            'SELECT id, name, price, stock FROM products WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(400).send('Product not found.');
        }

        const product = rows[0];

        // (Optional) basic stock check – you can relax this if you want
        if (product.stock <= 0) {
            return res.status(400).send('This product is out of stock.');
        }

        // Ensure cart exists in session
        if (!req.session.cart) {
            req.session.cart = [];
        }

        // See if item already in cart
        const existingItem = req.session.cart.find(item => item.productId === product.id);

        if (existingItem) {
            existingItem.quantity += qty;
        } else {
            req.session.cart.push({
                productId: product.id,
                productName: product.name,
                price: Number(product.price), // ensure number
                quantity: qty
            });
        }

        console.log('Updated cart:', req.session.cart);

        res.redirect('/cart');
    } catch (err) {
        console.error('Error adding to cart from DB:', err);
        res.status(500).send('Error adding item to cart.');
    }
});

// Remove an item from the cart
app.post('/cart/remove', (req, res) => {
    const { productId } = req.body;

    if (!req.session.cart) {
        req.session.cart = [];
    }

    // Keep only the items that DO NOT match the product ID
    req.session.cart = req.session.cart.filter(item => item.productId != productId);

    console.log("Cart after removal:", req.session.cart);

    res.redirect('/cart');
});

// Handle checkout form submission (store order in MySQL)
app.post('/checkout', requireLogin, async (req, res) => {
    try {
        // Form fields from checkout.html
        const {
            fullName,
            address,
            city,
            province,
            postalCode,
            cardNumber,
            expiry,
            cvv
        } = req.body;

        // Basic validation
        if (!fullName || !address || !city || !province || !postalCode) {
            return res.status(400).send('All shipping fields are required.');
        }

        // Ensure there is a cart in the session
        const cart = req.session.cart || [];
        if (cart.length === 0) {
            return res.status(400).send('Your cart is empty. Add items before checking out.');
        }

        // Logged-in user from session
        const user = req.session.user;

        // Calculate total
        const total = cart.reduce((sum, item) => {
            return sum + item.price * item.quantity;
        }, 0);

        // 1) Insert into orders table
        const [orderResult] = await pool.query(
            `INSERT INTO orders
             (user_id, total, full_name, address, city, province, postal_code)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [user.id, total, fullName, address, city, province, postalCode]
        );

        const orderId = orderResult.insertId;
        console.log('New order created with ID:', orderId);

        // 2) Insert order items (one row per cart item)
        // We’ll build an array of value-tuples: [order_id, product_id, price, quantity]
        const values = cart.map(item => [
            orderId,
            item.productId,
            item.price,
            item.quantity
        ]);

        // Bulk insert into order_items
        await pool.query(
            'INSERT INTO order_items (order_id, product_id, price, quantity) VALUES ?',
            [values]
        );

        // 3) Clear cart & remember last order ID in session
        req.session.cart = [];
        req.session.lastOrderId = orderId;

        console.log('Order items inserted for order:', orderId);

        // 4) Redirect to confirmation page
        res.redirect('/order-confirmation');
    } catch (err) {
        console.error('Error during checkout (DB):', err);
        res.status(500).send('Error processing checkout.');
    }
});

// Admin: apply updates to the product (MySQL)
app.post('/admin/products/edit/:id', requireAdmin, async (req, res) => {
    try {
        const productId = Number(req.params.id);

        if (!productId) {
            return res.status(400).send('Product ID is required.');
        }

        const { name, price, stock, description } = req.body;

        if (!name || !price || !stock || !description) {
            return res.status(400).send('All fields are required.');
        }

        const priceNum = Number(price);
        const stockNum = Number(stock);

        if (Number.isNaN(priceNum) || Number.isNaN(stockNum)) {
            return res.status(400).send('Price and stock must be numbers.');
        }

        const [result] = await pool.query(
            'UPDATE products SET name = ?, price = ?, stock = ?, description = ? WHERE id = ?',
            [name, priceNum, stockNum, description, productId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).send('Product not found.');
        }

        console.log('Product updated (DB):', { productId, name, priceNum, stockNum, description });

        res.redirect('/admin/products');
    } catch (err) {
        console.error('Error updating product (DB):', err);
        res.status(500).send('Error updating product.');
    }
});

// Admin: delete a product (MySQL)
app.post('/admin/products/delete/:id', requireAdmin, async (req, res) => {
    try {
        const productId = Number(req.params.id);

        if (!productId) {
            return res.status(400).send('Product ID is required.');
        }

        const [result] = await pool.query(
            'DELETE FROM products WHERE id = ?',
            [productId]
        );

        if (result.affectedRows === 0) {
            // No product with that ID found
            return res.status(404).send('Product not found.');
        }

        console.log('Product deleted (DB):', productId);

        // Go back to admin product list
        res.redirect('/admin/products');
    } catch (err) {
        console.error('Error deleting product (DB):', err);
        res.status(500).send('Error deleting product.');
    }
});

// ----------------------------------------------------------
// STATIC FILES (after all routes)
// ----------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// ----------------------------------------------------------
// START THE SERVER
// ----------------------------------------------------------
// This actually turns your computer into a web server.
// When you run `node server.js`, it will listen on port 8080.
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
