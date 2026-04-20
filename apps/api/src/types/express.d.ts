declare global {
  namespace Express {
    interface Request {
      tenant: {
        id: string;
        slug: string;
        name: string;
        plan: string;
        accessMatrix?: unknown | null;
      };
      user?: {
        id: string;
        tenantId: string;
        email: string;
        role: string;
        firstName?: string;
        lastName?: string;
      };
    }
  }
}

export {};
