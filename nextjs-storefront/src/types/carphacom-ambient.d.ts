// Minimal ambient declarations for artifact-level diagnostics when dependencies
// are not installed in this copied public repository tree. Runtime packages are
// still declared in package.json and installed normally by users.

declare const process: {
  env: Record<string, string | undefined>;
};

declare module "pg" {
  export class Pool {
    constructor(config?: Record<string, unknown>);
    query<T = any>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
    end(): Promise<void>;
  }
}

declare module "next/cache" {
  export function revalidateTag(tag: string): void;
  export function revalidatePath(path: string, type?: "page" | "layout"): void;
}

declare module "next/server" {
  export class NextRequest extends Request {
    nextUrl: URL;
  }
  export class NextResponse extends Response {
    static json(body: unknown, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, init?: ResponseInit): NextResponse;
  }
}
