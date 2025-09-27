// ============================================================================
// AUTO-GENERATED FROM OPUS IMPLEMENTATION
// Source files: intake/docs/complete_implementation.md
// Generated on: 2025-09-27T09:28:40.523Z
// ============================================================================

// Advanced caching with TTL and size management

export class CacheService {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private cacheDir: string;
  private maxSize: number;
  private ttl: number;
  private currentSize = 0;
  private logger = Logger.getInstance();

  constructor(config?: CacheConfig) {
    this.cacheDir = config?.directory || '.analyzer-cache';
    this.maxSize = config?.maxSize || 104857600; // 100MB
    this.ttl = config?.ttl || 3600000; // 1 hour
    
    this.ensureCacheDir();
    this.startCleanupTimer();
  }

  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.promises.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      this.logger.warn('Failed to create cache directory', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    // Check memory cache
    const memEntry = this.memoryCache.get(key);
    if (memEntry && !this.isExpired(memEntry)) {
      this.logger.debug(`Cache hit (memory): ${key}`);
      return memEntry.data as T;
    }

    // Check disk cache
    try {
      const filePath = this.getCacheFilePath(key);
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const diskEntry: CacheEntry = JSON.parse(content);
      
      if (!this.isExpired(diskEntry)) {
        // Restore to memory cache
        this.memoryCache.set(key, diskEntry);
        this.logger.debug(`Cache hit (disk): ${key}`);
        return diskEntry.data as T;
      }
    } catch (error) {
      // Cache miss
    }

    this.logger.debug(`Cache miss: ${key}`);
    return null;
  }

  async set(key: string, value: any): Promise<void> {
    const entry: CacheEntry = {
      data: value,
      timestamp: Date.now(),
      size: JSON.stringify(value).length
    };

    // Check size limit
    if (entry.size > this.maxSize) {
      this.logger.warn(`Cache entry too large: ${key} (${entry.size} bytes)`);
      return;
    }

    // Evict if necessary
    while (this.currentSize + entry.size > this.maxSize) {
      this.evictOldest();
    }

    // Store in memory
    this.memoryCache.set(key, entry);
    this.currentSize += entry.size;

    // Store on disk
    try {
      const filePath = this.getCacheFilePath(key);
      await fs.promises.writeFile(filePath, JSON.stringify(entry), 'utf-8');
    } catch (error) {
      this.logger.warn(`Failed to write cache to disk: ${key}`, error);
    }
  }

  async getProjectCacheKey(projectPath: string, config: AnalyzerConfig): Promise<string> {
    const configHash = crypto
      .createHash('md5')
      .update(JSON.stringify(config))
      .digest('hex');
    
    // Include file hashes for incremental caching
    const files = await this.getProjectFiles(projectPath);
    const fileHashes = await Promise.all(
      files.map(async file => {
        const content = await fs.promises.readFile(file, 'utf-8');
        return crypto.createHash('md5').update(content).digest('hex');
      })
    );
    
    const projectHash = crypto
      .createHash('md5')
      .update(fileHashes.sort().join(''))
      .digest('hex');
    
    return `project:${projectPath}:${configHash}:${projectHash}`;
  }

  private async getProjectFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];

    const walk = async (dir: string): Promise<void> => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'dist'].includes(entry.name)) {
            await walk(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };

    await walk(projectPath);
    return files;
  }

  private getCacheFilePath(key: string): string {
    const hash = crypto.createHash('md5').update(key).digest('hex');
    return path.join(this.cacheDir, `${hash}.json`);
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > this.ttl;
  }

  private evictOldest(): void {
    let oldest: [string, CacheEntry] | null = null;
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (!oldest || entry.timestamp < oldest[1].timestamp) {
        oldest = [key, entry];
      }
    }
    
    if (oldest) {
      this.memoryCache.delete(oldest[0]);
      this.currentSize -= oldest[1].size;
      this.logger.debug(`Evicted cache entry: ${oldest[0]}`);
    }
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanup();
    }, 300000); // Clean up every 5 minutes
  }

  private cleanup(): void {
    // Clean expired entries from memory
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
        this.currentSize -= entry.size;
      }
    }

    // Clean expired entries from disk
    this.cleanupDiskCache();
  }

  private async cleanupDiskCache(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.cacheDir);
      
      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = await fs.promises.stat(filePath);
        
        // Remove files older than TTL * 2
        if (Date.now() - stats.mtime.getTime() > this.ttl * 2) {
          await fs.promises.unlink(filePath);
          this.logger.debug(`Removed old cache file: ${file}`);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to cleanup disk cache', error);
    }
  }
}

interface CacheEntry {
  data: any;
  timestamp: number;
  size: number;
}

