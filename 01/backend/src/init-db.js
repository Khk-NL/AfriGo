require('dotenv').config();

const mysql = require('mysql2/promise');
const path = require('path');

const attractionsLib = require(path.join(__dirname, '../../data/attractions.js'));
const recommendLib = require(path.join(__dirname, '../../data/recommend.js'));
const { COUNTRY_CODE_BY_ZH, normalizeCountryCode } = require('./countries');

const TABLE_SQL = `
CREATE TABLE IF NOT EXISTS attractions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_key VARCHAR(64) DEFAULT '',
  country_code CHAR(2) NOT NULL,
  country_zh VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  image VARCHAR(512) DEFAULT '',
  tags_json JSON,
  description TEXT,
  tips TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS recommend (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_key VARCHAR(64) DEFAULT '',
  country_code CHAR(2) NOT NULL,
  country_zh VARCHAR(64) NOT NULL,
  category VARCHAR(64) DEFAULT '',
  name VARCHAR(255) NOT NULL,
  rating VARCHAR(64) DEFAULT '',
  description TEXT,
  address VARCHAR(255) DEFAULT '',
  safety_tip TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openid VARCHAR(128) NOT NULL UNIQUE,
  nick_name VARCHAR(128) DEFAULT '',
  avatar_url VARCHAR(512) DEFAULT '',
  role VARCHAR(32) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_auth_sessions_user (user_id),
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  content TEXT,
  media_urls JSON,
  author_id INT NULL,
  author_openid VARCHAR(128) DEFAULT '',
  author_name VARCHAR(128) DEFAULT '',
  author_avatar VARCHAR(512) DEFAULT '',
  author_role VARCHAR(32) DEFAULT 'user',
  status VARCHAR(32) DEFAULT 'published',
  destination_label VARCHAR(128) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS post_likes (
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id),
  CONSTRAINT fk_post_likes_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_post_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS post_comments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  author_name VARCHAR(128) DEFAULT '',
  content VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_post_comments_post_created (post_id, created_at),
  CONSTRAINT fk_post_comments_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_post_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bookmarks (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  resource_type VARCHAR(32) NOT NULL,
  resource_id VARCHAR(128) NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(64) DEFAULT '',
  country_code CHAR(2) DEFAULT '',
  payload_json JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_bookmarks_user_resource (user_id, resource_type, country_code, resource_id),
  INDEX idx_bookmarks_user (user_id),
  CONSTRAINT fk_bookmarks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(64) DEFAULT 'system',
  title VARCHAR(255) NOT NULL,
  content TEXT,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user_created (user_id, created_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS country_guides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  country_code CHAR(2) NOT NULL UNIQUE,
  country_zh VARCHAR(64) NOT NULL UNIQUE,
  payload JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS trip_plans (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(80) NOT NULL,
  country_code CHAR(2) NOT NULL,
  country_zh VARCHAR(64) NOT NULL,
  purpose VARCHAR(24) NOT NULL DEFAULT 'travel',
  start_date DATE NULL,
  end_date DATE NULL,
  travelers TINYINT UNSIGNED NOT NULL DEFAULT 1,
  currency CHAR(3) NOT NULL DEFAULT 'CNY',
  budget_json JSON,
  visa_json JSON,
  checklist_json JSON,
  itinerary_text TEXT,
  bookings_json JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_trip_plans_user_updated (user_id, updated_at),
  CONSTRAINT fk_trip_plans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS trip_expenses (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  trip_id BIGINT NOT NULL,
  user_id INT NOT NULL,
  category VARCHAR(24) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'CNY',
  note VARCHAR(300) DEFAULT '',
  spent_on DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_trip_expenses_trip_created (trip_id, created_at),
  CONSTRAINT fk_trip_expenses_trip FOREIGN KEY (trip_id) REFERENCES trip_plans(id) ON DELETE CASCADE,
  CONSTRAINT fk_trip_expenses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS trip_reviews (
  trip_id BIGINT PRIMARY KEY,
  user_id INT NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  summary TEXT,
  highlights TEXT,
  lessons TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_trip_reviews_trip FOREIGN KEY (trip_id) REFERENCES trip_plans(id) ON DELETE CASCADE,
  CONSTRAINT fk_trip_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS service_providers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  country_code CHAR(2) NOT NULL,
  country_zh VARCHAR(64) NOT NULL,
  category VARCHAR(24) NOT NULL,
  name VARCHAR(120) NOT NULL,
  summary TEXT,
  qualification_note VARCHAR(500) DEFAULT '',
  source_url VARCHAR(500) DEFAULT '',
  contact_channel VARCHAR(40) DEFAULT '',
  contact_value VARCHAR(200) DEFAULT '',
  status VARCHAR(24) NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_service_providers_country_category (country_code, category, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS service_leads (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  provider_id BIGINT NULL,
  country_code CHAR(2) NOT NULL,
  category VARCHAR(24) NOT NULL,
  contact_name VARCHAR(80) NOT NULL,
  contact_value VARCHAR(160) NOT NULL,
  request_text TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_service_leads_user_created (user_id, created_at),
  INDEX idx_service_leads_status_created (status, created_at),
  CONSTRAINT fk_service_leads_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_service_leads_provider FOREIGN KEY (provider_id) REFERENCES service_providers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

async function connectWithProvidedAccounts() {
  const host = process.env.DB_HOST;
  const port = Number(process.env.DB_PORT || 3306);
  const dbName = process.env.DB_NAME;
  const attempts = [];
  if (process.env.DB_ROOT_PASSWORD) {
    attempts.push({
      user: 'root',
      password: process.env.DB_ROOT_PASSWORD,
      database: undefined
    });
  }
  attempts.push({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: dbName
  });

  let lastError;
  for (const attempt of attempts) {
    if (!attempt.user || !attempt.password) continue;
    try {
      const conn = await mysql.createConnection({
        host,
        port,
        user: attempt.user,
        password: attempt.password,
        database: attempt.database,
        charset: 'utf8mb4',
        connectTimeout: 10000
      });
      return { conn, user: attempt.user };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('无法使用提供的账号连接 MySQL');
}

async function ensureDatabase(conn, user) {
  const dbName = process.env.DB_NAME;
  if (!/^[A-Za-z0-9_]+$/.test(dbName || '')) throw new Error('DB_NAME 格式不合法');
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.query(`USE \`${dbName}\``);

  if (user === 'root' && process.env.DB_USER && process.env.DB_PASSWORD) {
    const appUser = process.env.DB_USER;
    const appPassword = process.env.DB_PASSWORD;
    const appHost = process.env.DB_APP_HOST || '127.0.0.1';
    if (!/^[A-Za-z0-9_-]+$/.test(appUser)) throw new Error('DB_USER 格式不合法');
    if (!/^[A-Za-z0-9.:%_-]+$/.test(appHost)) throw new Error('DB_APP_HOST 格式不合法');
    await conn.query(
      `CREATE USER IF NOT EXISTS '${appUser}'@'${appHost}' IDENTIFIED BY '${appPassword.replace(/'/g, "''")}'`
    );
    await conn.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON \`${dbName}\`.* TO '${appUser}'@'${appHost}'`);
    await conn.query('FLUSH PRIVILEGES');
  }
}

