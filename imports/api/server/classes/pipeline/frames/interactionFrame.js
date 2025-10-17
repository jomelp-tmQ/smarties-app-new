import { Frame } from "./frame.js";
import { Interactions } from "../../dbTemplates/Interactions.js";

export class InteractionFrame extends Frame {
    constructor(interaction, meta = {}, ptsNs) {
        super("interaction", { ...meta }, ptsNs);
        /**
         * @type {Interactions}
         */
        this.interaction = interaction;
    }
}