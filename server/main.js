import { Meteor } from "meteor/meteor";

import Server from "../imports/api/server/Server";
import "../imports/api/startup/server/index";
import "../test/test";
// import "../remove-validators";

Meteor.startup(() => {
  // Temporarily disable Server startup to focus on webhook API
  console.log("🚀 Meteor server started - webhook API ready");

  // TODO: Re-enable Server startup once webhook testing is complete
  Server.startUp("Server running...");
  Server.startAllService().then(() => {
    Server.registerBillingWebhook();
    Server.checkAndReconcileUploadsStatuses();
  });
});