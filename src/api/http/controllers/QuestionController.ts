import {IController} from "./IController";
import {Router} from "express";
import PersonSchema from "../../../database/Person";
import QuestionSchema, {QuestionModel} from "../../../database/Question";
import { RateModel } from "../../../database/Rate";
import {AuthMiddleware} from "../middleware/AuthMiddleware";
import {check, validationResult} from "express-validator/check";
import {ValidationError} from "../ValidationError";
import {ObjectId} from "bson";

export class QuestionController implements IController{
    initRoutes(expressRouter: Router) {
        expressRouter.get("/rate/getNew", [ AuthMiddleware.jwtAuth.required ], this.getRate);
        expressRouter.post("/rate/finish", [
            AuthMiddleware.jwtAuth.required,
            check("rateId").isMongoId(),
            check("choiceId").isMongoId()
        ], this.rate);
    }

    private rate = async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new ValidationError(errors.array()));
        }

        try {
            const unfinishedRate = await RateModel.findById(new ObjectId(req.body.rateId)).populate("choices personFrom").orFail();

            if(unfinishedRate._id !== req.payload._id){
                return next(new Error("You do not have access to this rate"));
            }

            const choice = (unfinishedRate.choices as Array<PersonSchema>).find(person => person._id.toString() === req.body.choiceId.toString());
            if(!choice){
                return next(new Error("Invalid choice"));
            }

            unfinishedRate.decidedChoice = choice;
            await unfinishedRate.save();
        }catch (e) {
            return next(e);
        }

        return res.json({});
    };

    private getRate = async (req, res, next) => {
        await req.payload.populate({
            path: "friends",
            select: { "email": 0, "passwordHash": 0 }
        }).execPopulate();

        console.log(req.payload);

        const friends = this.getRandomFriends(req.payload);

        if (!friends){
            return next(new Error("You do not have enough friends."));
        }

        try {
            const newRate = new RateModel({
                personFrom: req.payload,
                choices: friends,
                question: await this.getRandomQuestion()
            });

            await newRate.save();

            // Remove hash and email!!!
            (newRate.personFrom as PersonSchema).passwordHash = undefined;
            (newRate.personFrom as PersonSchema).email = undefined;

            return res.json({
                question: newRate
            })
        }catch (e) {
            return next(e);
        }
    };


    private getRandomQuestion = async (): Promise<QuestionSchema> => {
        const questions = await QuestionModel.find({}).orFail();

        return questions[Math.floor(Math.random() * questions.length)];
    };

    private getRandomFriends = (user: PersonSchema): Array<PersonSchema> => {
        const friends = user.friends as Array<PersonSchema>;

        if (friends.length <= 4) return undefined;

        const shuffled = friends.sort(() => 0.5 - Math.random());
        return  shuffled.slice(0, 3);
    }
}