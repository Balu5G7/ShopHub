# 🛍️ ShopHub - E-Commerce Store

A full-stack e-commerce web application built with **Express.js** (backend) and **HTML/CSS/JavaScript** (frontend).

## ✨ Features

- **🛒 Shopping Cart** - Add, update, and remove items with real-time quantity controls
- **📦 Product Catalog** - 44 products across 5 categories with search and filter
- **🔐 User Authentication** - Register/login with JWT-based authentication
- **📋 Order Processing** - Place orders with shipping address and view order history
- **📱 Responsive Design** - Works seamlessly on desktop, tablet, and mobile

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Express.js (Node.js) |
| **Database** | SQLite (via sql.js) |
| **Authentication** | JWT (jsonwebtoken + bcryptjs) |
| **Frontend** | Vanilla HTML, CSS, JavaScript |
| **Icons** | Font Awesome 6 |

## 📂 Project Structure

```
ShopHub/
├── backend/                  # Express.js API server
│   ├── server.js             # Entry point (port 3001)
│   ├── database.js           # SQLite database with schema & seed data
│   ├── middleware/
│   │   └── auth.js           # JWT authentication middleware
│   └── routes/
│       ├── products.js       # Product listing, details, categories
│       ├── auth.js           # User registration & login
│       ├── cart.js           # Cart CRUD operations
│       └── orders.js         # Order creation & history
└── frontend/                 # Single-page application
    ├── index.html            # All views (home, product, cart, checkout, orders, login)
    ├── css/
    │   └── style.css         # Complete responsive styling
    └── js/
        ├── api.js            # API client with JWT token management
        └── app.js            # UI logic for all pages
```

## 🛠️ Installation & Setup

```bash
# Clone the repository
git clone https://github.com/Balu5G7/ShopHub.git
cd ShopHub/backend

# Install dependencies
npm install

# Start the server
node server.js
```

Open **http://localhost:3001** in your browser.

## 📡 API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:---:|
| `GET` | `/api/products` | List all products (supports `?category=` & `?search=`) | ❌ |
| `GET` | `/api/products/:id` | Get product details | ❌ |
| `GET` | `/api/products/categories` | List all categories | ❌ |
| `POST` | `/api/auth/register` | Register new user | ❌ |
| `POST` | `/api/auth/login` | Login user | ❌ |
| `GET` | `/api/auth/me` | Get current user info | ✅ |
| `GET` | `/api/cart` | Get cart items | ✅ |
| `POST` | `/api/cart` | Add item to cart | ✅ |
| `PUT` | `/api/cart/:id` | Update cart item quantity | ✅ |
| `DELETE` | `/api/cart/:id` | Remove item from cart | ✅ |
| `GET` | `/api/orders` | Get order history | ✅ |
| `POST` | `/api/orders` | Place order from cart | ✅ |

## 🏪 Sample Products

The database comes pre-seeded with **44 products** across 5 categories:

| Category | Count |
|----------|:-----:|
| Electronics | 13 |
| Home | 10 |
| Accessories | 8 |
| Clothing | 7 |
| Sports | 6 |

## 📄 License

MIT