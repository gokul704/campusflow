declare global {
  namespace Express {
    interface Request {
      tenant: {
        id: string;
        slug: string;
        name: string;
        plan: string;
      };
      user?: {
        id: string;
        tenantId: string;
        email: string;
        role: string;
      };
    }
  }
}

export {};
