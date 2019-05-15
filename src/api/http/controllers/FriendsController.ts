import {IController} from "./IController";
import {Router} from "express";
import {check, validationResult} from "express-validator/check";
import {ValidationError} from "../ValidationError";
import {AuthMiddleware} from "../middleware/AuthMiddleware";
import {ObjectID} from "bson";
import {NotifModel} from "../../../database/Notif";
import {PersonModel} from "../../../database/Person";

export class FriendsController implements IController {
    initRoutes(expressRouter: Router) {
        expressRouter.post("/friends/add", [
            AuthMiddleware.jwtAuth.required,
            check("userId").isMongoId()
        ], this.addFriend);
        expressRouter.post("/friends/remove", [
            AuthMiddleware.jwtAuth.required,
            check("userId").isMongoId()
        ], this.removeFriend);
    }

    private addFriend = async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new ValidationError(errors.array()));
        }

        try {
            const targetFriend = await req.payload.addFriend(new ObjectID(req.body.userId));
            await req.payload.save();

            const friendAddedNotif = new NotifModel({
                personTo: targetFriend,
                text: req.payload.firstName + " " + req.payload.lastName + " has added you as a friend!",
                shown: false
            });

            await friendAddedNotif.save();
        } catch (e) {
            return next(e);
        }
        return res.json({});
    };

    private removeFriend = async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new ValidationError(errors.array()));
        }

        try {
            await req.payload.removeFriend(new ObjectID(req.body.userId));
            await req.payload.save();
        } catch (e) {
            return next(e);
        }
        return res.json({});
    }
}