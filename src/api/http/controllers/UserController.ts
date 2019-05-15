import {Router} from "express";
import {IController} from "./IController";

import * as passport from "passport";
import * as zxcvbn from "zxcvbn";
import {check, validationResult} from "express-validator/check";
import {ValidationError} from "../ValidationError";
import {PersonModel} from "../../../database/Person";
import {RateModel} from "../../../database/Rate";
import {AuthMiddleware} from "../middleware/AuthMiddleware";
import {NotifModel} from "../../../database/Notif";

export class UserController implements IController {
    public initRoutes(expressRouter: Router) {
        expressRouter.post("/user/register", [
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
        expressRouter.post("/user/login", [
            check("email").isEmail(),
            check("password").isString(),
            check("password").isLength({
                min: 1, max: 50
            }),
        ], this.login);
        expressRouter.get("/user/feed", [AuthMiddleware.jwtAuth.required], this.getFeed);

    }

    public login = async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new ValidationError(errors.array()));
        }

        try {
            const user: any = await new Promise((resolve, reject) => {
                console.log("ub");
                passport.authenticate("local", {
                    session: false
                }, (err, passportUser) => {
                    console.log("heeeelloo");
                    if (err) {
                        return reject(err);
                    } else if (passportUser) {
                        return resolve(passportUser);
                    } else {
                        return reject(new Error("Failed to authenticate."));
                    }
                })(req, res, next);
            });

            if (!user) {
                return next(new Error("Failed to authenticate."));
            }

            console.log("login?");

            return res.json({
                user: user.exportData()
            });
        } catch (e) {
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

        try {
            await newPerson.save();
        } catch (e) {
            return next(e);
        }

        const userData = newPerson.exportData();
        return res.json({
            user: userData
        });
    };

    private getFeed = async (req, res, next) => {
        let startTime = new Date();
        startTime.setDate(startTime.getDate() - 1);

        let endTime = new Date(Date.now());

        try {
            const rates = await RateModel
                .find({
                    decidedChoice: req.payload,
                    date: {
                        "$gte": startTime,
                        "$lt": endTime
                    }
                }, {
                    choices: 0,
                    personFrom: 0
                })
                .populate("question")
                .limit(500) // We don't need more then 500 posts lmao
                .sort({ // Sort by time posted, descending
                    date: -1
                });

                // const notifs = await NotifModel.updateMany({ Ugh. UpdateMany doesn't return the documents updated D: sad....
                //     shown: false,
                //     personTo: req.payload._id
                // }, {
                //     shown: true
                // });

            const notifs = await NotifModel.find({
                shown: false,
                personTo: req.payload._id
            });

            await Promise.all(
                notifs.map(async notif => {
                    notif.shown = true;
                    await notif.save();
                })
            );

            return res.json({rates, notifs});
        }catch (e) {
            return next(e);
        }
    };
}
