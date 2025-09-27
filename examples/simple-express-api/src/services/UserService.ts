export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserService {
  private users: User[] = [];

  async getAllUsers(): Promise<User[]> {
    return [...this.users];
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const now = new Date();
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      ...userData,
      createdAt: now,
      updatedAt: now
    };
    
    this.users.push(newUser);
    return newUser;
  }

  async updateUser(id: string, userData: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    const userIndex = this.users.findIndex(user => user.id === id);
    
    if (userIndex === -1) {
      return null;
    }
    
    this.users[userIndex] = {
      ...this.users[userIndex],
      ...userData,
      updatedAt: new Date()
    };
    
    return this.users[userIndex];
  }

  async deleteUser(id: string): Promise<boolean> {
    const userIndex = this.users.findIndex(user => user.id === id);
    
    if (userIndex === -1) {
      return false;
    }
    
    this.users.splice(userIndex, 1);
    return true;
  }

  // Dead method - was part of email notification feature that was removed
  private async sendWelcomeEmail(user: User): Promise<void> {
    // This method is never called anywhere
    console.log(`Would send welcome email to ${user.email}`);
  }
}
