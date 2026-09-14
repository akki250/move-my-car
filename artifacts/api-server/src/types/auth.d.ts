import type { MongoUser } from "../lib/mongo";

declare global {
  namespace Express {
    interface Request {
      mongoUser?: MongoUser;
    }
  }
}

export {};