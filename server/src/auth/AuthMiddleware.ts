export interface AuthUser {
  id: string;
  email: string;
}

export class AuthMiddleware {
  private secret: Uint8Array;
  private jwtVerify: any;

  constructor() {
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('SUPABASE_JWT_SECRET environment variable is required');
    }
    this.secret = new TextEncoder().encode(jwtSecret);
  }

  async init(): Promise<void> {
    const jose = await import('jose');
    this.jwtVerify = jose.jwtVerify;
  }

  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const { payload } = await this.jwtVerify(token, this.secret);
      return {
        id: (payload.sub as string) || '',
        email: (payload.email as string) || '',
      };
    } catch {
      return null;
    }
  }

  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.slice(7);
  }

  extractTokenFromUrl(url: string | undefined): string | null {
    if (!url) return null;
    try {
      const parsed = new URL(url, 'http://localhost');
      return parsed.searchParams.get('token');
    } catch {
      return null;
    }
  }
}
