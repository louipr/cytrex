import express from 'express';
import cors from 'cors';
import { userRoutes } from './routes/userRoutes';
import { productRoutes } from './routes/productRoutes';
import { DatabaseService } from './services/DatabaseService';
import { LoggerService } from './services/LoggerService';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
const dbService = new DatabaseService();
const loggerService = new LoggerService();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  loggerService.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  loggerService.info(`Server running on port ${PORT}`);
});

export default app;
