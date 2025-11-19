declare module 'cache-manager-ioredis' {
  import { Store, StoreConfig } from 'cache-manager';
  
  export interface RedisStoreOptions extends StoreConfig {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    ttl?: number;
    [key: string]: any;
  }

  export function create(options: RedisStoreOptions): Store;
}
