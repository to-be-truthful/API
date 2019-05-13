import {IController} from "./IController";
import {Router} from "express";
import PersonSchema from "../../../database/Person";
import QuestionSchema, {QuestionModel} from "../../../database/Question";
import { RateModel } from "../../../database/Rate";
import {AuthMiddleware} from "../middleware/AuthMiddleware";

export class QuestionController implements IController{
    initRoutes(expressRouter: Router) {
        expressRouter.get("/rate/getNew", [ AuthMiddleware.jwtAuth.required ], this.getRate);
    }

    private getRate = async (req, res, next) => {

        await req.payload.populate("friends");

        const friends = this.getRandomFriends(req.payload);

        if (!friends){
            return next(new Error("You do not have enough friends."));
        }

        try {
            const newRate = new RateModel({
                personFrom: req.payload,
                person1: friends[0],
                person2: friends[1],
                person3: friends[2],
                question: await this.getRandomQuestion()
            });

            await newRate.save();

            return res.json({
                question: newRate
            })
        }catch (e) {
            return next(e);
        }
    };


    private getRandomQuestion = async (): Promise<QuestionSchema> => {
        const questions = await QuestionModel.find({}).orFail();
        return questions[Math.floor(Math.random()*questions.length)];
    };

    private getRandomFriends = (user: PersonSchema): Array<PersonSchema> => {
        const friends = user.friends as Array<PersonSchema>;

        if (friends.length <= 4) return undefined;

        const shuffled = friends.sort(() => 0.5 - Math.random());
        return  shuffled.slice(0, 3);
    }
}