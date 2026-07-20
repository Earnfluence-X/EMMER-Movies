import { compress, decompress } from "lz-string";

interface StorageOptions {
  compress?: boolean;
  encrypted?: boolean;
  secret?: string;
  ttl?: number; // Time to live in milliseconds
}

interface StorageItem<T> {
  value: T;
  timestamp: number;
  expires?: number;
}

export class SecureStorage {
  private static instance: SecureStorage;
  private encryptionKey: string | null = null;

  private constructor() {}

  static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  setEncryptionKey(key: string) {
    this.encryptionKey = key;
  }

  private async encrypt(data: string): Promise<string> {
    if (!this.encryptionKey) return data;
    
    // Simple encryption using Crypto API
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const keyBuffer = encoder.encode(this.encryptionKey);
    
    const key = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      dataBuffer
    );
    
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }

  private async decrypt(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) return encryptedData;
    
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const keyBuffer = new TextEncoder().encode(this.encryptionKey);
    const key = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
    
    return new TextDecoder().decode(decrypted);
  }

  async set<T>(
    key: string,
    value: T,
    options: StorageOptions = { compress: true, ttl: 7 * 24 * 60 * 60 * 1000 } // 7 days default
  ): Promise<void> {
    try {
      let data: StorageItem<T> = {
        value,
        timestamp: Date.now(),
        expires: options.ttl ? Date.now() + options.ttl : undefined,
      };

      let json = JSON.stringify(data);

      // Compress if enabled
      if (options.compress !== false) {
        json = compress(json);
      }

      // Encrypt if enabled
      if (options.encrypted && this.encryptionKey) {
        json = await this.encrypt(json);
      }

      localStorage.setItem(`emmer-storage-${key}`, json);
    } catch (error) {
      console.warn(`Failed to save ${key}:`, error);
      // Fallback: try without compression/encryption
      try {
        localStorage.setItem(`emmer-storage-${key}`, JSON.stringify({ value }));
      } catch (fallbackError) {
        console.error(`Failed to save ${key} even with fallback:`, fallbackError);
      }
    }
  }

  async get<T>(key: string, options: StorageOptions = {}): Promise<T | null> {
    try {
      const raw = localStorage.getItem(`emmer-storage-${key}`);
      if (!raw) return null;

      let json = raw;

      // Decrypt if encrypted
      if (options.encrypted && this.encryptionKey) {
        json = await this.decrypt(json);
      }

      // Decompress if compressed
      if (options.compress !== false) {
        json = decompress(json) || json;
      }

      const data: StorageItem<T> = JSON.parse(json);

      // Check expiration
      if (data.expires && Date.now() > data.expires) {
        localStorage.removeItem(`emmer-storage-${key}`);
        return null;
      }

      return data.value;
    } catch (error) {
      console.warn(`Failed to get ${key}:`, error);
      return null;
    }
  }

  remove(key: string): void {
    localStorage.removeItem(`emmer-storage-${key}`);
  }

  clear(): void {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith("emmer-storage-")) {
        localStorage.removeItem(key);
      }
    }
  }

  async getSize(): Promise<number> {
    let total = 0;
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("emmer-storage-")) {
        const item = localStorage.getItem(key);
        if (item) {
          total += item.length * 2; // Approximate byte size (UTF-16)
        }
      }
    }
    return total;
  }

  async getEstimatedQuota(): Promise<{ used: number; quota: number }> {
    const used = await this.getSize();
    const quota = localStorage.quota || 10 * 1024 * 1024; // 10MB fallback
    return { used, quota };
  }

  // Batch operations
  async batchSet(items: Array<{ key: string; value: any; options?: StorageOptions }>): Promise<void> {
    const operations = items.map(({ key, value, options }) => 
      this.set(key, value, options)
    );
    await Promise.all(operations);
  }

  async batchGet<T>(keys: string[], options?: StorageOptions): Promise<Record<string, T | null>> {
    const results: Record<string, T | null> = {};
    const operations = keys.map(key => 
      this.get<T>(key, options).then(value => {
        results[key] = value;
      })
    );
    await Promise.all(operations);
    return results;
  }
}

// Convenience exports
export const storage = SecureStorage.getInstance();

// Export specific storage utilities
export const storageUtils = {
  clearAll: () => storage.clear(),
  getQuota: () => storage.getEstimatedQuota(),
  getSize: () => storage.getSize(),
};

// Session storage wrapper
export class SessionStorage extends SecureStorage {
  static override getInstance(): SessionStorage {
    if (!(SessionStorage as any).instance) {
      (SessionStorage as any).instance = new SessionStorage();
    }
    return (SessionStorage as any).instance;
  }

  override async set<T>(key: string, value: T, options: StorageOptions = {}): Promise<void> {
    const data: StorageItem<T> = {
      value,
      timestamp: Date.now(),
      expires: options.ttl ? Date.now() + options.ttl : undefined,
    };
    sessionStorage.setItem(`emmer-session-${key}`, JSON.stringify(data));
  }

  override async get<T>(key: string): Promise<T | null> {
    const raw = sessionStorage.getItem(`emmer-session-${key}`);
    if (!raw) return null;
    const data: StorageItem<T> = JSON.parse(raw);
    if (data.expires && Date.now() > data.expires) {
      sessionStorage.removeItem(`emmer-session-${key}`);
      return null;
    }
    return data.value;
  }

  override remove(key: string): void {
    sessionStorage.removeItem(`emmer-session-${key}`);
  }

  override clear(): void {
    const keys = Object.keys(sessionStorage);
    for (const key of keys) {
      if (key.startsWith("emmer-session-")) {
        sessionStorage.removeItem(key);
      }
    }
  }
}

export const session = SessionStorage.getInstance();