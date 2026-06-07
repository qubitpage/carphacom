// Minimal ambient declarations for artifact-level diagnostics when dependencies
// are not installed in this copied public repository tree. Runtime packages are
// still declared in package.json and installed normally by users.

declare const process: {
  env: Record<string, string | undefined>;
};

interface Buffer extends Uint8Array {
  toString(encoding?: string): string;
}

declare const Buffer: {
  from(input: string | ArrayBuffer | ArrayBufferView | BlobPart, encoding?: string): Buffer;
};

declare const crypto: {
  randomUUID?: (options?: unknown) => string;
  getRandomValues?: <T extends ArrayBufferView>(array: T) => T;
  randomBytes?: (size: number) => Buffer;
};

declare module "pg" {
  export class Pool {
    constructor(config?: Record<string, unknown>);
    query<T = any>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
    end(): Promise<void>;
  }
}
