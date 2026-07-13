const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { saveDatabase } = require('../database');

// Get user's orders
router.get('/', authenticateToken, (req, res) => {
  try {
    const orders = req.db.prepare(`
      SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC
    `).all(req.user.id);

    // Get items for each order
    const ordersWithItems = orders.map(order => {
      const items = req.db.prepare(`
        SELECT oi.quantity, oi.price, p.name, p.image
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `).all(order.id);
      return { ...order, items };
    });

    res.json(ordersWithItems);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const order = req.db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = req.db.prepare(`
      SELECT oi.quantity, oi.price, p.name, p.image
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(order.id);

    res.json({ ...order, items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create order from cart
router.post('/', authenticateToken, (req, res) => {
  try {
    const { shipping_address } = req.body;

    if (!shipping_address) {
      return res.status(400).json({ error: 'Shipping address is required' });
    }

    // Get cart items
    const cartItems = req.db.prepare(`
      SELECT ci.product_id, ci.quantity, p.price, p.stock, p.name
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ?
    `).all(req.user.id);

    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Check stock availability
    for (const item of cartItems) {
      if (item.quantity > item.stock) {
        return res.status(400).json({ 
          error: `Insufficient stock for "${item.name}". Available: ${item.stock}, requested: ${item.quantity}`
        });
      }
    }

    // Calculate total
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Create order
    const orderResult = req.db.prepare('INSERT INTO orders (user_id, total, shipping_address) VALUES (?, ?, ?)').run(req.user.id, total, shipping_address);
    const orderId = orderResult.lastInsertRowid;

    // Add order items
    const insertItem = req.db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
    const updateStock = req.db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

    const processOrder = req.db.transaction(() => {
      for (const item of cartItems) {
        insertItem.run(orderId, item.product_id, item.quantity, item.price);
        updateStock.run(item.quantity, item.product_id);
      }
      // Clear cart
      req.db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    });

    processOrder();
    saveDatabase();

    const order = req.db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const items = req.db.prepare(`
      SELECT oi.quantity, oi.price, p.name, p.image
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(orderId);

    res.status(201).json({ ...order, items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

module.exports = router;