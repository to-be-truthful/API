import {IConfig} from "./IConfig";

import * as mongoose from "mongoose";

import * as configJson from "../config.json";
import ExpressValidator = require("express-validator");
import * as bodyParser from "body-parser";
import {Express, Router} from "express";
import * as http from "http";
import {Passport} from "./Passport";

export class TbtAPI {
    static get config(): IConfig {
        return this._config;
    }

    static set config(value: IConfig) {
        this._config = value;
    }
    private static _config: IConfig;

    private _express: Express;

    /** Bootstrap the Tithers API */
    private async bootstrap(): Promise<void>{
        TbtAPI.config = configJson; // Load the JSON into memory

        // Connect to our database
        await mongoose.connect(TbtAPI.config.database, {
            useNewUrlParser: true // Was having some weird issues with this disabled
        });

        // CORS
        this._express.disable("x-powered-by");
        this._express.use((req, res, next) => {
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

        // Mount it
        this.mountRoutes();

        // Body Parser
        this._express.use(bodyParser.urlencoded({extended: false})); // Allow Express to handle json in bodies
        this._express.use(bodyParser.json()); //                                ^

        // Validation
        this._express.use(ExpressValidator());

        // TODO: do
        // Start workers// Configure Passport
        Passport.bootstrap();

        await this.createHttp();

    }

    private createHttp = async (): Promise<void> => {
        const httpServer = http.createServer(this._express);

        // Listen on the HTTP/HTTPS port
        httpServer.listen(TbtAPI.config.ports.http);
    };

    private mountRoutes = (): void => {
        const router = Router();

        // do

        this._express.use("/api/v1/", router);
    };

    constructor(){
        this.bootstrap(); // Call the *async* bootstrap function
    }
}
