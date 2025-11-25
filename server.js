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
 * Fake Database (In-Memory)
 * These arrays will act as our "database" for now until we add the SQL part.
 * In a real application, this data would be stored in a database like MySQL.
 */

// Product list – shown on catalogue page and used by admin
const products = [
    {
        id: 1,
        name: "Basic Keyboard",
        price: 49.99,
        stock: 10,
        description: "A simple mechanical keyboard with blue switches."
    },
    {
        id: 2,
        name: "Gaming Mouse",
        price: 39.99,
        stock: 15,
        description: "High DPI gaming mouse with customizable buttons."
    },
    {
        id: 3,
        name: "Laptop Stand",
        price: 29.99,
        stock: 20,
        description: "Adjustable aluminum laptop stand for better ergonomics."
    }
];

// Next product ID for new products added by admin
let nextProductId = products.length > 0
    ? Math.max(...products.map(p => p.id)) + 1
    : 1;


// Users – login system will use this
// Pre-made admin + customer
const users = [
    {
        name: "Admin User",
        email: "admin@notamazon.com",
        password: "admin123",        // plain text ONLY for this project
        role: "admin"
    },
    {
        name: "Test Customer",
        email: "customer@notamazon.com",
        password: "customer123",
        role: "customer"
    }
];

// Orders – checkout will push new order objects here
const orders = [];
let nextOrderId = 1; // simple counter for unique order IDs

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

/**
 * Serve all files inside the "public" folder to the browser.
 * Example:
 *   /index.html → public/index.html
 *   /styles.css → public/styles.css
 *   /image.png → public/image.png
 * This makes images, CSS, and client JS work automatically.
 */
app.use(express.static(path.join(__dirname, 'public')));


// ----------------------------------------------------------
// GET ROUTES (Pages)
// Each of these sends a specific HTML file to the browser.
// These pages are static for now, but routing makes URLs
// clean and prepares us for backend logic.
// ----------------------------------------------------------

