-- USERS
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user'
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

INSERT INTO categories (name) VALUES
('IT'),
('Sprzęt'),
('HR'),
('Inne');

-- TICKETS
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'nowy',
    user_id INTEGER REFERENCES users(id),
    category_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TICKET MERGE (łączenie ticketów)
CREATE TABLE IF NOT EXISTS ticket_merge (
    id SERIAL PRIMARY KEY,
    parent_ticket_id INTEGER REFERENCES tickets(id),
    child_ticket_id INTEGER REFERENCES tickets(id)
);

-- ADMIN TESTOWY
INSERT INTO users (username, email, password_hash, role)
VALUES (
    'admin',
    'admin@test.com',
    'admin123',
    'admin'
);
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username, email)
VALUES 
('admin', 'admin@test.com'),
('test', 'test@test.com');

