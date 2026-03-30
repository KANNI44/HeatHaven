const pool = require('../config/db');

// GET /api/wishlist
const getWishlist = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT w.id, w.added_at, p.id AS product_id, p.name, p.colorway, p.brand, p.image_main, p.is_on_sale,
              (SELECT MIN(v.sale_price) FROM product_variants v WHERE v.product_id = p.id) AS from_price
         FROM wishlist w
         JOIN products p ON p.id = w.product_id
        WHERE w.user_id = ? AND p.is_active = 1
        ORDER BY w.added_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// POST /api/wishlist/:productId  (toggle)
const toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const [existing] = await pool.query(
      'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?',
      [req.user.id, productId]
    );

    if (existing.length) {
      await pool.query('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', [req.user.id, productId]);
      return res.json({ success: true, wishlisted: false, message: 'Removed from wishlist.' });
    }

    await pool.query('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)', [req.user.id, productId]);
    res.status(201).json({ success: true, wishlisted: true, message: '❤️ Saved to wishlist!' });
  } catch (err) { next(err); }
};

module.exports = { getWishlist, toggleWishlist };
