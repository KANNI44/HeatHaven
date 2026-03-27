require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupDb() {
  // Connect without database first so we can create it
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  const db = process.env.DB_NAME || 'heathaven';
  console.log(`🔧  Setting up database: ${db}`);

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${db}\``);

  // ── USERS ─────────────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      name          VARCHAR(100)        NOT NULL,
      email         VARCHAR(150)        NOT NULL UNIQUE,
      password_hash VARCHAR(255)        NOT NULL,
      role          ENUM('user','admin') DEFAULT 'user',
      phone         VARCHAR(20),
      avatar        VARCHAR(255),
      created_at    TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP           DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
  console.log('  ✔ users');

  // ── ADDRESSES ─────────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS addresses (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      user_id     INT          NOT NULL,
      label       VARCHAR(50)  DEFAULT 'Home',
      line1       VARCHAR(255) NOT NULL,
      line2       VARCHAR(255),
      city        VARCHAR(100) NOT NULL,
      state       VARCHAR(100) NOT NULL,
      pincode     VARCHAR(10)  NOT NULL,
      country     VARCHAR(100) DEFAULT 'India',
      is_default  BOOLEAN      DEFAULT FALSE,
      created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);
  console.log('  ✔ addresses');

  // ── PRODUCTS ──────────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS products (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      name          VARCHAR(200)   NOT NULL,
      colorway      VARCHAR(200),
      brand         VARCHAR(100)   NOT NULL,
      description   TEXT,
      image_main    VARCHAR(255),
      image_hover   VARCHAR(255),
      is_on_sale    BOOLEAN        DEFAULT FALSE,
      is_active     BOOLEAN        DEFAULT TRUE,
      created_at    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
  console.log('  ✔ products');

  // ── PRODUCT VARIANTS (size × price) ───────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      product_id     INT            NOT NULL,
      size           VARCHAR(20)    NOT NULL,
      sale_price     DECIMAL(10,2)  NOT NULL,
      original_price DECIMAL(10,2)  NOT NULL,
      stock          INT            DEFAULT 10,
      UNIQUE KEY uq_product_size (product_id, size),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);
  console.log('  ✔ product_variants');

  // ── CART ──────────────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      user_id    INT NOT NULL,
      variant_id INT NOT NULL,
      qty        INT NOT NULL DEFAULT 1,
      added_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_variant (user_id, variant_id),
      FOREIGN KEY (user_id)    REFERENCES users(id)            ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);
  console.log('  ✔ cart_items');

  // ── WISHLIST ──────────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS wishlist (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      user_id    INT NOT NULL,
      product_id INT NOT NULL,
      added_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_product (user_id, product_id),
      FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);
  console.log('  ✔ wishlist');

  // ── ORDERS ────────────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id                  INT AUTO_INCREMENT PRIMARY KEY,
      user_id             INT            NOT NULL,
      address_id          INT,
      subtotal            DECIMAL(10,2)  NOT NULL,
      shipping            DECIMAL(10,2)  DEFAULT 0,
      total               DECIMAL(10,2)  NOT NULL,
      status              ENUM('pending','confirmed','shipped','delivered','cancelled') DEFAULT 'pending',
      payment_status      ENUM('unpaid','paid','refunded') DEFAULT 'unpaid',
      razorpay_order_id   VARCHAR(100),
      razorpay_payment_id VARCHAR(100),
      notes               TEXT,
      created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id)    REFERENCES users(id)     ON DELETE RESTRICT,
      FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL
    ) ENGINE=InnoDB
  `);
  console.log('  ✔ orders');

  // ── ORDER ITEMS ───────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      order_id      INT           NOT NULL,
      variant_id    INT           NOT NULL,
      product_name  VARCHAR(200)  NOT NULL,
      size          VARCHAR(20)   NOT NULL,
      price         DECIMAL(10,2) NOT NULL,
      qty           INT           NOT NULL,
      FOREIGN KEY (order_id)   REFERENCES orders(id)          ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB
  `);
  console.log('  ✔ order_items');

  // ── SEED: 4 Heat Haven products ───────────────────────────────────────
  const [existing] = await conn.query('SELECT COUNT(*) AS cnt FROM products');
  if (existing[0].cnt === 0) {
    console.log('\n🌱  Seeding products…');

    const products = [
      { name: 'Air Jordan 1 Retro High', colorway: 'Chicago Bulls', brand: 'jordan', image_main: 'images/aj 1 chichgo.png', image_hover: 'images/aj 1 chicago solo (1).png', is_on_sale: true,
        variants: [
          { size:'UK 6',  sale:22000, orig:27500 }, { size:'UK 7',  sale:23000, orig:28750 },
          { size:'UK 8',  sale:21500, orig:26900 }, { size:'UK 9',  sale:24000, orig:30000 },
          { size:'UK 10', sale:24500, orig:30600 }, { size:'UK 11', sale:25000, orig:31200 },
          { size:'UK 12', sale:25500, orig:31900 },
        ]
      },
      { name: 'Yeezy 700 V3', colorway: 'Azael', brand: 'yeezy', image_main: 'images/yzy 700 v3 azael.png', image_hover: 'images/yzy 700 v3 azael solo.png', is_on_sale: false,
        variants: [
          { size:'UK 6',  sale:12400, orig:15500 }, { size:'UK 7',  sale:13000, orig:16250 },
          { size:'UK 8',  sale:18000, orig:22500 }, { size:'UK 9',  sale:19000, orig:23750 },
          { size:'UK 10', sale:17000, orig:21250 }, { size:'UK 11', sale:20500, orig:25600 },
          { size:'UK 12', sale:20500, orig:25600 },
        ]
      },
      { name: 'Nike Uptempo Slide Bulls', colorway: 'Bulls', brand: 'nike', image_main: 'images/uptempo slide bulls.png', image_hover: 'images/uptempo slide bulls solo.png', is_on_sale: false,
        variants: [
          { size:'UK 6',  sale:26000, orig:32500 }, { size:'UK 7',  sale:21500, orig:26900 },
          { size:'UK 8',  sale:28000, orig:35000 }, { size:'UK 9',  sale:28000, orig:35000 },
          { size:'UK 10', sale:36000, orig:45000 }, { size:'UK 11', sale:47000, orig:58750 },
          { size:'UK 12', sale:33000, orig:41250 },
        ]
      },
      { name: 'Travis Scott x Fragment High', colorway: 'Fragment', brand: 'jordan', image_main: 'images/travis x fragment high.png', image_hover: 'images/travis x fragment high solo.png', is_on_sale: false,
        variants: [
          { size:'UK 6',  sale:94000,  orig:117500 }, { size:'UK 7',  sale:295000, orig:368750 },
          { size:'UK 8',  sale:306000, orig:382500 }, { size:'UK 9',  sale:218000, orig:272500 },
          { size:'UK 10', sale:222000, orig:277500 }, { size:'UK 11', sale:205000, orig:256250 },
          { size:'UK 12', sale:127000, orig:158750 },
        ]
      },
    ];

    for (const p of products) {
      const [res] = await conn.query(
        `INSERT INTO products (name, colorway, brand, image_main, image_hover, is_on_sale)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [p.name, p.colorway, p.brand, p.image_main, p.image_hover, p.is_on_sale]
      );
      const pid = res.insertId;
      for (const v of p.variants) {
        await conn.query(
          `INSERT INTO product_variants (product_id, size, sale_price, original_price, stock)
           VALUES (?, ?, ?, ?, ?)`,
          [pid, v.size, v.sale, v.orig, 10]
        );
      }
      console.log(`  ✔ ${p.name}`);
    }
  }

  await conn.end();
  console.log('\n✅  Database setup complete! Run: npm run dev\n');
}

setupDb().catch(err => { console.error(err); process.exit(1); });
