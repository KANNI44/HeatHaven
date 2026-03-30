# 🔥 Heat Haven Backend API

Node.js + Express + MySQL backend for the Heat Haven premium sneaker store.

---

## 📁 Project Structure

```
heathaven-backend/
├── config/
│   └── db.js                  # MySQL connection pool
├── controllers/
│   ├── authController.js       # Register, login, profile
│   ├── productController.js    # Products + variants CRUD
│   ├── cartController.js       # Cart management
│   ├── orderController.js      # Orders + admin
│   ├── paymentController.js    # Razorpay integration
│   ├── addressController.js    # Saved addresses
│   └── wishlistController.js   # Wishlist toggle
├── middleware/
│   ├── auth.js                 # JWT protect / adminOnly
│   └── error.js                # Global error handler + validator
├── routes/
│   ├── auth.js
│   ├── products.js
│   └── index.js                # cart, orders, payment, addresses, wishlist
├── utils/
│   └── setupDb.js              # Creates all tables + seeds products
├── .env.example
├── package.json
└── server.js                   # Entry point
```

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Create your .env file
```bash
cp .env.example .env
```
Fill in your MySQL credentials and Razorpay keys.

### 3. Create database & tables (run once)
```bash
npm run setup-db
```
This creates the `heathaven` database, all tables, and seeds your 4 products with all size variants.

### 4. Start the server
```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

Server runs at **http://localhost:5000**

---

## 🔑 Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default 5000) |
| `DB_HOST` | MySQL host |
| `DB_PORT` | MySQL port (default 3306) |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name (heathaven) |
| `JWT_SECRET` | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | Token expiry (e.g. 7d) |
| `RAZORPAY_KEY_ID` | From Razorpay dashboard |
| `RAZORPAY_KEY_SECRET` | From Razorpay dashboard |
| `FRONTEND_URL` | Your frontend URL for CORS |

---

## 📡 API Reference

All endpoints are prefixed with `/api`.
Protected routes require: `Authorization: Bearer <token>`

---

### 🔐 Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | ❌ | Create account |
| POST | `/auth/login` | ❌ | Login → get token |
| GET | `/auth/me` | ✅ | Get current user |
| PUT | `/auth/profile` | ✅ | Update name/phone |
| PUT | `/auth/change-password` | ✅ | Change password |

**Register body:**
```json
{
  "name": "Kanni",
  "email": "kanni@heathaven.in",
  "password": "secure123",
  "phone": "9205443488"
}
```

**Login response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": 1, "name": "Kanni", "email": "...", "role": "user" }
}
```

---

### 👟 Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/products` | ❌ | List all (with filters) |
| GET | `/products/:id` | ❌ | Single product + variants |
| POST | `/products` | Admin | Create product |
| PUT | `/products/:id` | Admin | Update product |
| PUT | `/products/:id/variants/:variantId` | Admin | Update size/price/stock |
| DELETE | `/products/:id` | Admin | Soft delete |

**Query params for GET /products:**
```
?brand=jordan
?on_sale=true
?min_price=10000&max_price=50000
?search=travis
?page=1&limit=10
```

**Response includes variants:**
```json
{
  "id": 1,
  "name": "Air Jordan 1 Retro High",
  "colorway": "Chicago Bulls",
  "brand": "jordan",
  "is_on_sale": true,
  "variants": [
    { "id": 1, "size": "UK 6", "sale_price": 22000, "original_price": 27500, "stock": 10 },
    { "id": 2, "size": "UK 7", "sale_price": 23000, "original_price": 28750, "stock": 10 }
  ]
}
```

---

### 🛒 Cart

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/cart` | ✅ | Get cart + totals |
| POST | `/cart` | ✅ | Add item |
| PUT | `/cart/:cartItemId` | ✅ | Update qty |
| DELETE | `/cart/:cartItemId` | ✅ | Remove item |
| DELETE | `/cart` | ✅ | Clear entire cart |

**Add to cart body:**
```json
{ "variant_id": 2, "qty": 1 }
```

**Cart response:**
```json
{
  "items": [...],
  "subtotal": 23000,
  "shipping": 1000,
  "total": 24000,
  "count": 1
}
```
> Free shipping on orders above ₹50,000 automatically applied.

---

### 📦 Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/orders` | ✅ | Place order (from cart) |
| GET | `/orders` | ✅ | My orders |
| GET | `/orders/:id` | ✅ | Order detail |
| PUT | `/orders/:id/cancel` | ✅ | Cancel order |
| GET | `/orders/admin/all` | Admin | All orders |
| PUT | `/orders/admin/:id/status` | Admin | Update status |

**Place order body:**
```json
{ "address_id": 1, "notes": "Please ring doorbell" }
```

---

### 💳 Payment (Razorpay)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/payment/create-order` | ✅ | Create Razorpay order |
| POST | `/payment/verify` | ✅ | Verify payment signature |
| POST | `/payment/webhook` | ❌ | Razorpay webhook |

**Full payment flow:**
1. `POST /orders` → get `orderId`
2. `POST /payment/create-order` with `{ order_id }` → get Razorpay order details
3. Open Razorpay checkout on frontend
4. On success: `POST /payment/verify` with the 3 Razorpay fields

**Verify body:**
```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "abc123..."
}
```

---

### 🏠 Addresses

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/addresses` | ✅ | My addresses |
| POST | `/addresses` | ✅ | Add address |
| PUT | `/addresses/:id` | ✅ | Update address |
| DELETE | `/addresses/:id` | ✅ | Delete address |

---

### ❤️ Wishlist

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/wishlist` | ✅ | My wishlist |
| POST | `/wishlist/:productId` | ✅ | Toggle (add/remove) |

---

## 🔌 Connecting to Your Frontend (index.html)

Replace the `localStorage` cart/wishlist in your frontend with API calls:

```javascript
const API = 'http://localhost:5000/api';
const token = localStorage.getItem('hh_token');
const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

// Add to cart
await fetch(`${API}/cart`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ variant_id: 5, qty: 1 })
});

// Get cart
const { data } = await (await fetch(`${API}/cart`, { headers })).json();
```

---

## 🛡️ Security Features

- **JWT** authentication with 7-day expiry
- **bcrypt** password hashing (12 rounds)
- **Helmet** security headers
- **CORS** whitelist
- **Rate limiting** — 30 req/15min on auth, 120 req/min globally
- **express-validator** on all inputs
- **Razorpay HMAC signature** verification
- **SQL injection safe** — all queries use parameterised statements

---

## 👑 Making a User Admin

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

---

## 📊 Database Schema

```
users          → id, name, email, password_hash, role, phone
addresses      → id, user_id, label, line1, city, state, pincode
products       → id, name, colorway, brand, image_main, is_on_sale
product_variants → id, product_id, size, sale_price, original_price, stock
cart_items     → id, user_id, variant_id, qty
wishlist       → id, user_id, product_id
orders         → id, user_id, address_id, subtotal, shipping, total, status, payment_status
order_items    → id, order_id, variant_id, product_name, size, price, qty
```
