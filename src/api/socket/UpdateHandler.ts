import PersonSchema, {PersonModel} from "../../database/Person";
import {ObjectID} from "bson";

import * as socketJwt from "socketio-jwt";
import {TbtAPI} from "../../TbtAPI";

export class UpdateHandler {
    public static activeUsers = new Map();

    private updateSocket: any;

    constructor(io: any) {
        this.updateSocket = io.of("/liveupdate");

        this.updateSocket.on("connection", socketJwt.authorize({
            secret: TbtAPI.config.jwtSecret,
            timeout: 15000
        }))
            .on("authenticated", this.onAuth);
    }

    public static pushUpdate = async (user: PersonSchema) => {
        if (!UpdateHandler.activeUsers.has(user._id)) return; // No need, the user somehow isn't in the active users list.
        const socket = UpdateHandler.activeUsers.get(user._id);
        socket.emit("update");
    };

    public onAuth = async (socket) => {
        try {
            // Get the user and add their socket to the activeUsers map
            const user = await PersonModel.findById(new ObjectID(socket.decoded_token.id)).orFail();
            UpdateHandler.activeUsers.set(user._id, socket);

            // Remove them on disconnect
            socket.on("disconnect", () => {
                UpdateHandler.activeUsers.delete(user);
            });
        } catch (e) {
            socket.emit("error", e);
            socket.disconnect();
            return;
        }
    }
}