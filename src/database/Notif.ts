import {post, pre, prop, Ref, Typegoose} from "typegoose";
import {ObjectID} from "bson";

import * as mongoose from "mongoose";
import PersonSchema, {PersonModel} from "./Person";

/** Manually create the ID if it isn't specified */
@pre<NotifSchema>("save", async function (next) {
    if (this._id === undefined || this._id === null) {
        this._id = new ObjectID();
    }
    next();
})

export default class NotifSchema extends Typegoose{
    // Fields
    @prop() public _id?: ObjectID; // Document ID
    @prop({ ref: PersonSchema }) public personTo: Ref<PersonSchema>;
    @prop() public text: string;
}

/** Export the mongoose model  */
export const NotifModel = new NotifSchema().getModelForClass(NotifSchema, {
    existingMongoose: mongoose,
    schemaOptions: {collection: "notif"}
});
