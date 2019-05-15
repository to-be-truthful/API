import * as passport from "passport";
import {PersonModel} from "./database/Person";
import passportLocal = require("passport-local");

export class Passport {
    public static bootstrap() {
        console.log("starting passport conf");
        passport.use(new passportLocal.Strategy({
            usernameField: "email",
            passwordField: "password"
        }, async (username, password, done) => {
            console.log("wwwwwwwwwwwwwwwwwwwwwott");
            try {
                console.log("hedasdsallo... email: " + username);

                const user = await PersonModel.findOne({email: username}).orFail();

                console.log("got!");
                console.log(user);

                if (await user.validatePassword(password)) {
                    return done(null, user);
                } else {
                    return done(null, false, {message: "Invalid username/password"});
                }
            } catch (e) {
                console.log(e);
                console.log("failed");
                return done(null, false, {message: e});
            }
        }))
    }
}