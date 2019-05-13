import {Router} from "express";

export interface IController {
    initRoutes(expressRouter: Router);
}
