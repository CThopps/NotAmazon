// Load the Express framework (makes handling HTTP much easier)
const express = require('express');

// Built-in Node.js module to safely handle file paths
const path = require('path');

// Create an Express application
// `app` will be used to define routes (GET, POST, etc.)
const app = express();

// Port number where the server will run
// Access it at: http://localhost:8080
const port = 8080;


/**
 * Fake Database (In-Memory)
 * Theses arrays will act as our "database" for now until we add the SQL part.
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
 * MIDDLEWARE SETUP
 * Middleware = Code that runs BEFORE your routes
 * This allows Express to read data sent through HTML forms
 * (like signup, login, add-to-cart). Without this,
 * req.body will ALWAYS be empty.
 */
app.use(express.urlencoded({ extended: true }));

// This allows Express to handle JSON data (useful later)
app.use(express.json());

/**
 * Serve all files inside the "public" folder to the browser.
    * Example:
    * /index.html → public/index.html
    * /styles.css → public/styles.css
    * /image.png → public/image.png
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
// DEBUG ROUTES (TEMPORARY) - To test the fake database
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


// ----------------------------------------------------------
// POST ROUTES (Actions: signup, login, cart, checkout, admin)
// These are just placeholders to know the URLs.
// ----------------------------------------------------------

// Handle signup form submission
app.post('/signup', (req, res) => {
    // TODO: validate input, check if email exists, add to users[]
    console.log('Signup data received:', req.body);
    res.send('Signup route placeholder – logic coming soon.');
});

// Handle login form submission
app.post('/login', (req, res) => {
    // TODO: check email & password against users[]
    console.log('Login data received:', req.body);
    res.send('Login route placeholder – logic coming soon.');
});

// Handle logout action
app.post('/logout', (req, res) => {
    // TODO: destroy session / clear logged-in user
    console.log('Logout requested');
    res.send('Logout route placeholder – logic coming soon.');
});

// Add an item to the cart
app.post('/cart/add', (req, res) => {
    // TODO: read product info from body, update req.session.cart
    console.log('Add to cart data:', req.body);
    res.send('Add to cart route placeholder – logic coming soon.');
});

// Update quantity of an item in the cart
app.post('/cart/update', (req, res) => {
    // TODO: change quantity of an item in req.session.cart
    console.log('Update cart item:', req.body);
    res.send('Update cart route placeholder – logic coming soon.');
});

// Remove an item from the cart
app.post('/cart/remove', (req, res) => {
    // TODO: remove item from req.session.cart
    console.log('Remove from cart:', req.body);
    res.send('Remove from cart route placeholder – logic coming soon.');
});

// Handle checkout form submission
app.post('/checkout', (req, res) => {
    // TODO: create order from req.session.cart + user, push to orders[]
    console.log('Checkout data received:', req.body);
    res.send('Checkout route placeholder – logic coming soon.');
});

// ------------------------
// ADMIN POST ROUTES
// ------------------------

// Admin: add a new product
app.post('/admin/products/add', (req, res) => {
    // TODO: only allow admins, push new product into products[]
    console.log('Admin add product:', req.body);
    res.send('Admin add product route placeholder – logic coming soon.');
});

// Admin: edit an existing product
app.post('/admin/products/edit/:id', (req, res) => {
    // TODO: only allow admins, find product by req.params.id and update it
    console.log('Admin edit product id:', req.params.id, 'data:', req.body);
    res.send('Admin edit product route placeholder – logic coming soon.');
});

// Admin: delete a product
app.post('/admin/products/delete/:id', (req, res) => {
    // TODO: only allow admins, remove product with this id from products[]
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
