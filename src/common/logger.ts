import * as winston from "winston";
import { format } from "winston";
import cluster from "cluster";
import morgan from "morgan";
import dotenv from "dotenv";


dotenv.config();

let pid: string | undefined;
if (cluster.worker?.process) {
    pid = cluster.worker?.process?.pid?.toString();
} else {
    pid = process.pid.toString();
}

export const logger = winston.createLogger({
    level: process.env["LOG_LEVEL"] || "info",
    defaultMeta: { pid },
    format: format.combine(
        format.timestamp(),
        format.splat(),
        format.json(),
    ),
    transports: [
        new winston.transports.Console()
    ],
});

export const logMiddleware = morgan(
    ':method :url :status :res[content-length] - :response-time ms',
    {
        stream: {
            // Configure Morgan to use our custom logger with the http severity
            write: (message) => logger.http(message.trim()),
        },
    }
);