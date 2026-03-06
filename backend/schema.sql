-- Create the database
CREATE DATABASE IF NOT EXISTS sipcot_db;

USE sipcot_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM(
        'super_admin',
        'sipcot_admin',
        'industry_admin'
    ) NOT NULL,
    name VARCHAR(255) NOT NULL,
    sipcot_id VARCHAR(36) DEFAULT NULL,
    industry_id VARCHAR(36) DEFAULT NULL
);

-- SIPCOTs table
CREATE TABLE IF NOT EXISTS sipcots (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    district VARCHAR(255) NOT NULL
);

-- Industries table
CREATE TABLE IF NOT EXISTS industries (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sipcot_id VARCHAR(36) NOT NULL,
    FOREIGN KEY (sipcot_id) REFERENCES sipcots (id) ON DELETE CASCADE
);

-- Investments table
CREATE TABLE IF NOT EXISTS investments (
    id VARCHAR(36) PRIMARY KEY,
    industry_id VARCHAR(36) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    investment_date VARCHAR(20) NOT NULL,
    investment_type ENUM('Initial', 'Additional') NOT NULL,
    proof_file_name VARCHAR(255) DEFAULT NULL,
    proof_file_path VARCHAR(500) DEFAULT NULL,
    updated_date VARCHAR(20) NOT NULL,
    FOREIGN KEY (industry_id) REFERENCES industries (id) ON DELETE CASCADE
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(36) PRIMARY KEY,
    industry_id VARCHAR(36) NOT NULL,
    male INT NOT NULL DEFAULT 0,
    female INT NOT NULL DEFAULT 0,
    proof_file_name VARCHAR(255) DEFAULT NULL,
    proof_file_path VARCHAR(500) DEFAULT NULL,
    updated_date VARCHAR(20) NOT NULL,
    FOREIGN KEY (industry_id) REFERENCES industries (id) ON DELETE CASCADE
);

-- Term Loans table
CREATE TABLE IF NOT EXISTS term_loans (
    id VARCHAR(36) PRIMARY KEY,
    industry_id VARCHAR(36) NOT NULL,
    loan_amount DECIMAL(15, 2) NOT NULL,
    bank VARCHAR(255) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    tenure INT NOT NULL DEFAULT 0,
    emi DECIMAL(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    proof_file_name VARCHAR(255) DEFAULT NULL,
    proof_file_path VARCHAR(500) DEFAULT NULL,
    updated_date VARCHAR(20) NOT NULL,
    FOREIGN KEY (industry_id) REFERENCES industries (id) ON DELETE CASCADE
);

-- Power Usages table
CREATE TABLE IF NOT EXISTS power_usages (
    id VARCHAR(36) PRIMARY KEY,
    industry_id VARCHAR(36) NOT NULL,
    daily_usage DECIMAL(10, 2) NOT NULL DEFAULT 0,
    monthly_usage DECIMAL(10, 2) NOT NULL DEFAULT 0,
    power_source ENUM('TNEB', 'Generator', 'Solar') NOT NULL,
    connection_number VARCHAR(100) DEFAULT '',
    proof_file_name VARCHAR(255) DEFAULT NULL,
    proof_file_path VARCHAR(500) DEFAULT NULL,
    updated_date VARCHAR(20) NOT NULL,
    FOREIGN KEY (industry_id) REFERENCES industries (id) ON DELETE CASCADE
);

-- Turnovers table
CREATE TABLE IF NOT EXISTS turnovers (
    id VARCHAR(36) PRIMARY KEY,
    industry_id VARCHAR(36) NOT NULL,
    monthly_turnover DECIMAL(15, 2) NOT NULL DEFAULT 0,
    annual_turnover DECIMAL(15, 2) NOT NULL DEFAULT 0,
    financial_year VARCHAR(20) NOT NULL,
    proof_file_name VARCHAR(255) DEFAULT NULL,
    proof_file_path VARCHAR(500) DEFAULT NULL,
    updated_date VARCHAR(20) NOT NULL,
    FOREIGN KEY (industry_id) REFERENCES industries (id) ON DELETE CASCADE
);

-- CSR Entries table
CREATE TABLE IF NOT EXISTS csr_entries (
    id VARCHAR(36) PRIMARY KEY,
    industry_id VARCHAR(36) NOT NULL,
    activity_name VARCHAR(255) NOT NULL,
    description TEXT,
    amount_spent DECIMAL(15, 2) NOT NULL DEFAULT 0,
    activity_date VARCHAR(20) NOT NULL,
    location VARCHAR(255) DEFAULT '',
    proof_file_name VARCHAR(255) DEFAULT NULL,
    proof_file_path VARCHAR(500) DEFAULT NULL,
    updated_date VARCHAR(20) NOT NULL,
    FOREIGN KEY (industry_id) REFERENCES industries (id) ON DELETE CASCADE
);

-- Water Usages table
CREATE TABLE IF NOT EXISTS water_usages (
    id VARCHAR(36) PRIMARY KEY,
    industry_id VARCHAR(36) NOT NULL,
    daily_usage DECIMAL(10, 2) NOT NULL DEFAULT 0,
    monthly_usage DECIMAL(10, 2) NOT NULL DEFAULT 0,
    water_source ENUM('SIPCOT', 'Borewell', 'Both') NOT NULL,
    proof_file_name VARCHAR(255) DEFAULT NULL,
    proof_file_path VARCHAR(500) DEFAULT NULL,
    updated_date VARCHAR(20) NOT NULL,
    FOREIGN KEY (industry_id) REFERENCES industries (id) ON DELETE CASCADE
);

-- Insert default data
INSERT IGNORE INTO
    users (
        id,
        username,
        password,
        role,
        name
    )
VALUES (
        'sa1',
        'superadmin',
        'admin123',
        'super_admin',
        'Super Admin'
    );