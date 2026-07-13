const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Get cart items
router.get('/', authenticateToken, (req, res) => {
  try {
    const items = req.db.prepare(`
      SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price, p.image, p.stock
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ?
    `).all(req.user.id);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// Add to cart
router.post('/', authenticateToken, (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Check product exists and has stock
    const product = req.db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if already in cart
    const existing = req.db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(req.user.id, product_id);

    if (existing) {
      const newQty = Math.min(existing.quantity + quantity, product.stock);
      req.db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQty, existing.id);
    } else {
      req.db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)').run(req.user.id, product_id, Math.min(quantity, product.stock));
    }

    const items = req.db.prepare(`
      SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price, p.image, p.stock
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ?
    `).all(req.user.id);

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// Update cart item quantity
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { quantity } = req.body;
    const item = req.db.prepare('SELECT ci.*, p.stock FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.id = ? AND ci.user_id = ?').get(req.params.id, req.user.id);

    if (!item) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    if (quantity <= 0) {
      req.db.prepare('DELETE FROM cart_items WHERE id = ?').run(req.params.id);
    } else {
      req.db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(Math.min(quantity, item.stock), req.params.id);
    }

    const items = req.db.prepare(`
      SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price, p.image, p.stock
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ?
    `).all(req.user.id);

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

// Remove from cart
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const result = req.db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    const items = req.db.prepare(`
      SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price, p.image, p.stock
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ?
    `).all(req.user.id);

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

// Clear cart
router.delete('/', authenticateToken, (req, res) => {
  try {
    req.db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

module.exports = router;