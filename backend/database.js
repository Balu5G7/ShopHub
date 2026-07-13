const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'ecommerce.db');

let db = null;

// Wrapper to mimic better-sqlite3 API using sql.js
const dbWrapper = {
  prepare(sql) {
    return {
      get(...params) {
        try {
          const stmt = db.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          if (stmt.step()) {
            const result = stmt.getAsObject();
            stmt.free();
            return result;
          }
          stmt.free();
          return undefined;
        } catch (e) {
          return undefined;
        }
      },
      all(...params) {
        const results = [];
        try {
          const stmt = db.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
        } catch (e) {
          // ignore
        }
        return results;
      },
      run(...params) {
        try {
          db.run(sql, params);
          const lastId = db.exec("SELECT last_insert_rowid() as id");
          const changes = db.exec("SELECT changes() as changes");
          return {
            lastInsertRowid: lastId.length > 0 ? lastId[0].values[0][0] : 0,
            changes: changes.length > 0 ? changes[0].values[0][0] : 0
          };
        } catch (e) {
          return { lastInsertRowid: 0, changes: 0 };
        }
      }
    };
  },
  exec(sql) {
    db.run(sql);
  },
  transaction(fn) {
    return (...args) => {
      db.run("BEGIN TRANSACTION");
      try {
        fn(...args);
        db.run("COMMIT");
      } catch (e) {
        db.run("ROLLBACK");
        throw e;
      }
    };
  }
};

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run("PRAGMA foreign_keys = ON");

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image TEXT,
      category TEXT,
      stock INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      shipping_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      UNIQUE(user_id, product_id)
    )
  `);

  // Seed sample products if table is empty
  const countResult = dbWrapper.prepare('SELECT COUNT(*) as count FROM products').get();
  if (countResult && countResult.count === 0) {
    const products = [
      ['Wireless Bluetooth Headphones', 'Premium noise-cancelling wireless headphones with 30-hour battery life and crystal-clear audio.', 79.99, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', 'Electronics', 50],
      ['Smart Watch Pro', 'Advanced smartwatch with health monitoring, GPS tracking, and 7-day battery life.', 199.99, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', 'Electronics', 30],
      ['Organic Cotton T-Shirt', 'Comfortable and sustainable organic cotton t-shirt available in multiple colors.', 29.99, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 'Clothing', 100],
      ['Leather Messenger Bag', 'Handcrafted genuine leather messenger bag with padded laptop compartment.', 89.99, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400', 'Accessories', 25],
      ['Stainless Steel Water Bottle', 'Double-walled vacuum insulated water bottle. Keeps drinks cold for 24 hours.', 24.99, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400', 'Home', 75],
      ['Mechanical Keyboard', 'RGB backlit mechanical keyboard with Cherry MX switches and aluminum frame.', 149.99, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400', 'Electronics', 40],
      ['Running Shoes Ultra', 'Lightweight responsive running shoes with advanced cushioning technology.', 129.99, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', 'Clothing', 60],
      ['Coffee Maker Deluxe', 'Programmable 12-cup coffee maker with built-in grinder and thermal carafe.', 69.99, 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=400', 'Home', 35],
      ['Wireless Charging Pad', 'Fast wireless charger compatible with all Qi-enabled devices.', 19.99, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400', 'Electronics', 80],
      ['Yoga Mat Premium', 'Extra thick non-slip yoga mat with carrying strap. Eco-friendly TPE material.', 39.99, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400', 'Sports', 45],
      ['Sunglasses Aviator', 'Classic aviator sunglasses with UV400 protection and gold frame.', 49.99, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', 'Accessories', 55],
      ['Backpack Explorer', 'Durable 40L hiking backpack with multiple compartments and rain cover.', 59.99, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', 'Accessories', 30],
      ['Portable Bluetooth Speaker', 'Waterproof portable speaker with 360-degree sound and 12-hour battery.', 45.99, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400', 'Electronics', 65],
      ['Denim Jacket Classic', 'Timeless denim jacket with a modern fit. 100% cotton.', 79.99, 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400', 'Clothing', 20],
      ['Desk Organizer Set', 'Modern bamboo desk organizer with pen holder, phone stand, and drawer.', 34.99, 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400', 'Home', 40],
      ['Fitness Tracker Band', 'Slim waterproof fitness tracker with heart rate monitor, step counter, and sleep tracking.', 49.99, 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400', 'Electronics', 70],
      ['Canvas Sneakers', 'Minimalist canvas sneakers with cushioned insole. Available in 8 colors.', 44.99, 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400', 'Clothing', 90],
      ['Cast Iron Skillet', 'Pre-seasoned 12-inch cast iron skillet. Oven safe up to 500°F.', 39.99, 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=400', 'Home', 45],
      ['Noise Canceling Earbuds', 'True wireless earbuds with active noise cancellation and spatial audio.', 129.99, 'https://images.unsplash.com/photo-1590658268037-6bf12f032f1e?w=400', 'Electronics', 55],
      ['Resistance Bands Set', 'Set of 5 resistance bands with different tension levels. Includes carry bag and exercise guide.', 24.99, 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=400', 'Sports', 100],
      ['Leather Wallet', 'Genuine leather bifold wallet with RFID blocking technology.', 34.99, 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400', 'Accessories', 65],
      ['Office Desk Lamp', 'LED desk lamp with adjustable brightness, color temperature, and USB charging port.', 54.99, 'https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=400', 'Home', 40],
      ['Polarized Sports Sunglasses', 'Lightweight sports sunglasses with polarized lenses and impact-resistant frame.', 39.99, 'https://images.unsplash.com/photo-1577803645773-f964db0a6e10?w=400', 'Accessories', 50],
      ['Electric Kettle', '1.7L stainless steel electric kettle with auto shut-off and boil-dry protection.', 29.99, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400', 'Home', 60],
      ['Gaming Mouse', 'Ergonomic gaming mouse with 16000 DPI sensor, RGB lighting, and 8 programmable buttons.', 59.99, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400', 'Electronics', 35],
      ['Hiking Boots', 'Waterproof leather hiking boots with Vibram outsole and ankle support.', 139.99, 'https://images.unsplash.com/photo-1520216182962-4ea41e10acb9?w=400', 'Clothing', 25],
      ['Crystal Whiskey Glasses', 'Set of 4 hand-blown crystal whiskey glasses with thick weighted base.', 49.99, 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400', 'Home', 30],
      ['Laptop Stand', 'Adjustable aluminum laptop stand with ventilated design for better airflow.', 34.99, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400', 'Electronics', 45],
      ['Travel Duffle Bag', 'Water-resistant 50L duffle bag with padded shoulder strap and shoe compartment.', 44.99, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', 'Accessories', 35],
      ['Foam Roller', 'High-density foam roller for muscle recovery and myofascial release.', 19.99, 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400', 'Sports', 80],
      ['Webcam HD', '1080p HD webcam with built-in microphone, privacy shutter, and auto-focus.', 44.99, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400', 'Electronics', 50],
      ['Winter Beanie Hat', 'Soft cashmere-blend beanie hat with fleece lining for extra warmth.', 22.99, 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400', 'Clothing', 85],
      ['Bamboo Cutting Board', 'Large bamboo cutting board with juice groove and easy-grip handles.', 27.99, 'https://images.unsplash.com/photo-1594226801341-41427b4e5c2b?w=400', 'Home', 55],
      ['Wireless Mouse', 'Slim wireless mouse with silent clicks, USB-C charging, and 3-month battery life.', 19.99, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400', 'Electronics', 75],
      ['Jump Rope', 'Speed jump rope with ball bearings and adjustable cable. Perfect for cardio workouts.', 14.99, 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', 'Sports', 90],
      ['Silk Tie Set', 'Premium silk tie set with matching pocket square. Available in various patterns.', 29.99, 'https://images.unsplash.com/photo-1589756823695-278bc923f5d3?w=400', 'Accessories', 40],
      ['Air Purifier', 'HEPA air purifier for rooms up to 300 sq ft. Captures 99.97% of airborne particles.', 149.99, 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400', 'Home', 20],
      ['Cycling Gloves', 'Padded cycling gloves with silicone grip and touchscreen-compatible fingertips.', 18.99, 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', 'Sports', 60],
      ['Portable Power Bank', '20000mAh portable charger with dual USB ports and fast charging support.', 34.99, 'https://images.unsplash.com/photo-1609592422607-ffc0e28d0e3c?w=400', 'Electronics', 70],
      ['Cashmere Scarf', 'Luxurious pure cashmere scarf. Ultra-soft and lightweight yet warm.', 59.99, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400', 'Clothing', 35],
      ['French Press Coffee Maker', '34oz stainless steel French press with 4-level filtration system.', 32.99, 'https://images.unsplash.com/photo-1568644396922-5d2c6af99b73?w=400', 'Home', 45],
      ['Tennis Racket', 'Lightweight graphite tennis racket with vibration dampening technology.', 89.99, 'https://images.unsplash.com/photo-1617083934555-ac7d4e0d0e9c?w=400', 'Sports', 25],
      ['Smart Plug', 'WiFi smart plug with energy monitoring and voice control compatibility.', 14.99, 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400', 'Electronics', 100],
      ['Analog Watch', 'Classic analog watch with leather strap, mineral glass, and Japanese movement.', 74.99, 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400', 'Accessories', 30]
    ];

    const insertProduct = dbWrapper.prepare(
      'INSERT INTO products (name, description, price, image, category, stock) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const insertMany = dbWrapper.transaction(() => {
      for (const item of products) {
        insertProduct.run(...item);
      }
    });

    insertMany();
    console.log('Sample products seeded successfully');
  }

  // Save database to file
  saveDatabase();

  return dbWrapper;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Auto-save periodically
setInterval(saveDatabase, 5000);

// Save on exit
process.on('exit', saveDatabase);
process.on('SIGINT', () => {
  saveDatabase();
  process.exit();
});

module.exports = { initDatabase, getDb: () => dbWrapper, saveDatabase };