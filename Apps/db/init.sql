CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100),
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS allowed_domains (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO categories (name, description) VALUES
('Sieć', 'Problemy z siecią i połączeniami'),
('Oprogramowanie', 'Błędy i problemy aplikacji'),
('Sprzęt', 'Problemy ze sprzętem'),
('HR', 'Sprawy HR i personelu'),
('Inne', 'Inne zagadnienia')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS ticket_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Nowy',
    priority VARCHAR(50) DEFAULT 'Średni',
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    group_id INTEGER REFERENCES ticket_groups(id) ON DELETE SET NULL,
    creator_email VARCHAR(150),
    creator_name VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticket_group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES ticket_groups(id) ON DELETE CASCADE,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, ticket_id)
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    sender_email VARCHAR(150),
    sender_name VARCHAR(200),
    sender_type VARCHAR(20) DEFAULT 'user',
    content TEXT NOT NULL,
    attachments TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username, email, password_hash, first_name, last_name, role)
VALUES 
    ('njandaadmin', '169548@stud.prz.edu.pl', 'pbkdf2:sha256:600000$PaxELG9I35daAXeH$6b8ad09e5bbab11f1ab53557d19533950873d1ac4b95d0873790b0f27b7db40f', 'Natalia', 'Janda', 'admin'),
    ('kbajadmin', '169760@stud.prz.edu.pl', 'pbkdf2:sha256:600000$PaxELG9I35daAXeH$6b8ad09e5bbab11f1ab53557d19533950873d1ac4b95d0873790b0f27b7db40f', 'Kacper', 'Baj', 'admin'),
    ('kjarockiadmin', '169550@stud.prz.edu.pl', 'pbkdf2:sha256:600000$PaxELG9I35daAXeH$6b8ad09e5bbab11f1ab53557d19533950873d1ac4b95d0873790b0f27b7db40f', 'Kacper', 'Jarocki', 'admin')
ON CONFLICT (email) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_category_id ON tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender_id ON ticket_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_ticket_group_members_group_id ON ticket_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_ticket_group_members_ticket_id ON ticket_group_members(ticket_id);