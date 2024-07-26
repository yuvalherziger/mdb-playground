import { Request, Response, Router } from "express";
import { Comment, ErrorResponse, IdQuery, InvalidDataError, ListReportConfig, Report } from "../dal/models";
import * as dal from "../dal/report";
import { DeleteResult, ObjectId, WithId } from "mongodb";
import { query, validationResult } from 'express-validator';
import 'express-async-errors';

export const reportRouter = Router();
type Resp = Promise<Response>;

reportRouter.delete("/:reportId", async (req: Request, res: Response): Resp => {
    const deleteRes: DeleteResult = await dal.deleteReport(
        new ObjectId(req.params.reportId)
    );
    return res.status(200).send({
        _id: req.params.reportId,
        acknowledged: deleteRes.acknowledged
    })
});

reportRouter.get("/:id", async (req: Request<IdQuery>, res: Response<WithId<Report> | null | ErrorResponse>): Resp => {
    const report: WithId<Report> | null = await dal.getReportById(new ObjectId(req.params.id));
    return res.status(200).send(report);
});

reportRouter.post("/:id/comment", async (req: Request<IdQuery, {}, Comment>, res: Response): Resp => {
    const id: ObjectId = new ObjectId(req.params.id);
    const comment: Comment = req.body;
    const commentId: ObjectId = await dal.addCommentToReport(id, comment)
    return res.status(201).send({ _id: commentId });
});

reportRouter.post("/", async (req: Request<{}, {}, Report>, res: Response): Resp => {
    return res.status(201).send({ _id: await dal.createReport(req.body) });
});

reportRouter.get("/",
    query("limit").isInt().toInt().default(10),
    query("startAfter").optional().isString().default(null),
    query("sortBy").isString().default("_id"),
    query("sortDir").isIn([-1, 1]).toInt().default(1),
    async (req: Request<{}, {}, {}, { [key: string]: string }>, res: Response): Resp => {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            throw new InvalidDataError(result.array());
        }
        const config: ListReportConfig = new ListReportConfig(req.query);
        const results = await dal.getReports(config);
        return res.status(200).send({
            data: results.data,
            next: results.next,
        });
    });
