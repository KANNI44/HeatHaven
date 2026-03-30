const { body, query, param } = require('express-validator');
const pool = require('../config/db');
const { validate } = require('../middleware/error');

// ── GET /api/products ─────────────────────────────────────────────────────────
// Query params: brand, min_price, max_price, on_sale, search, page, limit
const getProducts = async (req, res, next) => {
  try {
    const { brand, min_price, max_price, on_sale, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where  = ['p.is_active = 1'];
    let params = [];

    if (brand)     { where.push('p.brand = ?');       params.push(brand); }
    if (on_sale)   { where.push('p.is_on_sale = 1');  }
    if (search)    { where.push('(p.name LIKE ? OR p.colorway LIKE ? OR p.brand LIKE ?)');
                     params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    // Price filter: compare against minimum variant sale_price of the product
    if (min_price) { where.push('(SELECT MIN(v.sale_price) FROM product_variants v WHERE v.product_id = p.id) >= ?'); params.push(parseFloat(min_price)); }
    if (max_price) { where.push('(SELECT MIN(v.sale_price) FROM product_variants v WHERE v.product_id = p.id) <= ?'); params.push(parseFloat(max_price)); }

    const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM products p ${whereStr}`, params
    );

    const [products] = await pool.query(
      `SELECT p.id, p.name, p.colorway, p.brand, p.image_main, p.image_hover, p.is_on_sale,
              p.created_at,
              (SELECT MIN(v.sale_price) FROM product_variants v WHERE v.product_id = p.id) AS min_price,
              (SELECT MAX(v.sale_price) FROM product_variants v WHERE v.product_id = p.id) AS max_price
         FROM products p ${whereStr}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // Attach variants to each product
    if (products.length) {
      const ids = products.map(p => p.id);
      const [variants] = await pool.query(
        `SELECT * FROM product_variants WHERE product_id IN (${ids.map(() => '?').join(',')}) ORDER BY size`,
        ids
      );
      const variantMap = {};
      for (const v of variants) {
        if (!variantMap[v.product_id]) variantMap[v.product_id] = [];
        variantMap[v.product_id].push(v);
      }
      for (const p of products) p.variants = variantMap[p.id] || [];
    }

    res.json({
      success: true,
      data: products,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) { next(err); }
};

// ── GET /api/products/:id ─────────────────────────────────────────────────────
const getProduct = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE id = ? AND is_active = 1', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Product not found.' });

    const product = rows[0];
    const [variants] = await pool.query(
      'SELECT * FROM product_variants WHERE product_id = ? ORDER BY size', [product.id]
    );
    product.variants = variants;

    res.json({ success: true, data: product });
  } catch (err) { next(err); }
};

// ── POST /api/products  (admin) ───────────────────────────────────────────────
const createProductRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('brand').trim().notEmpty().withMessage('Brand is required'),
  body('variants').isArray({ min: 1 }).withMessage('At least one variant is required'),
  body('variants.*.size').notEmpty(),
  body('variants.*.sale_price').isFloat({ min: 0 }),
  body('variants.*.original_price').isFloat({ min: 0 }),
];

const createProduct = [
  ...createProductRules, validate,
  async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const { name, colorway, brand, description, image_main, image_hover, is_on_sale, variants } = req.body;

      const [result] = await conn.query(
        `INSERT INTO products (name, colorway, brand, description, image_main, image_hover, is_on_sale)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, colorway || null, brand, description || null, image_main || null, image_hover || null, is_on_sale ? 1 : 0]
      );
      const productId = result.insertId;

      for (const v of variants) {
        await conn.query(
          `INSERT INTO product_variants (product_id, size, sale_price, original_price, stock) VALUES (?,?,?,?,?)`,
          [productId, v.size, v.sale_price, v.original_price, v.stock || 10]
        );
      }

      await conn.commit();
      res.status(201).json({ success: true, message: 'Product created.', productId });
    } catch (err) { await conn.rollback(); next(err); }
    finally { conn.release(); }
  },
];

// ── PUT /api/products/:id  (admin) ────────────────────────────────────────────
const updateProduct = async (req, res, next) => {
  try {
    const { name, colorway, brand, description, image_main, image_hover, is_on_sale, is_active } = req.body;
    const [result] = await pool.query(
      `UPDATE products
          SET name        = COALESCE(?, name),
              colorway    = COALESCE(?, colorway),
              brand       = COALESCE(?, brand),
              description = COALESCE(?, description),
              image_main  = COALESCE(?, image_main),
              image_hover = COALESCE(?, image_hover),
              is_on_sale  = COALESCE(?, is_on_sale),
              is_active   = COALESCE(?, is_active)
        WHERE id = ?`,
      [name, colorway, brand, description, image_main, image_hover,
       is_on_sale != null ? (is_on_sale ? 1 : 0) : null,
       is_active  != null ? (is_active  ? 1 : 0) : null,
       req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, message: 'Product updated.' });
  } catch (err) { next(err); }
};

// ── PUT /api/products/:id/variants/:variantId  (admin) ───────────────────────
const updateVariant = async (req, res, next) => {
  try {
    const { sale_price, original_price, stock } = req.body;
    await pool.query(
      `UPDATE product_variants
          SET sale_price     = COALESCE(?, sale_price),
              original_price = COALESCE(?, original_price),
              stock          = COALESCE(?, stock)
        WHERE id = ? AND product_id = ?`,
      [sale_price, original_price, stock, req.params.variantId, req.params.id]
    );
    res.json({ success: true, message: 'Variant updated.' });
  } catch (err) { next(err); }
};

// ── DELETE /api/products/:id  (admin) ────────────────────────────────────────
const deleteProduct = async (req, res, next) => {
  try {
    // Soft delete
    await pool.query('UPDATE products SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Product deactivated.' });
  } catch (err) { next(err); }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, updateVariant, deleteProduct };
