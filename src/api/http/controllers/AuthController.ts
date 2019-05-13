import {Router} from "express";
import {IController} from "./IController";

import * as passport from "passport";
import * as zxcvbn from "zxcvbn";
import {check, validationResult} from "express-validator/check";
import {ValidationError} from "../ValidationError";
import {PersonModel} from "../../../database/Person";

export class AuthController implements IController{
    public initRoutes(expressRouter: Router) {
        expressRouter.post("/auth/register", [
            check("firstName").isString(),
            check("firstName").isLength({
                min: 1, max: 50
            }),
            check("lastName").isString(),
            check("lastName").isLength({
                min: 1, max: 50
            }),
            check("username").isString(),
            check("username").isLength({
                min: 1, max: 50
            }),
            check("email").isEmail(),
            check("password").isString(),
            check("password").isLength({
                min: 1, max: 50
            }),
        ], this.register);
        expressRouter.post("/auth/login", [
            check("email").isEmail(),
            check("password").isString(),
            check("password").isLength({
                min: 1, max: 50
            }),
        ], this.login);
    }

    public login = async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new ValidationError(errors.array()));
        }

        try{
            const user: any = await new Promise((resolve, reject) => {
                console.log("ub")
                passport.authenticate("local", {
                    session: false
                }, (err, passportUser) => {
                    console.log("heeeelloo")
                    if (err) { return reject(err); }
                    else if (passportUser) { return resolve(passportUser); }
                    else { return reject(new Error("Failed to authenticate.")); }
                })(req,res,next);
            });

            if(!user){ return next(new Error("Failed to authenticate.")); }

            console.log("login?");

            return res.json({
                user: user.toJSON()
            });
        }catch (e) {
            return next(e);
        }
    };

    public register = async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new ValidationError(errors.array()));
        }

        const passwordResults = zxcvbn(req.body.password);
        if (passwordResults.score < 2) {
            return next(
                new ValidationError({
                    location: "body",
                    param: "password",
                    msg: "Password not strong enough. Don't want to get hacked by the Russians now, do we?"
                })
            );
        }

        let existingUsers;
        try {
            existingUsers = await PersonModel.find({
                $or: [
                    {
                        email: req.body.email
                    },
                    {
                        username: req.body.username
                    }
                ]
            });
        } catch (e) {
            return next(e);
        }

        if (existingUsers && existingUsers.length !== 0) {
            if (existingUsers[0].username === req.body.username) {
                return next(
                    new ValidationError({
                        location: "body",
                        param: "username",
                        msg: "Username is taken"
                    })
                );
            } else if (existingUsers[0].email === req.body.email) {
                return next(
                    new ValidationError({
                        location: "body",
                        param: "email",
                        msg: "Email is taken"
                    })
                );
            }
            return next(new ValidationError("Value already exists"));
        }

        const newPerson = new PersonModel({
           firstName: req.body.firstName,
            lastName: req.body.lastName,
            username: req.body.username,
            email: req.body.email,
            friends: []
        });

        await newPerson.setPassword(req.body.password);

        try{
            await newPerson.save();
        } catch (e) {
            return next(e);
        }

        const userData = newPerson.toJSON();
        return res.json({
            user: userData
        });
    };
}
