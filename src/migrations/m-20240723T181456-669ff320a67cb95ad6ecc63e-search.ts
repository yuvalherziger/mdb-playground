import { IMigration, Index } from "./scripts/migrate";
import { Document, MongoClient, ObjectId, SearchIndexDescription } from "mongodb";
import { logger } from "../common/logger";

/**
 *  Dos:
 *   - Implement rollback logic for any failure you'd like to avoid handling manually in the database.
 *   - Some MongoDB actions are idempotent - if you want to rely on non-idempotent actions,
 *     make sure you implement them accordingly.
 *   - Implement as many helper methods as you want.
 *   - If you're building a large index in an Atlas cluster, consider using a rolling build (see <Index> class).
 *   - Use the Index class to build new indexes. Example:
 *
 *       const ix = new Index({
 *         rolling: false, db: "db", collection: "coll", keys: [{ "foo": 1 }]
 *       });
 *       await ix.build();
 *
 *  Don'ts:
 *   - Avoid changing the file name.
 *   - Avoid changing the 'id' member's type or value.
 *   - Avoid removing the core methods: up(), dataUp(), down(), dataDown(). Removing them breaks your migration.
 *   - Avoid changing their signature either, for the same reason.
 *   - Avoid making any changes to the 'migrations' collection itself.
 */
export class Migration implements IMigration {

    /**
     * Name:        search
     * ID:          669ff320a67cb95ad6ecc63e
     * Created At:  20240723T181456
     */
    public readonly id: ObjectId = new ObjectId("669ff320a67cb95ad6ecc63e");
    public readonly createdAt: string = "20240723T181456";

    async up(client: MongoClient): Promise<void> {
        logger.info("Creating search index");
        const definition: Document = {
            mappings: {
                dynamic: false,
                fields: {
                    author: [
                        { type: "string" },
                        { type: "autocomplete" },
                        { type: "stringFacet" }
                    ],
                    title: [
                        { type: "string" },
                        { type: "autocomplete" }
                    ],
                    customer: [
                        { type: "string" },
                        { type: "autocomplete" },
                        { type: "stringFacet" }
                    ],
                    createdAt: [{ type: "date" }],
                    tags: [{ type: "string" }, { type: "stringFacet" }],
                }
            }
        };
        const searchIndex: SearchIndexDescription = {
            definition,
            type: "search",
            name: "reports_search"
        };
        await client.db("reviews").collection("reports").createSearchIndex(searchIndex);
        logger.info("Search index created");
    }

    async dataUp(client: MongoClient): Promise<void> {
        // TODO: implement data population forward logic
    }

    async down(client: MongoClient): Promise<void> {
        // TODO: implement schema and index rollback logic
    }

    async dataDown(client: MongoClient): Promise<void> {
        // TODO: implement data population rollback logic
    }
}
