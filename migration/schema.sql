CREATE TABLE IF NOT EXISTS app_profiles (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 username VARCHAR(190) NOT NULL UNIQUE,
 email VARCHAR(190) NULL UNIQUE,
 phone VARCHAR(40) NULL UNIQUE,
 password_hash VARCHAR(255) NULL,
 full_name VARCHAR(150) NOT NULL,
 job_title VARCHAR(150) NULL,
 is_admin TINYINT(1) NOT NULL DEFAULT 0,
 is_active TINYINT(1) NOT NULL DEFAULT 1,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_profiles_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_projects (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 code VARCHAR(100) NULL UNIQUE,
 name VARCHAR(255) NOT NULL,
 client_name VARCHAR(255) NULL,
 contract_amount DECIMAL(20,2) NOT NULL DEFAULT 0,
 status ENUM('active','paused','completed') NOT NULL DEFAULT 'active',
 start_date DATE NULL,
 end_date DATE NULL,
 notes TEXT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS module_catalog (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 module ENUM('transactions','projects','finance','payroll','documents','technical','services') NOT NULL,
 parent_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 node_type ENUM('project','category') NOT NULL,
 name VARCHAR(255) NOT NULL,
 sort_order INT NOT NULL DEFAULT 0,
 created_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_catalog_parent FOREIGN KEY (parent_id) REFERENCES module_catalog(id) ON DELETE CASCADE,
 CONSTRAINT fk_catalog_creator FOREIGN KEY (created_by) REFERENCES app_profiles(id) ON DELETE SET NULL,
 INDEX idx_catalog_module_parent (module,parent_id,sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_employees (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 employee_no VARCHAR(100) NULL UNIQUE,
 full_name VARCHAR(150) NOT NULL,
 phone VARCHAR(40) NULL,
 job_title VARCHAR(150) NULL,
 project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 employment_status ENUM('active','inactive','on_leave') NOT NULL DEFAULT 'active',
 hire_date DATE NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_employees_project FOREIGN KEY (project_id) REFERENCES company_projects(id) ON DELETE SET NULL,
 INDEX idx_employees_name (full_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payroll_entries (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 employee_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 period_year INT NOT NULL,
 period_month INT NOT NULL,
 base_amount DECIMAL(20,2) NOT NULL DEFAULT 0,
 overtime_amount DECIMAL(20,2) NOT NULL DEFAULT 0,
 bonuses DECIMAL(20,2) NOT NULL DEFAULT 0,
 deductions DECIMAL(20,2) NOT NULL DEFAULT 0,
 status ENUM('draft','approved','paid') NOT NULL DEFAULT 'draft',
 notes TEXT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_payroll_employee FOREIGN KEY (employee_id) REFERENCES company_employees(id) ON DELETE CASCADE,
 CONSTRAINT fk_payroll_project FOREIGN KEY (project_id) REFERENCES company_projects(id) ON DELETE SET NULL,
 INDEX idx_payroll_period (period_year,period_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS financial_entries (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 entry_type ENUM('progress_bill','receipt','payment','purchase','other_income','other_expense') NOT NULL,
 title VARCHAR(255) NOT NULL,
 amount DECIMAL(20,2) NOT NULL,
 entry_date DATE NOT NULL DEFAULT (CURRENT_DATE),
 reference_no VARCHAR(150) NULL,
 status ENUM('draft','submitted','approved','rejected','paid') NOT NULL DEFAULT 'draft',
 notes TEXT NULL,
 created_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_financial_project FOREIGN KEY (project_id) REFERENCES company_projects(id) ON DELETE SET NULL,
 CONSTRAINT fk_financial_creator FOREIGN KEY (created_by) REFERENCES app_profiles(id) ON DELETE SET NULL,
 INDEX idx_financial_date (entry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS module_records (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 module ENUM('projects','finance','payroll','technical','documents','services','transactions') NOT NULL,
 title VARCHAR(255) NOT NULL,
 project_name VARCHAR(255) NULL,
 reference_no VARCHAR(150) NULL,
 amount DECIMAL(20,2) NOT NULL DEFAULT 0,
 status VARCHAR(100) NULL,
 responsible VARCHAR(150) NULL,
 details JSON NOT NULL,
 created_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_records_creator FOREIGN KEY (created_by) REFERENCES app_profiles(id) ON DELETE SET NULL,
 INDEX idx_records_module_created (module,created_at),
 INDEX idx_records_project (project_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_settings (
 setting_key VARCHAR(120) PRIMARY KEY,
 setting_value JSON NOT NULL,
 updated_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_settings_updater FOREIGN KEY (updated_by) REFERENCES app_profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
