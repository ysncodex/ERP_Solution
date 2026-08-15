import type { Request, Response } from 'express';
import { loginSchema } from './auth.schema.js';
import { getPublicUserById, login, loginVisitor } from './auth.service.js';
import { ApiError } from '../../utils/ApiError.js';

export async function loginController(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const result = await login(input);
  res.json(result);
}

export async function visitorLoginController(_req: Request, res: Response) {
  const result = await loginVisitor();
  res.json(result);
}

export async function verifyController(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const user = await getPublicUserById(req.user.id);
  res.json({ valid: true, user });
}
