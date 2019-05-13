import {ValidationError} from "./ValidationError";

export class ErrorHandler {
    public handleError = (err, req, res, next) => {
        /*
        Quick note on errors: We're super lax here. We'd NEVER want to leak errors to the user in a real production environment.
        However, since we're not Facebook or Twitter, we really dont' care.
         */
        console.log(err);
        if (err instanceof ValidationError) {
            res.json({error: true, message: err.json})
        } else {
            res.json({error: true, message: err.message});
        }
    }
}
