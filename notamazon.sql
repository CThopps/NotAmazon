-- =====================================================
--  Database & Tables for NotAmazon Demo Store
-- =====================================================

-- 1) Create database
CREATE DATABASE IF NOT EXISTS notamazon
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE notamazon;

-- =====================================================
-- 2) USERS TABLE
--    Stores customers + admins
-- =====================================================
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(50)  NOT NULL DEFAULT 'customer', -- 'admin' or 'customer'
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Seed users (matches what server.js expects)
INSERT INTO users (name, email, password, role) VALUES
  ('Admin User',    'admin@notamazon.com',    'admin123',    'admin'),
  ('Test Customer', 'customer@notamazon.com', 'customer123', 'customer');

-- =====================================================
-- 3) PRODUCTS TABLE
--    Items sold in the store
-- =====================================================
DROP TABLE IF EXISTS products;

CREATE TABLE products (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    price       DECIMAL(10,2) NOT NULL,
    stock       INT NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Seed initial products (10 items)
INSERT INTO products (name, price, stock, description) VALUES
  ('Basic Keyboard',       49.99,  10, 'A simple mechanical keyboard with blue switches.'),
  ('Gaming Mouse',         39.99,  15, 'High DPI gaming mouse with customizable buttons.'),
  ('Laptop Stand',         29.99,  20, 'Adjustable aluminum laptop stand for better ergonomics.'),
  ('USB-C Hub',            24.99,  25, 'Compact USB-C hub with HDMI, USB 3.0, and SD card reader.'),
  ('Wireless Headphones',  79.99,  12, 'Over-ear wireless headphones with noise isolation.'),
  ('27" Monitor',         199.99,   8, '27-inch 1080p monitor ideal for work and gaming.'),
  ('External SSD 1TB',    129.99,  18, 'Portable 1TB external SSD with fast USB-C connection.'),
  ('Mechanical Numpad',    34.99,  30, 'Standalone mechanical numpad with backlight.'),
  ('1080p Webcam',         59.99,  22, 'Full HD webcam with built-in microphone.'),
  ('Ergonomic Office Chair', 249.99, 5, 'Adjustable ergonomic office chair with lumbar support.');

-- =====================================================
-- 4) ORDERS TABLE
--    One row per order / checkout
-- =====================================================
DROP TABLE IF EXISTS orders;

CREATE TABLE orders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    total       DECIMAL(10,2) NOT NULL,
    full_name   VARCHAR(255) NOT NULL,
    address     VARCHAR(255) NOT NULL,
    city        VARCHAR(100) NOT NULL,
    province    VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20)  NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- (No seed data; orders will be created by your app)

-- =====================================================
-- 5) ORDER_ITEMS TABLE
--    Line items for each order
-- =====================================================
DROP TABLE IF EXISTS order_items;

CREATE TABLE order_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id   INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    price      DECIMAL(10,2) NOT NULL,  -- price at time of purchase
    quantity   INT NOT NULL,
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)  REFERENCES orders(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- No seed order_items; they get created during checkout.
