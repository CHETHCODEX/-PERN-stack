import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

export function authorizeRoles(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required before authorization check.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Role '${req.user.role}' is not authorized to access this resource.`,
        requiredRoles: allowedRoles,
      });
      return;
    }

    next();
  };
}
