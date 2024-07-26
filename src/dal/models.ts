import { IntegerType, ObjectId, SortDirection } from "mongodb";
import { ValidationError } from "express-validator";

export interface BaseModel {
    _id: ObjectId;
    version: string;
}

export interface Review extends BaseModel {
    email: string;
    name: string;
    body: string;
    approved: boolean;
    createdAt: Date;
    updatedAt: Date;
    approvedAt: Date;
}

export interface Comment extends BaseModel {
    email: string;
    name: string;
    body: string;
    parentId: ObjectId;
}

export interface Report extends BaseModel {
    author: string;
    url: string;
    reviews: Review[];
    approvalThreshold: IntegerType;
    approved: boolean;
    createdAt: Date;
    updatedAt: Date;
    approvedAt: Date;
    customer: string;
    comments: Comment[];
}

export interface ErrorResponse {
    msg: string;
    code: number;
}

export interface IdQuery {
    id: string;
}

interface IUserError {
    getErrorResponse(): { code: number, msg: string, [key: string]: any };
}

export class UserError extends Error implements IUserError {
    code: number = 400;

    getErrorResponse(): { code: number, msg: string, [key: string]: any } {
        return {
            code: this.code,
            msg: this.message
        };
    }
}

export class NotFoundError extends UserError {
    code: number = 404;
    name = "NotFoundError";

    constructor(private readonly entityType: string, private readonly id: string | ObjectId) {
        super();
        this.id = id;
        this.entityType = entityType;
        this.message = `${this.entityType} [${this.id}] was not found`;
    }
}

export class InvalidDataError extends UserError {
    code: number = 400;
    name = "InvalidDataError";

    constructor(private readonly errors: ValidationError[]) {
        super();
        this.errors = errors;
        this.message = `Invalid request data`;
    }

    getErrorResponse(): { code: number; msg: string, errors: ValidationError[] } {
        return {
            ...super.getErrorResponse(),
            errors: this.errors
        }
    }
}

export class KeyConflictError extends UserError {
    code: number = 409;
    id: string | ObjectId;
    entityType: string;
    name = "KeyConflictError";

    constructor(entityType: string, id: string | ObjectId) {
        super();
        this.id = id;
        this.entityType = entityType;
        this.message = `${this.entityType} [${this.id}] already exists`;
    }
}

export class ListReportConfig {
    limit: number = 20;
    startAfter: any;
    sortBy: string = "_id";
    sortDir: SortDirection = 1;

    constructor(query: { [key: string]: string }) {
        if (query.limit) {
            this.limit = parseInt(query.limit, 10);
        }
        if (query.sortBy) {
            this.sortBy = query.sortBy;
        }
        if (query.startAfter) {
            this.startAfter = query.sortAfter;
            if (query.sortBy === "_id" || this.sortBy === "_id") {
                this.startAfter = new ObjectId(query.startAfter || this.startAfter)
            }
            if (query.sortBy === "updatedAt" || this.sortBy === "updatedAt") {
                this.startAfter = new Date(query.startAfter || this.startAfter)
            }
        }
        if (query.sortDir) {
            this.sortDir = parseInt(query.sortDir, 10) === 1 ? 1 : -1;
        }
    }
}
