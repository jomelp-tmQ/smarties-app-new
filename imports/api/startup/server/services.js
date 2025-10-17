import { Package } from "@tmq-dev-ph/tmq-dev-core-server";

// Package.addService({
//     file: "tmq/service.proto", ServiceNames: ["Service"], auth: false
// }, "service", { Service: require("../../../api/server/services/Service").default });

Package.addService({
    file: "tmq/HelloWorld.proto", ServiceNames: ["HelloWorldService"], auth: false
}, "helloworld", { HelloWorldService: require("../../server/services/HelloWorld").default });

Package.addService({
    file: "tmq/inbox.proto", ServiceNames: ["InboxService"], auth: false
}, "inbox", { InboxService: require("../../server/services/InboxService").default });

Package.addService({
    file: "tmq/interaction.proto", ServiceNames: ["InteractionService"], auth: false
}, "interaction", { InteractionService: require("../../server/services/InteractionService").default });

Package.addService({
    file: "tmq/config.proto", ServiceNames: ["ConfigService"], auth: false
}, "configuration", { ConfigService: require("../../server/services/ConfigService").default });

Package.addService({
    file: "tmq/SalesEnablement.proto", ServiceNames: ["SalesEnablementService"], auth: false
}, "sales", { SalesEnablementService: require("../../server/services/SalesEnablement").default });

Package.addService({
    file: "tmq/ContentCreation.proto", ServiceNames: ["ContentCreationService"], auth: false
}, "content", { ContentCreationService: require("../../server/services/ContentCreation").default });

Package.addService({
    file: "tmq/CustomerEngagement.proto", ServiceNames: ["CustomerEngagementService"], auth: false
}, "customer", { CustomerEngagementService: require("../../server/services/CustomerEngagement").default });

Package.addService({
    file: "tmq/takeover.proto", ServiceNames: ["TakeoverService"], auth: false
}, "takeover", { TakeoverService: require("../../server/services/TakeoverService").default });

Package.addService({
    file: "tmq/assistant.proto", ServiceNames: ["AssistantService"], auth: false
}, "assistant", { AssistantService: require("../../server/services/AssistantService").default });

Package.addService({
    file: "tmq/knowledgeBase.proto", ServiceNames: ["KnowledgeBaseService"], auth: true
}, "knowledgeBae", { KnowledgeBaseService: require("../../server/services/KnowledgeBaseService").default });

Package.addService({
    file: "tmq/tool.proto", ServiceNames: ["ToolService"], auth: false
}, "tool", { ToolService: require("../../server/services/ToolService").default });

Package.addService({
    file: "tmq/phone.proto", ServiceNames: ["PhoneService"], auth: false
}, "phone", { PhoneService: require("../../server/services/PhoneService").default });

Package.addService({
    file: "tmq/requestDetails.proto", ServiceNames: ["RequestDetailsService"], auth: false
}, "requestDetails", { RequestDetailsService: require("../../server/services/RequestDetailsService").default });

Package.addService({
    file: "tmq/customBilling.proto", ServiceNames: ["CustomBillingService"], auth: false
}, "customBilling", { CustomBillingService: require("../../server/services/CustomBillingService").default });

Package.addService({
    file: "tmq/acc.proto", ServiceNames: ["AccService"], auth: true
}, "acc", { AccService: require("../../server/services/AccService").default });

Package.addService({
    file: "tmq/widgetConfig.proto", ServiceNames: ["WidgetConfigService"], auth: true
}, "widgetConfig", { WidgetConfigService: require("../../server/services/WidgetConfigService").default });

Package.addService({
    file: "tmq/attachment.proto", ServiceNames: ["AttachmentService"], auth: true
}, "attachment", { AttachmentService: require("../../server/services/AttachmentService").default });

Package.addService({
    file: "tmq/files.proto", ServiceNames: ["FilesService"], auth: true
}, "files", { FilesService: require("../../server/services/FilesService").default });

Package.addService({
    file: "tmq/sessions.proto", ServiceNames: ["SessionService"], auth: false
}, "session", { SessionService: require("../../server/services/SessionService").default });

Package.addService({
    file: "tmq/api.proto", ServiceNames: ["ApiService"], auth: true
}, "api", { ApiService: require("../../server/services/ApiService").default });

Package.addService({
    file: "tmq/scrapeRequest.proto", ServiceNames: ["ScrapeRequestService"], auth: true
}, "scrapeRequest", { ScrapeRequestService: require("../../server/services/ScrapeRequestService").default });

Package.addService({
    file: "tmq/widget_session.proto", ServiceNames: ["WidgetSessionService"], auth: false
}, "widget_session", { WidgetSessionService: require("../../server/services/WidgetSessionService").default });

Package.addService({
    file: "tmq/crawl.proto", ServiceNames: ["CrawlService"], auth: true
}, "crawl", { CrawlService: require("../../server/services/CrawlService").default });