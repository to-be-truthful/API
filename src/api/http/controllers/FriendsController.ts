import {IController} from "./IController";
import {Router} from "express";
import {check, validationResult} from "express-validator/check";
import {ValidationError} from "../ValidationError";
import {AuthMiddleware} from "../middleware/AuthMiddleware";
import {ObjectID} from "bson";

export class FriendsController implements IController{
    initRoutes(expressRouter: Router) {
        expressRouter.post("/friends/add", [
            AuthMiddleware.jwtAuth.required,
            check("userId").isMongoId()
        ], this.addFriend);
    }

    private addFriend = async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new ValidationError(errors.array()));
        }

        try{
            await req.payload.addFriend(new ObjectID(req.body.userId));
            await req.payload.save();
        }catch (e) {
            return next(e);
        }
        return res.json({});
    }
}