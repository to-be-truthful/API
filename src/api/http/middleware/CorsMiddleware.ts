export class CorsMiddleware {
    public putHeaders = (req, res, next) => {
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
    };
}
