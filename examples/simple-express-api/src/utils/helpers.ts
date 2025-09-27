// DEAD FILE - Legacy utility functions that are no longer used
// These were helper functions from an earlier version of the API
// Most functionality has been moved to service classes

export function formatDate(date: Date): string {
  // This function is never called
  return date.toISOString().split('T')[0];
}

export function generateId(): string {
  // This is unused, services use Math.random approach instead
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function validateEmail(email: string): boolean {
  // Email validation was moved to middleware
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeInput(input: string): string {
  // Input sanitization is now handled by express middleware
  return input.trim().replace(/[<>\"']/g, '');
}

export class LegacyCache {
  private cache: Map<string, any> = new Map();

  set(key: string, value: any, ttl: number = 300): void {
    // This cache was replaced by Redis
    setTimeout(() => {
      this.cache.delete(key);
    }, ttl * 1000);
    
    this.cache.set(key, value);
  }

  get(key: string): any {
    return this.cache.get(key);
  }

  clear(): void {
    this.cache.clear();
  }
}
