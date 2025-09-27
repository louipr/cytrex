export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ProductService {
  private products: Product[] = [];

  async getAllProducts(): Promise<Product[]> {
    return [...this.products];
  }

  async getProductById(id: string): Promise<Product | null> {
    return this.products.find(product => product.id === id) || null;
  }

  async createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const now = new Date();
    const newProduct: Product = {
      id: Math.random().toString(36).substr(2, 9),
      ...productData,
      createdAt: now,
      updatedAt: now
    };
    
    this.products.push(newProduct);
    return newProduct;
  }

  async updateProduct(id: string, productData: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<Product | null> {
    const productIndex = this.products.findIndex(product => product.id === id);
    
    if (productIndex === -1) {
      return null;
    }
    
    this.products[productIndex] = {
      ...this.products[productIndex],
      ...productData,
      updatedAt: new Date()
    };
    
    return this.products[productIndex];
  }

  async deleteProduct(id: string): Promise<boolean> {
    const productIndex = this.products.findIndex(product => product.id === id);
    
    if (productIndex === -1) {
      return false;
    }
    
    this.products.splice(productIndex, 1);
    return true;
  }

  // Dead methods - part of inventory management that was never implemented
  async getProductsByCategory(category: string): Promise<Product[]> {
    return this.products.filter(product => product.category === category);
  }

  private async updateInventoryCount(productId: string, count: number): Promise<void> {
    // This was for inventory tracking that never got built
    console.log(`Would update inventory for ${productId} to ${count}`);
  }
}
