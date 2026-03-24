// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: string; email: string };
  requestTraceId?: string;
}

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
const isHostEventsTraceRequest = (req: Request) => req.method === 'GET' && req.path === '/events';
const createTraceId = () => `host-events-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const shouldTrace = isHostEventsTraceRequest(req);
  const traceId = req.requestTraceId ?? createTraceId();
  req.requestTraceId = traceId;
  const authHeader = req.headers.authorization;

  if (shouldTrace) {
    console.log(`[HOST_EVENTS_TRACE ${traceId}] auth:start`, {
      method: req.method,
      path: req.path,
      hasAuthorizationHeader: Boolean(authHeader),
    });
  }

  if (!authHeader) {
    console.log('Auth Middleware: Missing Authorization Header');
    if (shouldTrace) {
      console.log(`[HOST_EVENTS_TRACE ${traceId}] auth:missing-authorization-header`);
    }
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log('Auth Middleware: Invalid Token Format');
    if (shouldTrace) {
      console.log(`[HOST_EVENTS_TRACE ${traceId}] auth:invalid-token-format`);
    }
    return res.status(401).json({ message: 'Unauthorized: Invalid token format' });
  }

  try {
    if (shouldTrace) {
      console.log(`[HOST_EVENTS_TRACE ${traceId}] auth:calling-supabase-getUser`);
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      if (shouldTrace) {
        console.log(`[HOST_EVENTS_TRACE ${traceId}] auth:invalid-token`, {
          error: error?.message ?? null,
          hasUser: Boolean(user),
        });
      }
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    // Attach basic user info
    req.user = { id: user.id as any, email: user.email! }; // Casting id to any/string as per interface change needed

    if (shouldTrace) {
      console.log(`[HOST_EVENTS_TRACE ${traceId}] auth:success`, {
        userId: user.id,
        email: user.email ?? null,
      });
    }

    next();
  } catch (err) {
    console.error('Auth check failed:', err);
    if (shouldTrace) {
      console.error(`[HOST_EVENTS_TRACE ${traceId}] auth:exception`, err);
    }
    return res.status(500).json({ message: 'Internal server error during auth' });
  }
};
