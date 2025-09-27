import { Router } from 'express';
import { UserService } from '../services/UserService';
import { LoggerService } from '../services/LoggerService';

const router = Router();
const userService = new UserService();
const loggerService = new LoggerService();

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    loggerService.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    loggerService.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const userData = req.body;
    const newUser = await userService.createUser(userData);
    res.status(201).json(newUser);
  } catch (error) {
    loggerService.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await userService.deleteUser(id);
    res.status(204).send();
  } catch (error) {
    loggerService.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export { router as userRoutes };
