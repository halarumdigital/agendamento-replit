import session from "express-session";
import type { Express, RequestHandler } from "express";

export function getSession() {
  return session({
    secret: process.env.SESSION_SECRET || 'admin-system-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  });
}

export async function setupAuth(app: Express) {
  app.use(getSession());
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  try {
    const adminId = req.session.adminId;
    if (!adminId) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};