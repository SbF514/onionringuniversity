import { Router, Request, Response } from 'express';
import { AuthMiddleware, AuthUser } from './AuthMiddleware';

export function createAuthRouter(auth: AuthMiddleware): Router {
  const router = Router();

  router.get('/me', async (req: Request, res: Response) => {
    const token = auth.extractTokenFromHeader(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await auth.verifyToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({ user });
  });

  return router;
}
