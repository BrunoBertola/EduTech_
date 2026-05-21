const { Pool } = require('pg');

const poolConfig = {};
const connectionString = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL || process.env.POSTGRES_URL;

if (connectionString) {
  poolConfig.connectionString = connectionString;
} else {
  poolConfig.host = process.env.DB_HOST || 'localhost';
  poolConfig.port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;
  poolConfig.user = process.env.DB_USER || 'postgres';
  poolConfig.password = process.env.DB_PASSWORD || '';
  poolConfig.database = process.env.DB_NAME || 'elearning_platform';
}

const useSsl = process.env.DB_SSL === 'true' || (connectionString && process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false');
if (useSsl) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

poolConfig.max = 10;
poolConfig.idleTimeoutMillis = 30000;

const pool = new Pool(poolConfig);

async function query(sql, params) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      google_id VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT,
      role_id INT NOT NULL,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE CASCADE
    );

    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      cover_image VARCHAR(255),
      created_by INT,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id SERIAL PRIMARY KEY,
      course_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      order_number INT DEFAULT 1,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lesson_attachments (
      id SERIAL PRIMARY KEY,
      lesson_id INT NOT NULL,
      type VARCHAR(20) NOT NULL CHECK (type IN ('image', 'video', 'file', 'video_url')),
      filename VARCHAR(255),
      original_name VARCHAR(255),
      mime_type VARCHAR(100),
      url VARCHAR(500),
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tests (
      id SERIAL PRIMARY KEY,
      course_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      test_id INT NOT NULL,
      question TEXT NOT NULL,
      option_a VARCHAR(255) NOT NULL,
      option_b VARCHAR(255) NOT NULL,
      option_c VARCHAR(255) NOT NULL,
      correct_option CHAR(1) NOT NULL,
      FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE TABLE IF NOT EXISTS results (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      test_id INT NOT NULL,
      score INT NOT NULL,
      completed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_courses (
      user_id INT NOT NULL,
      course_id INT NOT NULL,
      enrolled_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (user_id, course_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await pool.query(`
    INSERT INTO roles (name) VALUES ('alumno'), ('profesor'), ('administrador')
    ON CONFLICT (name) DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO users (google_id, name, email, role_id)
    VALUES
      (
        'demo-admin-tfg',
        'Administrador Demo',
        'admin@tfgdemo.com',
        (SELECT id FROM roles WHERE name = 'administrador')
      ),
      (
        'demo-profesor-tfg',
        'Profesor Demo',
        'profesor@tfgdemo.com',
        (SELECT id FROM roles WHERE name = 'profesor')
      ),
      (
        'demo-alumno-tfg',
        'Alumno Demo',
        'alumno@tfgdemo.com',
        (SELECT id FROM roles WHERE name = 'alumno')
      )
    ON CONFLICT (email) DO UPDATE
    SET
      google_id = EXCLUDED.google_id,
      name = EXCLUDED.name,
      role_id = EXCLUDED.role_id;
  `);
}

module.exports = { pool, query, ensureSchema };