import {IController} from "./IController";
import {Router} from "express";
import {AuthMiddleware} from "../middleware/AuthMiddleware";
import {check, validationResult} from "express-validator/check";
import * as zxcvbn from "zxcvbn";
import {ValidationError} from "../ValidationError";

export class ProfileController implements IController {
    initRoutes(expressRouter: Router) {
        expressRouter.get("profile/details", [
            AuthMiddleware.jwtAuth.required
        ], this.getDetails);
        expressRouter.post("profile/changePassword", [
            AuthMiddleware.jwtAuth.required,
            check("oldPassword").isString(),
            check("oldPassword").isLength({
                min: 1, max: 50
            }),
            check("newPassword").isString(),
            check("newPassword").isLength({
                min: 1, max: 50
            }),
        ], this.changePassword);
    }
    
    private getDetails = async (req, res, next) => {
        res.json({
            user: req.payload.exportData(false)
        })
    };
    
    private changePassword = async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new ValidationError(errors.array()));
        }

        if(!await req.payload.validatePassword(req.body.oldPassword)){
            return next(new Error("Password does not match."));
        }

        // Make sure their password is decent
        const passwordResults = zxcvbn(req.body.newPassword);
        if (passwordResults.score < 2) {
            return next(
                new ValidationError({
                    location: "body",
                    param: "password",
                    msg: "Password not strong enough. Don't want to get hacked by the Russians now, do we?"
                })
            );
        }

        await req.payload.setPassword(req.body.newPassword);

        try {
            await req.payload.save();
            return res.json({});
        }catch (e) {
            return next(e);
        }
    };
}