// Ambient declarations for Cloudflare Worker types used by worker/src/
// These satisfy the root tsconfig type-check when importing from worker/src/routers

declare interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(): Promise<T[]>;
}

declare interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

declare interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1Result>;
  dump(): Promise<ArrayBuffer>;
}

// xlsx is in worker/node_modules — use a permissive ambient module declaration
declare module "xlsx" {
  const xlsx: any;
  export = xlsx;
}