async function ensureColumn(conn, table, column, definition) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS total FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [process.env.DB_NAME, table, column]
  );
  if (!rows[0].total) {
    await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function migrateLegacySchema(conn) {
  await ensureColumn(conn, 'attractions', 'country_code', "CHAR(2) NOT NULL DEFAULT '' AFTER item_key");
  await ensureColumn(conn, 'recommend', 'country_code', "CHAR(2) NOT NULL DEFAULT '' AFTER item_key");
  await ensureColumn(conn, 'country_guides', 'country_code', "CHAR(2) NOT NULL DEFAULT '' AFTER id");
  await ensureColumn(conn, 'posts', 'author_id', 'INT NULL AFTER media_urls');

  const [tripUniqueIndexes] = await conn.query(
    `SELECT COUNT(*) AS total FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'trip_plans' AND INDEX_NAME = 'uk_trip_plans_user_country'`,
    [process.env.DB_NAME]
  );
  if (tripUniqueIndexes[0].total) {
    await conn.query('ALTER TABLE trip_plans DROP INDEX uk_trip_plans_user_country');
  }

  for (const [countryZh, countryCode] of Object.entries(COUNTRY_CODE_BY_ZH)) {
    for (const table of ['attractions', 'recommend', 'country_guides']) {
      await conn.query(
        `UPDATE \`${table}\` SET country_code = ? WHERE country_zh = ? AND country_code = ''`,
        [countryCode, countryZh]
      );
    }
  }
}

async function seedCollection(conn, table, sourceMap, buildRow) {
  const [countRows] = await conn.query(`SELECT COUNT(*) AS total FROM \`${table}\``);
  if (countRows[0].total > 0) {
    console.log(`${table}: already has ${countRows[0].total} rows, skip seed`);
    return;
  }

  const rows = [];
  Object.entries(sourceMap || {}).forEach(([countryZh, list]) => {
    (list || []).forEach((item) => {
      rows.push(buildRow(countryZh, item));
    });
  });

  for (const row of rows) {
    const keys = Object.keys(row);
    const sql = `INSERT INTO \`${table}\` (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`;
    await conn.query(sql, keys.map((key) => row[key]));
  }

  console.log(`${table}: inserted ${rows.length} rows`);
}

async function main() {
  const { conn, user } = await connectWithProvidedAccounts();
  console.log(`connected as ${user}`);
  await ensureDatabase(conn, user);

  for (const statement of TABLE_SQL.split(';').map((item) => item.trim()).filter(Boolean)) {
    await conn.query(statement);
  }
  await migrateLegacySchema(conn);
  console.log('tables ready');

  await seedCollection(conn, 'attractions', attractionsLib.attractions, (countryZh, item) => ({
    item_key: String(item.id || ''),
    country_code: normalizeCountryCode(countryZh),
    country_zh: countryZh,
    name: item.name || '',
    image: item.image || '',
    tags_json: JSON.stringify(item.tags || []),
    description: item.desc || '',
    tips: item.tips || ''
  }));

  await seedCollection(conn, 'recommend', recommendLib.recommend, (countryZh, item) => ({
    item_key: String(item.id || ''),
    country_code: normalizeCountryCode(countryZh),
    country_zh: countryZh,
    category: item.category || '',
    name: item.name || '',
    rating: item.rating || '',
    description: item.desc || '',
    address: item.address || '',
    safety_tip: item.safetyTip || ''
  }));

  await conn.end();
  console.log('init-db done');
}

main().catch((error) => {
  console.error('init-db failed:', error.code || '', error.message);
  process.exit(1);
});
