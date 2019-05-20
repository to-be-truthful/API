import {IConfig} from "./IConfig";

import * as mongoose from "mongoose";
import * as configJson from "../config.json";
import * as bodyParser from "body-parser";
import * as Express from "express";
import {Router} from "express";
import * as http from "http";
import {Passport} from "./Passport";
import * as SocketIO from "socket.io";
import {UserController} from "./api/http/controllers/UserController";
import {QuestionController} from "./api/http/controllers/QuestionController";
import {UnauthorizedError} from "express-jwt";
import {ValidationError} from "./api/http/ValidationError";
import {FriendsController} from "./api/http/controllers/FriendsController";
import {UpdateHandler} from "./api/socket/UpdateHandler";
import {RemovalHelper} from "./helpers/RemovalHelper";
import {ProfileController} from "./api/http/controllers/ProfileController";
import ExpressValidator = require("express-validator");

export class TbtAPI {
    private _express: Express.Express;

    constructor() {
        this.bootstrap(); // Call the *async* bootstrap function
    }

    private static _config: IConfig;

    static get config(): IConfig {
        return this._config;
    }

    static set config(value: IConfig) {
        this._config = value;
    }

    /** Bootstrap the Tithers API */
    private async bootstrap(): Promise<void> {
        TbtAPI.config = configJson; // Load the JSON into memory

        // Init helpers
        new RemovalHelper();

        try {
            await mongoose.connect(
                TbtAPI.config.database,
                {useNewUrlParser: true}
            );
        } catch (e) {
            console.log(e);
            process.exit(1);
            return;
        }

        console.log("Made connection to MongoDB");

        this._express = Express();

        // CORS
        this._express.disable("x-powered-by");
        this._express.use((req, res, next) => {
            res.header("X-Made-By", "Alec Dusheck, Sam Martin");
            res.header("Access-Control-Allow-Origin", "*");
            res.header(
                "Access-Control-Allow-Headers",
                "Origin, X-Requeted-With, Content-Type, Accept, Authorization, RBR"
            );
            if (req.headers.origin) {
                res.header("Access-Control-Allow-Origin", req.headers.origin.toString());
            }
            if (req.method === "OPTIONS") {
                res.header(
                    "Access-Control-Allow-Methods",
                    "GET, POST, PUT, PATCH, DELETE"
                );
                return res.status(200).json({});
            }
            next();
        });

        // Body Parser
        this._express.use(bodyParser.urlencoded({extended: false})); // Allow Express to handle json in bodies
        this._express.use(bodyParser.json()); //                                ^

        // Validation
        this._express.use(ExpressValidator());

        // Mount it
        this.mountRoutes();

        // Error handling
        this._express.use((err, req, res, next) => {
            console.log("got error");
            console.log(err);
            if (err instanceof ValidationError) {
                res.status(400).json({error: true, message: err.json})
            } else if (err instanceof UnauthorizedError) {
                res.status(401).json({error: true, message: "Unauthorized"})
            } else {
                res.status(500).json({error: true, message: err.message});
            }
        });

        Passport.bootstrap();

        await this.createHttp();

    }

    private createHttp = async (): Promise<void> => {
        const httpServer = http.createServer(this._express);

        // Create SocketServer
        const io = SocketIO(httpServer, {
            path: "/s"
        });

        new UpdateHandler(io);

        // Listen on the HTTP/HTTPS port
        httpServer.listen(TbtAPI.config.ports.http);
        console.log("Listening on :" + TbtAPI.config.ports.http)
    };

    private mountRoutes = (): void => {
        const router = Router();

        const userController = new UserController();
        userController.initRoutes(router);

        const questionController = new QuestionController();
        questionController.initRoutes(router);

        const friendsController = new FriendsController();
        friendsController.initRoutes(router);

        const profileController = new ProfileController();
        profileController.initRoutes(router);

        this._express.use("/api/v1/", router);
    };
}
