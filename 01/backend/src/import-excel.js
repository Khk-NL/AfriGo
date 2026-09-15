require('dotenv').config();

const mysql = require('mysql2/promise');
const { loadGuideWorkbook } = require('./excel-guide');

const TABLE_SQL = `
CREATE TABLE IF NOT EXISTS country_guides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  country_code CHAR(2) NOT NULL UNIQUE,
  country_zh VARCHAR(64) NOT NULL UNIQUE,
  payload JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

async function main() {
  const countries = loadGuideWorkbook();
  if (!countries.length) {
    throw new Error('Excel 里没有读到国家数据');
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    connectTimeout: 15000
  });

  await conn.query(TABLE_SQL);

  for (const payload of countries) {
    await conn.query(
      `INSERT INTO country_guides (country_code, country_zh, payload)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
      [payload.countryCode, payload.countryZh, JSON.stringify(payload)]
    );

    await conn.query('DELETE FROM attractions WHERE country_code = ?', [payload.countryCode]);
    for (const [index, item] of payload.attractionsList.entries()) {
      await conn.query(
        'INSERT INTO attractions (item_key, country_code, country_zh, name, image, tags_json, description, tips) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          `excel-${index + 1}`,
          payload.countryCode,
          payload.countryZh,
          item.name,
          item.image || '',
          JSON.stringify(item.tags || []),
          item.desc || '',
          item.tips || ''
        ]
      );
    }

    await conn.query('DELETE FROM recommend WHERE country_code = ?', [payload.countryCode]);
    for (const [index, item] of payload.recommendList.entries()) {
      await conn.query(
        'INSERT INTO recommend (item_key, country_code, country_zh, category, name, rating, description, address, safety_tip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          `excel-${index + 1}`,
          payload.countryCode,
          payload.countryZh,
          item.category || '',
          item.name || '',
          item.rating || '',
          item.desc || '',
          item.address || '',
          item.safetyTip || ''
        ]
      );
    }

    console.log(
      payload.countryZh,
      'visa', payload.visaItems.length,
      'attr', payload.attractionsList.length,
      'rec', payload.recommendList.length,
      'labor', payload.laborList.length,
      'phrases', payload.phrasesList.length
    );
  }

  await conn.end();
  console.log(`imported ${countries.length} countries`);
}

main().catch((error) => {
  console.error('import-excel failed:', error.code || '', error.message);
  process.exit(1);
});
