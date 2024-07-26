import { getReviewDb } from "../common/db";
import { Collection, DeleteResult, Document, Filter, FindCursor, ObjectId, UpdateResult, WithId } from "mongodb";
import { Comment, ListReportConfig, NotFoundError, Report } from "./models";

const SCHEMA_VERSION: string = "1";
const MAX_COMMENTS_PER_PAGE: number = 5;

const reportsCollection: Collection<Report> = getReviewDb().collection<Report>("reports");
const commentsCollection: Collection<Comment> = getReviewDb().collection<Comment>("comments");

async function addCommentToReport(reportId: ObjectId, comment: Comment): Promise<ObjectId> {
    const _id: ObjectId = new ObjectId(reportId);
    const found = await reportsCollection.findOne({ _id }, { projection: { _id: 1 } });
    if (!found) {
        throw new NotFoundError("Report", _id);
    }
    comment.version = comment.version || SCHEMA_VERSION;
    const insertRes = await commentsCollection.insertOne(comment);
    comment._id = insertRes.insertedId;
    await reportsCollection.updateOne({ _id }, {
        $push: {
            comments: {
                $each: [comment],
                $sort: { _id: -1 },
                $slice: MAX_COMMENTS_PER_PAGE,
            }
        },
        $set: {
            updatedAt: new Date()
        }
    });

    return insertRes.insertedId;
}

async function createReport(report: Report): Promise<ObjectId> {
    report.version = report.version || SCHEMA_VERSION;
    report.createdAt = new Date();
    const res = await reportsCollection.insertOne(report);
    return res.insertedId;
}

async function updateReport(_id: ObjectId, update: Partial<Report>): Promise<UpdateResult<Report>> {
    const $set: Document = { ...update, updatedAt: new Date() };
    return reportsCollection.updateOne({ _id }, { $set });
}

async function deleteReport(_id: ObjectId): Promise<DeleteResult> {
    const res = await reportsCollection.deleteOne({ _id });
    if (res.deletedCount === 0) {
        throw new NotFoundError("Report", _id);
    }
    return res;
}

async function getReportById(_id: ObjectId): Promise<WithId<Report>> {
    const report = await reportsCollection.findOne({ _id });
    if (!report) {
        throw new NotFoundError("Report", _id);
    }
    return report;
}

async function getReports(config: ListReportConfig): Promise<{ data: Report[], next: ObjectId | null }> {
    let filter: Filter<Report> = {};
    if (config.startAfter) {
        const startAfter = config.startAfter
        if (config.sortDir === 1) {
            filter = {
                [config.sortBy]: {
                    $gte: startAfter
                }
            }
        } else {
            filter = {
                [config.sortBy]: {
                    $lte: startAfter
                }
            }
        }
    }
    const cursor: FindCursor<Report> = await reportsCollection
        .find(filter)
        .sort({ [config.sortBy]: config.sortDir })
        .limit(config.limit + 1);

    const results: Report[] = [];
    for await (const report of cursor) {
        results.push(report);
    }

    const data = results.slice(0, config.limit);
    let next: ObjectId | null = null;
    if (results.length > config.limit) {
        next = results.slice(-1)[0]._id;
    }
    return {
        data,
        next
    };
}

export { updateReport, createReport, deleteReport, addCommentToReport, getReportById, getReports };