// Home / Landing Page
app.get('/', (req, res) => {
    // Sends: public/index.html
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
        </head>
        <body>

        <header>
            <h1>NotAmazon</h1>
            <nav>
                <a href="/index.html">Home</a>
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
        </head>
        <body>
            <header>
                <h1>NotAmazon</h1>
                <nav>
                    <a href="/index.html">Home</a>
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

// Dynamic Order Confirmation Page
app.get('/order-confirmation', (req, res) => {
    const lastOrderId = req.session.lastOrderId;

    // If no recent order in session, show a simple message
    if (!lastOrderId) {
        return res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Order Confirmation</title>
            </head>
            <body>
                <h1>No recent order found</h1>
                <p>You probably refreshed this page or came here directly.</p>
                <p><a href="/catalogue">Go back to products</a></p>
            </body>
            </html>
        `);
    }

    const order = orders.find(o => o.id === lastOrderId);

    if (!order) {
        return res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Order Confirmation</title>
            </head>
            <body>
                <h1>Order not found</h1>
                <p>There was a problem locating your order.</p>
                <p><a href="/catalogue">Go back to products</a></p>
            </body>
            </html>
        `);
    }

    // Build items list HTML
    let itemsHtml = '';
    order.items.forEach(item => {
        itemsHtml += `
            <li>
                ${item.productName} (x${item.quantity}) – $${(item.price * item.quantity).toFixed(2)}
            </li>
        `;
    });

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Order Confirmation</title>
    </head>
    <body>
        <header>
            <h1>NotAmazon</h1>
            <nav>
                <a href="/index.html">Home</a>
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
            <h2>Order Confirmed!</h2>
            <p>Thank you for your purchase, ${order.shipping.fullName || order.userName}.</p>

            <h3>Items you bought:</h3>
            <ul>
                ${itemsHtml}
            </ul>

            <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>

            <h3>Shipping to:</h3>
            <p>
                ${order.shipping.fullName}<br>
                ${order.shipping.address}<br>
                ${order.shipping.city} ${order.shipping.province}<br>
                ${order.shipping.postalCode}
            </p>

            <p><a href="/catalogue">← Continue Shopping</a></p>
        </main>

        <script src="/session-ui.js"></script>
    </body>
    </html>
    `;

    res.send(html);
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
        </head>
        <body>
            <header>
                <h1>NotAmazon - Admin</h1>
                <nav>
                    <a href="/index.html">Home</a>
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
        </head>
        <body>

        <header>
            <h1>NotAmazon - Admin</h1>
            <nav>
                <a href="/index.html">Home</a>
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


// ----------------------------------------------------------
// DEBUG ROUTES (TEMPORARY) - To test the fake database & session
// ----------------------------------------------------------

// View products
app.get('/debug/products', (req, res) => {
    res.json(products);
});

// View users (admin + test customer)
app.get('/debug/users', (req, res) => {
    res.json(users);
});

// View orders (should be empty right now)
app.get('/debug/orders', (req, res) => {
    res.json(orders);
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

// Handle signup form submission
app.post('/signup', (req, res) => {
    const { name, email, password, confirmPassword } = req.body;
    console.log('Signup data received:', req.body);

    // Basic validation: check required fields
    if (!name || !email || !password || !confirmPassword) {
        return res.status(400).send('Name, email, password, and confirm password are required.');
    }

    // Check if passwords match
    if (password !== confirmPassword) {
        return res.status(400).send('Passwords do not match.');
    }

    // Check if a user with this email already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.status(400).send('An account with this email already exists.');
    }

    // Create a new user object (role: customer by default)
    const newUser = {
        name,
        email,
        password,   // plain text for this project ONLY
        role: 'customer'
    };

    // Add to our fake "database" of users
    users.push(newUser);

    console.log('New user created:', newUser);

    // Automatically log the user in after signup
    req.session.user = {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
    };

    if (!req.session.cart) {
        req.session.cart = [];
    }

    // Redirect to home page after successful signup
    res.redirect('/');
});

// Handle login form submission
app.post('/login', (req, res) => {
    // Extract the email and password that were submitted from the login form
    const { email, password } = req.body;
    console.log('Login data received:', req.body);

    // Try to find a user in our fake "users" array with matching email AND password
    const user = users.find(u => u.email === email && u.password === password);

    // If no matching user is found, login fails
    if (!user) {
        console.log('Login failed for:', email);

        // For now, just send a simple error message and 401 (Unauthorized) status.
        // Later we could redirect back to /login with an error query parameter.
        return res.status(401).send('Invalid email or password.');
    }

    // If we get here, we found a matching user.
    // Store only the basic info we need in the session (do NOT store password).
    req.session.user = {
        name: user.name,
        email: user.email,
        role: user.role     // "admin" or "customer"
    };

    // If this user does not have a cart yet in the session, create an empty one.
    if (!req.session.cart) {
        req.session.cart = [];
    }

    console.log('User logged in:', req.session.user);

    // After successful login, redirect to the home page (or wherever you prefer).
    res.redirect('/');
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

// Handle checkout form submission
app.post('/checkout', requireLogin, (req, res) => {
    console.log('Checkout req.body:', req.body);

    const { fullName, address, city, province, postalCode, cardNumber, expiry, cvv } = req.body;

    const cart = req.session.cart || [];
    if (cart.length === 0) {
        return res.status(400).send('Your cart is empty. Add items before checking out.');
    }

    const user = req.session.user;

    const total = cart.reduce((sum, item) => {
        return sum + item.price * item.quantity;
    }, 0);

    const newOrder = {
        id: nextOrderId++,
        userEmail: user.email,
        userName: user.name,
        items: cart.map(item => ({
            productId: item.productId,
            productName: item.productName,
            price: item.price,
            quantity: item.quantity
        })),
    total,
        shipping: {
            fullName,
            address,
            city,
            province,
            postalCode
        },
        createdAt: new Date().toISOString()
    };

    orders.push(newOrder);

    // Clear cart and remember last order for confirmation page
    req.session.cart = [];
    req.session.lastOrderId = newOrder.id;

    console.log('New order created:', newOrder);

    res.redirect('/order-confirmation');
});

// ------------------------
// ADMIN POST ROUTES
// ------------------------

// Admin: add a new product
// Only admins can access this route
app.post('/admin/products/add', requireAdmin, (req, res) => {
    const { name, price, stock, description } = req.body;

    // Basic validation
    if (!name || !price || !stock || !description) {
        return res.status(400).send('Name, price, stock, and description are required.');
    }

    const numericPrice = Number(price);
    const numericStock = Number(stock);

    if (Number.isNaN(numericPrice) || Number.isNaN(numericStock)) {
        return res.status(400).send('Price and stock must be numbers.');
    }

    // Create new product object
    const newProduct = {
        id: nextProductId++,
        name,
        price: numericPrice,
        stock: numericStock,
        description
    };

    // Add to our fake "products" database
    products.push(newProduct);

    console.log('New product added by admin:', newProduct);

    // After adding, redirect to the admin products list
    res.redirect('/admin/products');
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
// START THE SERVER
// ----------------------------------------------------------
// This actually turns your computer into a web server.
// When you run `node server.js`, it will listen on port 8080.
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
