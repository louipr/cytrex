import { Router } from 'express';
import { ProductService } from '../services/ProductService';
import { LoggerService } from '../services/LoggerService';

const router = Router();
const productService = new ProductService();
const loggerService = new LoggerService();

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const products = await productService.getAllProducts();
    res.json(products);
  } catch (error) {
    loggerService.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    loggerService.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  try {
    const productData = req.body;
    const newProduct = await productService.createProduct(productData);
    res.status(201).json(newProduct);
  } catch (error) {
    loggerService.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

export { router as productRoutes };
