declare namespace Express {
  interface Request {
    auth?: {
      id: string;
      phone: string;
      role: "admin" | "customer";
      type: string;
    };
    requestId?: string;
    rawBody?: Buffer;
  }
}
