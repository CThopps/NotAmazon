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

// Shopping cart page
app.get('/cart', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cart.html'));
});

// Checkout form page
app.get('/checkout', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

// Order confirmation page after checkout simulation
app.get('/order-confirmation', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'order_confirmation.html'));
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
app.get('/admin/products', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_products.html'));
});

// Admin — add/edit product form
app.get('/admin/products/add', (req, res) => {
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
    const { email, password } = req.body;
    console.log('Login data received:', req.body);

    // Find matching user in our fake "users" database
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        console.log('Login failed for:', email);
        // For now, send a simple 401 (Unauthorized) message.
        // Later, we could redirect back to /login with an error message.
        return res.status(401).send('Invalid email or password.');
    }

    // Store minimal user info in the session so we know who is logged in
    req.session.user = {
        name: user.name,
        email: user.email,
        role: user.role
    };

    // Make sure the user has a cart in the session (create empty cart if not)
    if (!req.session.cart) {
        req.session.cart = [];
    }

    console.log('User logged in:', req.session.user);

    // After successful login, redirect to the home page (or wherever you like)
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
    // TODO (later): remove item from req.session.cart
    console.log('Remove from cart:', req.body);
    res.send('Remove from cart route placeholder – logic coming soon.');
});

// Handle checkout form submission
app.post('/checkout', (req, res) => {
    // TODO (later): create order from req.session.cart + req.session.user, push to orders[]
    console.log('Checkout data received:', req.body);
    res.send('Checkout route placeholder – logic coming soon.');
});

// ------------------------
// ADMIN POST ROUTES
// ------------------------

// Admin: add a new product
app.post('/admin/products/add', (req, res) => {
    // TODO (later): only allow admins, push new product into products[]
    console.log('Admin add product:', req.body);
    res.send('Admin add product route placeholder – logic coming soon.');
});

// Admin: edit an existing product
app.post('/admin/products/edit/:id', (req, res) => {
    // TODO (later): only allow admins, find product by req.params.id and update it
    console.log('Admin edit product id:', req.params.id, 'data:', req.body);
    res.send('Admin edit product route placeholder – logic coming soon.');
});

// Admin: delete a product
app.post('/admin/products/delete/:id', (req, res) => {
    // TODO (later): only allow admins, remove product with this id from products[]
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
