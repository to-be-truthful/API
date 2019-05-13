import {ObjectID} from "bson";
import {arrayProp, instanceMethod, InstanceType, post, pre, prop, Ref, Typegoose} from "typegoose";

import * as bcrypt from "bcrypt";
import * as jsonwebtoken from "jsonwebtoken";
import * as mongoose from "mongoose";
import {TbtAPI} from "../TbtAPI";

export default class PersonSchema extends Typegoose {
    // Fields
    @prop() public _id?: ObjectID; // Document ID
    @prop() public firstName: string; // Person first name
    @prop() public lastName: string; // Person last name
    @prop() public username: string; // Username
    @prop() public email: string; // Email
    @arrayProp({itemsRef: PersonSchema}) public friends: Ref<PersonSchema[]>; // Ref of user's friends IDs

    @prop() private passwordHash?: string; // Hashed password using bcrypt (salt included)

    // Methods
    /** Set the hashed password to something else  */
    @instanceMethod
    public async setPassword(password: string) {
        const salt = await bcrypt.genSalt(10);
        this.passwordHash = await bcrypt.hash(password, salt);
    }

    /** Validate the users password  */
    @instanceMethod
    public async validatePassword(password: string) {
        if(!this.passwordHash) { return false; } // The password isn't filled out yet

        return await bcrypt.compare(password, this.passwordHash);
    }

    /** Convert the user to a nice little json object that gets sent to the client  */
    @instanceMethod
    public toJSON() {
        return {
            token: this.generateToken(),
            email: this.email,
            username: this.username,
            id: this._id
        };
    }

    /** Generate the JWT to verify their identity  */
    @instanceMethod
    public generateToken() {
        const today = new Date();
        const expirationDate = new Date(today);
        expirationDate.setDate(today.getDate() + 30); // TODO: think about this...
        return jsonwebtoken.sign(
            {
                id: this._id,
                email: this.email,
                username: this.username,
                exp: parseInt((expirationDate.getTime() / 1000).toString(), 10)
            },
            TbtAPI.config.jwtSecret
        );
    }

    /** Add a users friend */
    @instanceMethod
    public async addFriend(targetID: ObjectID){
        const existingFriends = this.friends as Array<InstanceType<PersonSchema>>;
        if (existingFriends.find(existingFriend => existingFriend._id === targetID) !== undefined){
            throw new Error("This user is already your friend.");
        }

        const newFriend = await PersonModel.findById(targetID).orFail(); // Look up new friend in mongoose
        existingFriends.push(newFriend); // Push em to the friends list
        this.friends = existingFriends; // Update the friends list
    }
}

/** Export the mongoose model  */
export const PersonModel = new PersonSchema().getModelForClass(PersonSchema, {
    existingMongoose: mongoose,
    schemaOptions: {collection: "people"}
});
