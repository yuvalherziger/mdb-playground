import { IMigration, Index } from "./scripts/migrate";
import { MongoClient, ObjectId } from "mongodb";
import { logger } from "../common/logger";

/**
 *  Dos:
 *   - Implement rollback logic for any failure you'd like to avoid handling manually in the database.
 *   - Some MongoDB actions are idempotent - if you want to rely on non-idempotent actions,
 *     make sure you implement them (and their rollback) accordingly.
 *   - Implement as many helper methods as you want.
 *   - If you're building a large index in an Atlas cluster, consider using a rolling build (see <Index> class).
 *   - Use the Index class to build new indexes. Example:
 *
 *       const ix = new Index({
 *         rolling: false, db: "db", collection: "coll", keys: [{ "foo": 1 }]
 *       });
 *       await ix.build(client);
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
     * Name:        JIRA-214
     * ID:          66a3600b6b350f3ede3d0010
     * Created At:  20240726T083627
     */
    public readonly id: ObjectId = new ObjectId("66a3600b6b350f3ede3d0010");
    public readonly createdAt: string = "20240726T083627";

    async up(client: MongoClient): Promise<void> {
        // Regular/native index build
        const smallIx = new Index({
            rolling: false, db: "db", collection: "small_coll", keys: [{ "foo": 1 }]
        });
        await smallIx.build(client);


        // Rolling index build - will work only with Atlas, and relies on Atlas API environment variables (see README.md)
        const bigIx = new Index({
            rolling: true, db: "db", collection: "big_coll", keys: [{ "foo": 1 }]
        });
        await bigIx.build(client);
        logger.info("All set");
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
