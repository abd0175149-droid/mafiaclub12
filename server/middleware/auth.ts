import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'mafia-club-secret-key-change-in-production';
const JWT_EXPIRY = '24h';

export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  role: 'admin' | 'manager';
  photoURL?: string | null;
  permissions?: string[];
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, JWT_SECRET) as AuthUser;
}

// Middleware: require authentication
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح — يرجى تسجيل الدخول' });
  }

  try {
    const token = authHeader.split(' ')[1];
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'جلسة منتهية — يرجى إعادة تسجيل الدخول' });
  }
}

// Middleware: require admin role
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'هذه العملية مخصصة للمسؤولين فقط' });
  }
  next();
}

// Middleware: require specific granular permission or admin
export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Admin always overrides permissions, or check exact permission array
    if (req.user?.role === 'admin' || (req.user?.permissions && req.user.permissions.includes(permission))) {
      return next();
    }
    return res.status(403).json({ error: 'ليس لديك صلاحية الوصول' });
  };
}
