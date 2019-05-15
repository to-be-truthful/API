import {arrayProp, post, pre, prop, Ref, Typegoose} from "typegoose";
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

export default class RateSchema extends Typegoose{
    // Fields
    @prop() public _id?: ObjectID; // Document ID
    @prop({ref: PersonSchema}) public personFrom: Ref<PersonSchema>;
    @arrayProp({itemsRef: PersonSchema}) public choices: Ref<PersonSchema[]>; // Ref of user's friends IDs
    @prop({ref: PersonSchema}) public decidedChoice?: Ref<PersonSchema>;
    @prop({ref: QuestionSchema}) public question: Ref<QuestionSchema>;
    @prop() public date: Date
}

/** Export the mongoose model  */
export const RateModel = new RateSchema().getModelForClass(RateSchema, {
    existingMongoose: mongoose,
    schemaOptions: {collection: "rate"}
});
