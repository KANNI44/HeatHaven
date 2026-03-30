const Product = require('../models/Product');

function parseNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

async function getProducts(req, res) {
  const { category, brand, q, minPrice, maxPrice } = req.query || {};
  const min = minPrice !== undefined ? parseNumber(minPrice) : undefined;
  const max = maxPrice !== undefined ? parseNumber(maxPrice) : undefined;

  const filter = { isActive: true };
  if (category) filter.category = String(category);
  if (brand) filter.brand = String(brand);

  let products = await Product.find(filter).lean();

  if (q) {
    const query = String(q).toLowerCase();
    products = products.filter(
      p =>
        p.name?.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query) ||
        p.colorway?.toLowerCase().includes(query)
    );
  }

  if (min !== undefined || max !== undefined) {
    products = products.filter(p => {
      const prices = (p.variants || []).map(v => v.price);
      const inRange = prices.some(price => {
        if (min !== undefined && price < min) return false;
        if (max !== undefined && price > max) return false;
        return true;
      });
      return inRange;
    });
  }

  res.json({ success: true, data: products });
}

async function getProduct(req, res) {
  const legacyId = Number(req.params.legacyId);
  if (!Number.isFinite(legacyId)) return res.status(400).json({ success: false, message: 'Invalid legacyId' });

  const product = await Product.findOne({ legacyId, isActive: true }).lean();
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

  res.json({ success: true, data: product });
}

async function createProduct(req, res) {
  const body = req.body || {};
  const { legacyId, name, brand, colorway, category, imageMain, isActive = true, variants } = body;

  if (!legacyId || !name || !brand) return res.status(400).json({ success: false, message: 'legacyId,name,brand are required' });
  if (!Array.isArray(variants) || !variants.length) return res.status(400).json({ success: false, message: 'variants[] is required' });

  const product = await Product.create({
    legacyId: Number(legacyId),
    name: String(name).trim(),
    brand: String(brand).trim(),
    colorway: colorway ? String(colorway).trim() : '',
    category: category ? String(category).trim() : 'all',
    imageMain: imageMain ? String(imageMain).trim() : '',
    isActive: Boolean(isActive),
    variants: variants.map(v => ({
      size: String(v.size).trim(),
      price: Number(v.price),
      stock: Number(v.stock ?? 0),
    })),
  });

  res.status(201).json({ success: true, message: 'Product created.', data: product });
}

async function updateProduct(req, res) {
  const legacyId = Number(req.params.legacyId);
  if (!Number.isFinite(legacyId)) return res.status(400).json({ success: false, message: 'Invalid legacyId' });

  const body = req.body || {};
  const updates = {};
  if (body.name !== undefined) updates.name = String(body.name).trim();
  if (body.brand !== undefined) updates.brand = String(body.brand).trim();
  if (body.colorway !== undefined) updates.colorway = String(body.colorway).trim();
  if (body.category !== undefined) updates.category = String(body.category).trim();
  if (body.imageMain !== undefined) updates.imageMain = String(body.imageMain).trim();
  if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);
  if (body.variants !== undefined) {
    if (!Array.isArray(body.variants) || !body.variants.length) return res.status(400).json({ success: false, message: 'variants[] must be non-empty' });
    updates.variants = body.variants.map(v => ({
      size: String(v.size).trim(),
      price: Number(v.price),
      stock: Number(v.stock ?? 0),
    }));
  }

  const product = await Product.findOneAndUpdate({ legacyId }, updates, { new: true });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

  res.json({ success: true, message: 'Product updated.', data: product });
}

async function updateVariant(req, res) {
  const legacyId = Number(req.params.legacyId);
  const size = String(req.params.size);
  const { price, stock } = req.body || {};

  if (!Number.isFinite(legacyId)) return res.status(400).json({ success: false, message: 'Invalid legacyId' });
  if (price === undefined && stock === undefined) return res.status(400).json({ success: false, message: 'Provide price and/or stock' });

  const product = await Product.findOne({ legacyId });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

  const idx = product.variants.findIndex(v => v.size === size);
  if (idx === -1) {
    if (price === undefined || stock === undefined) return res.status(400).json({ success: false, message: 'New variant needs price and stock' });
    product.variants.push({ size, price: Number(price), stock: Number(stock) });
  } else {
    if (price !== undefined) product.variants[idx].price = Number(price);
    if (stock !== undefined) product.variants[idx].stock = Number(stock);
  }

  await product.save();
  res.json({ success: true, message: 'Variant updated.', data: product });
}

async function deleteProduct(req, res) {
  const legacyId = Number(req.params.legacyId);
  if (!Number.isFinite(legacyId)) return res.status(400).json({ success: false, message: 'Invalid legacyId' });

  const product = await Product.findOneAndDelete({ legacyId });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

  res.json({ success: true, message: 'Product deleted.' });
}

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  updateVariant,
  deleteProduct,
};

