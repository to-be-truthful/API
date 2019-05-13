import {post, pre, prop, Ref, Typegoose} from "typegoose";
import {ObjectID} from "bson";
import PersonSchema, {PersonModel} from "./Person";

import * as mongoose from "mongoose";
import QuestionSchema from "./Question";

/** Manually create the ID if it isn't specified */
@pre<RateSchema>("save", async function (next) {
    if (this._id === undefined || this._id === null) {
        this._id = new ObjectID();
    }
    next();
})

/** Populate fields automatically  */
@post<RateSchema>("find", async docs => {
    for (const doc of docs) {
        if (doc === undefined || doc === null) { return; }
        await doc.populate({
            path: "person1",
            model: PersonModel.name
        }).populate({
            path: "person2",
            model: PersonModel.name
        }).populate({
            path: "person3",
            model: PersonModel.name
        }).populate({
            path: "personFrom",
            model: PersonModel.name
        }).populate({
            path: "choice",
            model: PersonModel.name
        }).execPopulate();
    }
})

export default class RateSchema extends Typegoose{
    // Fields
    @prop() public _id?: ObjectID; // Document ID
    @prop({ref: PersonSchema}) public personFrom: Ref<PersonSchema>;
    @prop({ref: PersonSchema}) public person1: Ref<PersonSchema>;
    @prop({ref: PersonSchema}) public person2: Ref<PersonSchema>;
    @prop({ref: PersonSchema}) public person3: Ref<PersonSchema>;
    @prop({ref: PersonSchema}) public choice: Ref<PersonSchema>;
    @prop({ref: QuestionSchema}) public question: Ref<QuestionSchema>;
}

/** Export the mongoose model  */
export const RateModel = new RateSchema().getModelForClass(RateSchema, {
    existingMongoose: mongoose,
    schemaOptions: {collection: "rate"}
});
