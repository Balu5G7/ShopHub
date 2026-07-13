const express = require('express');
const router = express.Router();

// Get categories (must be before :id route)
router.get('/categories', (req, res) => {
  try {
    const categories = req.db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all();
    res.json(categories.map(c => c.category));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get all products
router.get('/', (req, res) => {
  try {
    const { category, search } = req.query;
    let products;
    
    if (category) {
      products = req.db.prepare('SELECT * FROM products WHERE category = ? ORDER BY created_at DESC').all(category);
    } else if (search) {
      products = req.db.prepare('SELECT * FROM products WHERE name LIKE ? OR description LIKE ? ORDER BY created_at DESC').all(`%${search}%`, `%${search}%`);
    } else {
      products = req.db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
    }
    
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product
router.get('/:id', (req, res) => {
  try {
    const product = req.db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

module.exports = router;