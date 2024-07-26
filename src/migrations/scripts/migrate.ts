import { Collection, CreateIndexesOptions, IndexSpecification, MongoClient, ObjectId } from "mongodb";
import { client } from "../../common/db";
import { logger } from "../../common/logger";
import AxiosDigestAuth from "@mhoc/axios-digest-auth";
import * as url from "url";
import dotenv from "dotenv";
import path from "path";
import { promises as fs } from "fs";

const BASE_PATH: string = "src/migrations/";
const resolvedPath: string = path.join(process.cwd(), BASE_PATH);

type MigrationDoc = {
    _id: ObjectId;
    appliedAt: Date;
};

dotenv.config();

export interface IMigration {
    up(client: MongoClient): Promise<void>;

    dataUp(client: MongoClient): Promise<void>;

    down(client: MongoClient): Promise<void>;

    dataDown(client: MongoClient): Promise<void>;
}

type IndexConfig = {
    rolling: boolean,
    db: string,
    collection: string,
    keys: IndexSpecification | IndexSpecification[],
    options?: CreateIndexesOptions
}

export class Index {
    constructor(private config: IndexConfig) {
    }

    async build(mongoClient: MongoClient): Promise<void> {
        if (this.config.rolling) {
            await this.rollingBuild();
        } else {
            await this.nativeBuild(mongoClient);
        }
    }

    async nativeBuild(mongoClient: MongoClient): Promise<string> {
        const collection: Collection = mongoClient.db(this.config.db).collection(this.config.collection);
        const indexName: string = await collection.createIndex(
            Array.isArray(this.config.keys) ? this.config.keys[0] : this.config.keys,
            this.config.options
        )
        logger.info("Index '%s' created", indexName);
        return indexName;
    }

    async rollingBuild(): Promise<string | void> {
        const baseUri = process.env["ATLAS_API_BASE_URI"];
        const username = process.env["ATLAS_PUBLIC_KEY"];
        const password = process.env["ATLAS_PRIVATE_KEY"];
        if (!username || !password || !baseUri) {
            logger.warning("Insufficient configuration for rolling index builds")
            return;
        }
        const headers: { [header: string]: string } = {
            "Accept": "application/vnd.atlas.2023-02-01+json",
            "Content-Type": "application/json",
        };
        const data: any = {
            db: this.config.db,
            collection: this.config.collection,
            keys: this.config.keys,
            // options: this.options
        };
        if (this.config.options && Object.keys(this.config.options).length) {
            data.options = this.config.options;
        }

        console.log(data);
        const digestAuth = new AxiosDigestAuth({
            username,
            password,
        });
        console.log(url.resolve(baseUri, "index"));
        try {
            const response = await digestAuth.request({
                method: "POST",
                url: url.resolve(baseUri, "index"),
                headers,
                data
            });
        } catch (e) {
            console.log(e);
        }

        return "";
    }
}

type MigrationFile = {
    id: string,
    fileName: string,
    ts: string
};

async function getMigrationFiles(): Promise<MigrationFile[]> {
    const files: string[] = await fs.readdir(resolvedPath);
    const relevantFiles = files.filter(
        (filename: string) => filename.match(/^m-.*\.ts$/)
    );/*.map(
        (filename: string) => filename.split("-")[1].split("\.")[0]
    ).sort();*/
    return relevantFiles.map((fileName: string): MigrationFile => ({
        fileName,
        ts: fileName.split("-")[1],
        id: fileName.split("-")[2]
    })).sort((x, y) => x.ts < y.ts ? -1 : (x.ts > y.ts ? 1 : 0));
}

async function migrate(): Promise<void> {
    const migrationColl: Collection<MigrationDoc> = client.db("reviews").collection("migrations");
    const cursor = migrationColl.find({}, { projection: { _id: 1 } }).sort({ _id: -1 }).limit(1);
    const res = await cursor.toArray();
    const allMigrationFiles: MigrationFile[] = await getMigrationFiles();
    logger.info(allMigrationFiles);
    let playableMigrationIds: MigrationFile[] = [...allMigrationFiles];
    let lastId: ObjectId;
    if (res.length) {
        lastId = res[0]._id;
        const indexOfLastMigration: number = allMigrationFiles.findIndex(f => f.id === lastId.toString());
        if (indexOfLastMigration < 0) {
            throw Error("Last migration not found locally");
        }
        playableMigrationIds = allMigrationFiles.slice(indexOfLastMigration + 1);
    } else {
        logger.info(
            "This is the first migration. %d migration(s) will be applied now.",
            playableMigrationIds.length
        );
    }
    await playMigrations(playableMigrationIds);
}

async function playMigrations(migrationFiles: MigrationFile[]): Promise<void> {
    for (const migrationFile of migrationFiles) {
        await playMigration(migrationFile);
    }
}

async function playMigration(migrationFile: MigrationFile): Promise<void> {
    const migrationColl: Collection<MigrationDoc> = client.db("reviews").collection("migrations");
    const currentModule = require(path.join("../", migrationFile.fileName.replace("\.ts", ".js")));
    const currentMigration = new currentModule.Migration();
    try {
        await currentMigration.up(client);
        logger.info("Migration [%s] 'up' stage completed successfully", migrationFile.id);
    } catch (e: any) {
        try {
            logger.error("Migration failed during the 'up' stage: %s", e.message);
            await currentMigration.down(client);
            process.exit(1);
        } catch (e: any) {
            logger.error("Rollback failed; check integrity! Error: %s", e.message);
            process.exit(1);
        }

    }
    try {
        await currentMigration.dataUp(client);
        logger.info("Migration [%s] 'dataUp' stage completed successfully", migrationFile.id);
    } catch (e: any) {
        try {
            logger.error("Migration failed during the 'dataUp' stage: %s", e.message);
            await currentMigration.dataDown(client)
            await currentMigration.down(client);
            process.exit(1);
        } catch (e: any) {
            logger.error("Rollback failed; check migration integrity! Error: %s", e.message);
            process.exit(1);
        }
    }

    await migrationColl.insertOne({ _id: currentMigration.id, appliedAt: new Date() });
    logger.info("Migration [%s] processed successfully", migrationFile.id);
}

migrate().then(() => process.exit(0)).catch(e => console.log(e));
