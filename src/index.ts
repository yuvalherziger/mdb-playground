import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { reportRouter } from "./routes/reports";
import { logger, logMiddleware } from "./common/logger";
import cluster from "cluster";
import * as os from "os";
import { errorHandler } from "./common/error-handler";


dotenv.config();
const port: string | number = process.env.PORT || 3000;

function createApp(): Express {
    const app: Express = express();
    app.use(logMiddleware);
    app.use(express.json());
    app.use('/report', reportRouter);
    app.get("/", (req: Request, res: Response) => {
        res.send("Welcome");
    });
    app.use(errorHandler);
    return app;
}


function startServer() {
    if (process.env.PRODUCTION === "1") {
        logger.info("Running in cluster mode");
        const numCPUs: number = os.cpus().length - 1;
        if (cluster.isPrimary) {
            logger.info("Primary process [%d] is running. Spawning %d sub-processes", process.pid, numCPUs);
            for (let i = 0; i < numCPUs; i++) {
                cluster.fork();
            }

            cluster.on("exit", (worker, code, signal) => {
                logger.warn("Worker process [%d] died. Restarting...", worker.process.pid);
                cluster.fork();
            });
        } else {
            const app = createApp();
            let pid: string | undefined;
            if (cluster.worker?.process) {
                pid = cluster.worker?.process?.pid?.toString();
            } else {
                pid = "unknown";
            }

            app.listen(port, () => {
                logger.info("Worker process [%d] is running the server at http://localhost:%d", pid, port);
            });
        }
    } else {
        logger.info("Running in single-thread mode");
        const app = createApp();
        app.listen(port, () => {
            logger.info("Server is running at http://localhost:%d", port);
        });
    }
}

startServer();
