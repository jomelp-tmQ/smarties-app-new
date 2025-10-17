import { Logger } from "@tmq-dev-ph/tmq-dev-core-client";

import { tmq as common } from "@tmq-dev-ph/tmq-dev-core-client/dist/static_codegen/tmq/common";
// eslint-disable-next-line no-unused-vars
import { tmq as helloworld } from "../../common/static_codegen/tmq/HelloWorld";

const { DefaultResponse } = common;

export default {
    /**
     * @param {Object} call
     * @param {helloworld.HelloWordRequest} call.request
     * @param {function} callback 
     */
    SayHello: function ({ request }, callback) {
        const response = new DefaultResponse();
        Logger.showDebug("HelloWorldService.SayHello: %s", request.name);
        callback(null, response);
    }
};