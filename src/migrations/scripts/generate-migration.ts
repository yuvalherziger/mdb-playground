import ejs from "ejs";
import path from "path";
import { ObjectId } from "mongodb";
import * as fs from "fs";
import { logger } from "../../common/logger";
import { parseArgs } from "node:util";

const TEMPLATE_FILE = "migration.ejs";
const BASE_PATH: string = "src/migrations/";
const resolvedPath: string = path.join(process.cwd(), BASE_PATH, "templates/", TEMPLATE_FILE);


function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

function writeNewMigrationFile(args: any) {
    const { name } = args;
    const now = new Date(new Date().toUTCString().slice(0, -4));
    const timestamp: string = formatDate(now);
    const hash: string = new ObjectId().toString();
    const outFileName: string = `m-${timestamp}-${hash}-${name}.ts`;
    const outFilePath: string = path.join(process.cwd(), BASE_PATH, outFileName);

    const data = { timestamp, hash, name };
    ejs.renderFile(resolvedPath, data, (err: Error | null, content: string) => {
        if (err) {
            logger.error(err);
            return;
        }
        fs.writeFile(outFilePath, content, "utf8", (err: Error | null) => {
            if (err) {
                logger.error("Error writing to file:", err);
            } else {
                logger.info(
                    `Migration successfully written to %s. Edit this TS file to implement the migration`,
                    outFilePath
                );
            }
        });
    });
}


const args = process.argv;
const options: any = {
    name: {
        type: "string",
        short: "n",
        default: "default"
    }
};
const {
    values,
    positionals
} = parseArgs({ args, options, allowPositionals: true });

writeNewMigrationFile(values);
