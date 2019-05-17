import {IController} from "./IController";
import {Router} from "express";
import {check, validationResult} from "express-validator/check";
import {ValidationError} from "../ValidationError";
import {AuthMiddleware} from "../middleware/AuthMiddleware";
import {ObjectID} from "bson";
import {NotifModel} from "../../../database/Notif";
import {UpdateHandler} from "../../socket/UpdateHandler";

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
        expressRouter.get("/friends", [
            AuthMiddleware.jwtAuth.required
        ], this.getFriends);
    }

    private getFriends = async (req, res, next) => {
        try {
            await req.payload.populate({ // We will need to get the users friends
                path: "friends",
                select: {"email": 0, "passwordHash": 0}
            }).execPopulate();

            return res.json({
                friends: req.payload.friends
            });
        } catch (e) {
            return next(e);
        }
    };

    private addFriend = async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new ValidationError(errors.array()));
        }

        try {
            // Try to add the friend (it will return the friend schema if it worked)
            const targetFriend = await req.payload.addFriend(new ObjectID(req.body.userId));
            await req.payload.save(); // Save the user

            // Send the target person a notif that someone added them
            const friendAddedNotif = new NotifModel({
                personTo: targetFriend,
                text: req.payload.firstName + " " + req.payload.lastName + " has added you as a friend!",
                shown: false
            });

            await friendAddedNotif.save(); // Save the notif
            await UpdateHandler.pushUpdate(targetFriend); // Alert the user if they're online
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
            // Try to remove the friend
            await req.payload.removeFriend(new ObjectID(req.body.userId));
            await req.payload.save(); // Save user profile
        } catch (e) {
            return next(e);
        }
        return res.json({});
    }
}