import { Db, MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const mongoDbUri: string | undefined = process.env.MONGODB_URI;
if (!mongoDbUri) {
    throw Error("No MongoDB URI!")
}

const appName = process.env["SERVICE_IDENTIFIER"] || "local-dev";

export const client: MongoClient = new MongoClient(mongoDbUri, { appName });

export function getReviewDb(): Db {
    return client.db("reviews");
}
