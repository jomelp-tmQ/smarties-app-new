import { RouterManager } from "@tmq-dev-ph/tmq-dev-core-server";
import { WebApp } from "meteor/webapp";
const Picker = {
    route: (route, callback) => {
        return WebApp.handlers.use(route, (req, res, next) => {
            if (typeof callback === "function") {
                callback(req.params, req, res);
            } else {
                next();
            }
        });
    },
    use: (middleware) => {
        return WebApp.handlers.use(middleware);
    },
    middleware: (middleware) => {
        return WebApp.handlers.use(middleware);
    }
};

RouterManager.setRouteMiddleware(Picker);

RouterManager.setUploadRoute(Picker, (/*rm, file, err*/) => {
    // console.log(file, err);
});
RouterManager.setDownloadRoute(Picker, (/*rm, file, err*/) => {
    // console.log(file, err);
});
Picker.route("/api/sessions", (params, req, res) => {
    res.statusCode = 200;
    res.end(JSON.stringify({ message: "Hello World" }));
});