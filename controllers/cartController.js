const Cart = require('../models/Cart');
const Product = require('../models/Product');

function computeTotalsFromItems(items) {
  const subtotal = items.reduce((sum, i) => sum + (i.unitPrice * i.qty), 0);
  const shipping = subtotal >= 50000 ? 0 : 1000;
  const tax = subtotal * 0.1;
  const total = subtotal + shipping + tax;
  return { subtotal, shipping, tax, total };
}

async function getCart(req, res) {
  const cart = await Cart.findOne({ userId: req.user._id }).lean();
  const items = (cart?.items || []).map(i => ({
    cartItemId: String(i._id || ''), // may be empty in lean; not relied on by our UI
    product: {
      legacyId: i.productLegacyId,
      name: i.product?.name,
      brand: i.product?.brand,
      colorway: i.product?.colorway,
      imageMain: i.imageMain,
    },
    size: i.size,
    qty: i.qty,
    unitPrice: i.unitPrice,
    lineTotal: i.unitPrice * i.qty,
    imageMain: i.imageMain,
    name: i.product?.name,
    brand: i.product?.brand,
    colorway: i.product?.colorway,
  }));

  // If we stored product names in cart items, keep backwards; but current cart schema doesn't embed product fields.
  // We'll rebuild items with product lookups for consistent UI.
  const enrichedItems = [];
  for (const item of items) {
    const product = await Product.findOne({ legacyId: item.product.legacyId, isActive: true }).lean();
    const variant = product?.variants?.find(v => v.size === item.size);
    enrichedItems.push({
      cartItemId: item.cartItemId,
      product: product
        ? { legacyId: product.legacyId, name: product.name, brand: product.brand, colorway: product.colorway, imageMain: product.imageMain }
        : item.product,
      name: product?.name || item.name || '',
      brand: product?.brand || item.brand || '',
      colorway: product?.colorway || item.colorway || '',
      imageMain: product?.imageMain || item.imageMain || '',
      size: item.size,
      qty: item.qty,
      unitPrice: item.unitPrice,
      lineTotal: item.unitPrice * item.qty,
      variantStock: variant?.stock ?? undefined,
    });
  }

  const totals = computeTotalsFromItems(enrichedItems);
  const count = enrichedItems.reduce((s, i) => s + i.qty, 0);

  res.json({
    success: true,
    data: {
      items: enrichedItems,
      count,
      ...totals,
    },
  });
}

async function addToCart(req, res) {
  const { productLegacyId, size, qty } = req.body || {};
  const productLegacy = Number(productLegacyId);
  const quantity = qty !== undefined ? Number(qty) : 1;
  const sizeStr = size ? String(size).trim() : '';

  if (!Number.isFinite(productLegacy) || !sizeStr) {
    return res.status(400).json({ success: false, message: 'productLegacyId and size are required' });
  }
  if (!Number.isFinite(quantity) || quantity < 1) {
    return res.status(400).json({ success: false, message: 'qty must be at least 1' });
  }

  const product = await Product.findOne({ legacyId: productLegacy, isActive: true });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

  const variant = product.variants.find(v => v.size === sizeStr);
  if (!variant) return res.status(404).json({ success: false, message: 'Size not found.' });
  if (variant.stock < quantity) return res.status(400).json({ success: false, message: 'Not enough stock.' });

  const cart = await Cart.findOne({ userId: req.user._id });
  const unitPrice = variant.price;

  const updateItemIndex = cart?.items?.findIndex(it => it.productLegacyId === productLegacy && it.size === sizeStr);
  if (!cart) {
    await Cart.create({
      userId: req.user._id,
      items: [
        {
          product: product._id,
          productLegacyId: productLegacy,
          size: sizeStr,
          qty: quantity,
          unitPrice,
          imageMain: product.imageMain,
        },
      ],
    });
    return getCart(req, res);
  }

  const existing = updateItemIndex !== undefined && updateItemIndex >= 0;
  if (existing) {
    const newQty = Math.min(20, cart.items[updateItemIndex].qty + quantity);
    if (variant.stock < newQty) return res.status(400).json({ success: false, message: 'Not enough stock.' });
    cart.items[updateItemIndex].qty = newQty;
    cart.items[updateItemIndex].unitPrice = unitPrice; // keep snapshot updated to latest
    cart.items[updateItemIndex].imageMain = product.imageMain;
  } else {
    cart.items.push({
      product: product._id,
      productLegacyId: productLegacy,
      size: sizeStr,
      qty: quantity,
      unitPrice,
      imageMain: product.imageMain,
    });
  }

  await cart.save();
  return getCart(req, res);
}

async function updateCartItem(req, res) {
  const { productLegacyId, size, qty } = req.body || {};
  const productLegacy = Number(productLegacyId);
  const quantity = qty !== undefined ? Number(qty) : undefined;
  const sizeStr = size ? String(size).trim() : '';

  if (!Number.isFinite(productLegacy) || !sizeStr) {
    return res.status(400).json({ success: false, message: 'productLegacyId and size are required' });
  }
  if (!Number.isFinite(quantity) || quantity < 1) {
    return res.status(400).json({ success: false, message: 'qty must be at least 1' });
  }

  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) return res.status(404).json({ success: false, message: 'Cart not found.' });

  const product = await Product.findOne({ legacyId: productLegacy, isActive: true });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
  const variant = product.variants.find(v => v.size === sizeStr);
  if (!variant) return res.status(404).json({ success: false, message: 'Size not found.' });
  if (variant.stock < quantity) return res.status(400).json({ success: false, message: 'Not enough stock.' });

  const idx = cart.items.findIndex(it => it.productLegacyId === productLegacy && it.size === sizeStr);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Cart item not found.' });

  cart.items[idx].qty = quantity;
  cart.items[idx].unitPrice = variant.price;
  cart.items[idx].imageMain = product.imageMain;

  await cart.save();
  return getCart(req, res);
}

async function removeCartItem(req, res) {
  const { productLegacyId, size } = req.body || {};
  const productLegacy = Number(productLegacyId);
  const sizeStr = size ? String(size).trim() : '';

  if (!Number.isFinite(productLegacy) || !sizeStr) {
    return res.status(400).json({ success: false, message: 'productLegacyId and size are required' });
  }

  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) return res.json({ success: true, message: 'Cart cleared.' });

  cart.items = cart.items.filter(it => !(it.productLegacyId === productLegacy && it.size === sizeStr));
  await cart.save();
  return getCart(req, res);
}

async function clearCart(req, res) {
  await Cart.deleteOne({ userId: req.user._id });
  res.json({ success: true, message: 'Cart cleared.' });
}

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart };

