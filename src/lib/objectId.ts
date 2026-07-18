import { ObjectId } from "bson";

/**
 * Generates a MongoDB ObjectId-shaped 24-character hex string. The original
 * Mongoose implementation used Mongo's native ObjectId as every document's
 * primary key, and the frontend's Zod validators (src/lib/validations.ts)
 * and TypeScript interfaces still expect that exact id shape on the wire.
 * Using `bson` (the id-generation library MongoDB drivers are built on)
 * keeps every new Prisma row's id well-formed and collision-resistant
 * without changing any validation rule or response shape.
 */
export function generateObjectId(): string {
  return new ObjectId().toString();
}
