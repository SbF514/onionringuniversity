import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  email: string;
}

export class AuthMiddleware {
  private secret: string;

  constructor() {
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('SUPABASE_JWT_SECRET environment variable is required');
    }
    this.secret = jwtSecret;
  }

  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const payload = jwt.verify(token, this.secret) as any;
      return {
        id: payload.sub || '',
        email: payload.email || '',
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
