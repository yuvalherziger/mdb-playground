import { NextFunction, Request, Response } from "express";
import { logger } from "./logger";
import { UserError } from "../dal/models";

const invalidObjectIdRegex = (new RegExp("^BSONError: input must be a 24 character hex string.*"));

export async function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    if (res.headersSent) {
        return next(err);
    }
    if (err) {
        // Catch known exceptions:
        logger.error(`${err.name}: ${err.message}.\n${err.stack}`);
        if (err.stack?.match(invalidObjectIdRegex)) {
            return res.status(422)
                .send({
                    msg: "Invalid ID",
                    code: 422
                });
        }

        if (err instanceof UserError) {
            return res.status(err.code).send(err.getErrorResponse());
        }
        // Default to server error:
        return res.status(500)
            .send({
                msg: "Internal server error",
                code: 500
            });
    }
}