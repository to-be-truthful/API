import {IController} from "./IController";
import {Router} from "express";
import PersonSchema from "../../../database/Person";
import QuestionSchema, {QuestionModel} from "../../../database/Question";
import {RateModel} from "../../../database/Rate";
import {AuthMiddleware} from "../middleware/AuthMiddleware";
import {check, validationResult} from "express-validator/check";
import {ValidationError} from "../ValidationError";
import {ObjectId} from "bson";
import {UpdateHandler} from "../../socket/UpdateHandler";

export class QuestionController implements IController {
    initRoutes(expressRouter: Router) {
        expressRouter.get("/rate/getNew", [AuthMiddleware.jwtAuth.required], this.getRate);
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
            // Get the unfinished rate
            const unfinishedRate = await RateModel.findById(new ObjectId(req.body.rateId)).populate("choices personFrom").orFail();

            // If the user isn't the owner or the rate is already complete, throw an error
            if ((unfinishedRate.personFrom as PersonSchema)._id.toString() !== req.payload._id.toString() || unfinishedRate.decidedChoice !== undefined) {
                return next(new Error("You do not have access to this rate"));
            }

            // Get the user they selected
            const choice = (unfinishedRate.choices as Array<PersonSchema>).find(person => person._id.toString() === req.body.choiceId.toString());
            if (!choice) { // Make sure it wasn't an invalid choice
                console.log(unfinishedRate.choices)
                return next(new Error("Invalid choice"));
            }

            unfinishedRate.decidedChoice = choice; // Update the decided person
            await unfinishedRate.save(); // Save the model
            await UpdateHandler.pushUpdate(choice); // Alert the chosen person if they're online
        } catch (e) {
            return next(e);
        }

        return res.json({});
    };

    private getRate = async (req, res, next) => {
        await req.payload.populate({ // We will need to get the users friends
            path: "friends",
            select: {"email": 0, "passwordHash": 0}
        }).execPopulate();

        const friends = this.getRandomFriends(req.payload); // Get 3 random friends

        if (!friends) { // Make sure they actually have enough friends
            return next(new Error("You do not have enough friends."));
        }

        try {
            const newRate = new RateModel({ // Make the new rate
                personFrom: req.payload,
                choices: friends,
                question: await this.getRandomQuestion(),
                date: new Date(),
                shown: false
            });

            await newRate.save(); // Save it

            // Remove hash and email!!!
            (newRate.personFrom as PersonSchema).passwordHash = undefined;
            (newRate.personFrom as PersonSchema).email = undefined;

            return res.json({
                question: newRate
            })
        } catch (e) {
            return next(e);
        }
    };


    private getRandomQuestion = async (): Promise<QuestionSchema> => {
        const questions = await QuestionModel.find({}).orFail(); // Get all the questions in the db

        return questions[Math.floor(Math.random() * questions.length)]; // Get a random one
    };

    private getRandomFriends = (user: PersonSchema): Array<PersonSchema> => {
        const friends = user.friends as Array<PersonSchema>;

        if (friends.length <= 4) return undefined; // Make sure the user has 5+ friends

        const shuffled = friends.sort(() => 0.5 - Math.random()); // Shuffle the list and return 3 of them
        return shuffled.slice(0, 4);
    }
}
