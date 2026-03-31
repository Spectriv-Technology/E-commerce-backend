declare namespace Express {
  interface Request {
    user?: {
      userId: string;
      email: string;
      type: string;
    };
    customer?: {
      customerId: string;
      phone: string;
      type: string;
    };
    requestId?: string;
    rawBody?: Buffer;
  }
}
