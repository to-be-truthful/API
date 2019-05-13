import {ObjectID} from "bson";
import jwt = require("express-jwt");
import {PersonModel} from "../../../database/Person";
import {TbtAPI} from "../../../TbtAPI";

export class AuthMiddleware {

    private static getToken = (req: any) => {
        const {
            headers: { authorization }
        } = req;

        if (authorization && authorization.split(" ")[0] === "Token") {
            return authorization.split(" ")[1];
        }
        return null;
    };

    private static getSecret = (req, payload, done) => {
        // This is here because typescript decided that it needed to compile some of this code instead of running it at runtime
        done(null, TbtAPI.config.jwtSecret);
    };

    /* tslint:disable:member-ordering */
    public static jwtAuth = {
        required: jwt({
            secret: AuthMiddleware.getSecret,
            userProperty: "payload",
            getToken: AuthMiddleware.getToken,
            payloadSanitizer: (payload, callback) => {
                console.log("Fired custom payload sanitizer! (" + JSON.stringify(payload) + ")");
                PersonModel.findById(new ObjectID(payload.id), (err, user) => {
                    console.log("got user: " + JSON.stringify(user) + ", err: " + err);
                    if (err) return callback(err, null);
                    else callback(null, user);
                }).populate({
                    path: "friends"
                }).orFail(); // We turn our lame ass payload into one with useful stuff
            }
        }),
        optional: jwt({
            secret: AuthMiddleware.getSecret,
            userProperty: "payload",
            getToken: AuthMiddleware.getToken,
            credentialsRequired: false
        })
    };
}
