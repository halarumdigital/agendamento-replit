import session from "express-session";
import type { Express, RequestHandler } from "express";

// Simple hardcoded admin credentials for demo
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
  id: 1,
  email: 'admin@sistema.com',
  firstName: 'Administrador',
  lastName: 'Sistema'
};

export function getSession() {
  return session({
    secret: process.env.SESSION_SECRET || 'admin-system-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  });
}

export async function setupAuth(app: Express) {
  app.use(getSession());

  // Login route
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username e senha são obrigatórios" });
      }

      if (username !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      // Store admin in session
      (req.session as any).adminId = ADMIN_CREDENTIALS.id;
      
      res.json({ 
        message: "Login realizado com sucesso",
        admin: {
          id: ADMIN_CREDENTIALS.id,
          username: ADMIN_CREDENTIALS.username,
          email: ADMIN_CREDENTIALS.email,
          firstName: ADMIN_CREDENTIALS.firstName,
          lastName: ADMIN_CREDENTIALS.lastName,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Logout route
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  // Get current admin
  app.get('/api/auth/user', async (req, res) => {
    try {
      const adminId = (req.session as any)?.adminId;
      
      if (!adminId || adminId !== ADMIN_CREDENTIALS.id) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      res.json({
        id: ADMIN_CREDENTIALS.id,
        username: ADMIN_CREDENTIALS.username,
        email: ADMIN_CREDENTIALS.email,
        firstName: ADMIN_CREDENTIALS.firstName,
        lastName: ADMIN_CREDENTIALS.lastName,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    const adminId = (req.session as any)?.adminId;
    
    if (!adminId || adminId !== ADMIN_CREDENTIALS.id) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    // Add admin to request for use in routes
    (req as any).admin = ADMIN_CREDENTIALS;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ message: "Erro de autenticação" });
  }
};