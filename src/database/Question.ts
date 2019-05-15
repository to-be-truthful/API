import {pre, prop, Typegoose} from "typegoose";
import {ObjectID} from "bson";

import * as mongoose from "mongoose";

/** Manually create the ID if it isn't specified */
@pre<QuestionSchema>("save", async function (next) {
    if (this._id === undefined || this._id === null) {
        this._id = new ObjectID();
    }
    next();
})

export default class QuestionSchema extends Typegoose {
    // Fields
    @prop() public _id?: ObjectID; // Document ID
    @prop() public questionText: string;
}

/** Export the mongoose model  */
export const QuestionModel = new QuestionSchema().getModelForClass(QuestionSchema, {
    existingMongoose: mongoose,
    schemaOptions: {collection: "question"}
});
