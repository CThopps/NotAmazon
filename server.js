// Load the Express framework (makes handling HTTP much easier)
const express = require('express');

// Built-in Node.js module to safely handle file paths
const path = require('path');

// Session middleware to keep track of logged-in users and carts
const session = require('express-session');

// Create an Express application
// `app` will be used to define routes (GET, POST, etc.)
const app = express();

// Port number where the server will run
// Access it at: http://localhost:8080
const port = 8080;


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

// Catalogue listing page
app.get('/catalogue', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'catalogue.html'));
});

// Individual product page (static for now)
app.get('/product', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'product.html'));
});

// Shopping cart page (dynamic - uses session cart)
app.get('/cart', (req, res) => {
    const cart = req.session.cart || [];

    const total = cart.reduce((sum, item) => {
        return sum + item.price * item.quantity;
    }, 0);

    let cartItemsHtml = '';

    if (cart.length === 0) {
        cartItemsHtml = '<p>Your cart is empty.</p>';
    } else {
        cart.forEach(item => {
            cartItemsHtml += `
                <article>
                    <h3>${item.productName}</h3>
                    <p>Price: $${item.price.toFixed(2)}</p>

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
            <h1>NotAmazon</h1>
            <nav>
                <a href="/index.html">Home</a>
                <a href="/catalogue">Products</a>
                <a href="/cart">Cart</a>

                <a href="/Login.html" id="login-link">Login</a>
                <a href="/signup.html" id="signup-link">Sign Up</a>

                <form method="POST" action="/logout" id="logout-form" style="display: none; margin: 0; padding: 0; display: inline;">
                    <button type="submit">Logout</button>
                </form>
            </nav>
            <p id="user-info"></p>
        </header>

        <main>
            <h2>Your Cart</h2>
            <section>
                ${cartItemsHtml}
            </section>

            <p><strong>Total: $${total.toFixed(2)}</strong></p>

            <p><a href="/catalogue">← Continue Shopping</a></p>

            <form method="POST" action="/checkout">
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

// Order confirmation page after checkout simulation
app.get('/order-confirmation', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'order_confirmed.html'));
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

// Admin — view products list
// Only admins should be able to see this page
app.get('/admin/products', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_products.html'));
});

// Admin — add/edit product form
// Only admins should be able to see this page
app.get('/admin/products/add', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_product_form.html'));
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
    // TODO: validate input, check if email exists, add to users[]
    console.log('Signup data received:', req.body);
    res.send('Signup route placeholder – logic coming soon.');
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

// Add an item to the cart
app.post('/cart/add', (req, res) => {
    const { productId, productName, price, quantity } = req.body;

    if (!req.session.cart) {
        req.session.cart = [];
    }

    const existingItem = req.session.cart.find(item => item.productId == productId);

    if (existingItem) {
        existingItem.quantity += Number(quantity);
    } else {
        req.session.cart.push({
            productId: Number(productId),
            productName,
            price: Number(price),
            quantity: Number(quantity)
        });
    }

    console.log("Updated cart:", req.session.cart);

    res.redirect('/cart');
});

// Update quantity of an item in the cart
app.post('/cart/update', (req, res) => {
    const { productId, newQuantity } = req.body;

    if (!req.session.cart) {
        req.session.cart = [];
    }

    const item = req.session.cart.find(i => i.productId == productId);

    if (item) {
        item.quantity = Number(newQuantity);
    }

    console.log("Cart after update:", req.session.cart);

    res.redirect('/cart');
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
// Only logged-in users should be able to submit checkout
app.post('/checkout', requireLogin, (req, res) => {
    // Checkout form fields (from checkout.html)
    const { fullName, address, city, postalCode, cardNumber, expiry, cvv } = req.body;

    // Ensure there is a cart in the session
    const cart = req.session.cart || [];

    // If cart is empty, there is nothing to checkout
    if (cart.length === 0) {
        return res.status(400).send('Your cart is empty. Add items before checking out.');
    }

    // Get the logged-in user from the session
    const user = req.session.user;

    // Calculate the total price of the order
    const total = cart.reduce((sum, item) => {
        return sum + item.price * item.quantity;
    }, 0);

    // Create a new order object
    const newOrder = {
        id: nextOrderId++,              // unique order ID
        userEmail: user.email,
        userName: user.name,
        items: cart.map(item => ({      // make a shallow copy of the cart items
            productId: item.productId,
            productName: item.productName,
            price: item.price,
            quantity: item.quantity
        })),
        total: total,
        shipping: {
            fullName,
            address,
            city,
            postalCode
        },
        // Just stored for reference/debugging
        createdAt: new Date().toISOString()
    };

    // Save the order in our fake "orders" database
    orders.push(newOrder);

    // Clear the cart after successful checkout
    req.session.cart = [];

    console.log('New order created:', newOrder);

    // Redirect to a static "order confirmation" page
    res.redirect('/order-confirmation');
});

// ------------------------
// ADMIN POST ROUTES
// ------------------------

// Admin: add a new product
app.post('/admin/products/add', requireAdmin, (req, res) => {
    // TODO (later): push new product into products[]
    console.log('Admin add product:', req.body);
    res.send('Admin add product route placeholder – logic coming soon.');
});

// Admin: edit an existing product
app.post('/admin/products/edit/:id', requireAdmin, (req, res) => {
    // TODO (later): find product by req.params.id and update it
    console.log('Admin edit product id:', req.params.id, 'data:', req.body);
    res.send('Admin edit product route placeholder – logic coming soon.');
});

// Admin: delete a product
app.post('/admin/products/delete/:id', requireAdmin, (req, res) => {
    // TODO (later): remove product with this id from products[]
    console.log('Admin delete product id:', req.params.id);
    res.send('Admin delete product route placeholder – logic coming soon.');
});

// ----------------------------------------------------------
// START THE SERVER
// ----------------------------------------------------------
// This actually turns your computer into a web server.
// When you run `node server.js`, it will listen on port 8080.
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
