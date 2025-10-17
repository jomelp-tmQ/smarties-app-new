import { Accounts } from "meteor/accounts-base";
import { Watcher2 } from "../Watcher2";
import Client from "../Client";
import Billing from "billing-client";
import { toast } from 'sonner';
import toolService from "../../common/static_codegen/tmq/customBilling_pb";
import requestService from "../../common/static_codegen/tmq/requestDetails_pb";
import accService from "../../common/static_codegen/tmq/acc_pb";
import AccountWatcher from "./AccountWatcher";
import RedisventService from "../redisvent/RedisventService";

const TOAST_STYLE = {
    SUCCESS: {
        backgroundColor: "green",
        color: "white",
        border: "1px solid green"
    },
    ERROR: {
        backgroundColor: "red",
        color: "white",
        border: "1px solid red"
    }
};

class BillingWatcher extends Watcher2 {
    #data
    #client;
    #lastBasis = null;
    #processes = {};
    #listen = null;
    constructor(parent) {
        super(parent);
        RedisventService.Invoices.prepareCollection("invoices");
        this.#data = RedisventService.Invoices.getCollection("invoices");
    }

    get DB() {
        return this.#data;
    }

    get Invoices() {
        return this.DB.find({}, { sort: { createdat: -1 } }).fetch() || [];
    }

    get IsLoggedIn() {
        return Accounts.userId();
    }

    async initializeBilling() {
        if (!this.IsLoggedIn) {
            toast.error('Please login to continue', {
                style: TOAST_STYLE.ERROR
            });
            return;
        }
        const req = new toolService.AuthRequest();
        const res = await this.Parent.callFunc(0x9d4e73e7, req).then(({ result }) => {
            const deserialized = toolService.AuthResponse.deserializeBinary(result);
            return deserialized.toObject();
        });

        this.#client = new Billing({
            serverUrl: res.url,
            apiKey: res.apiKey,
            onTokenRefresh: () => { }
        });
    }

    async handleManageSubscription(customerId = null) {
        if (this.#processes["manageSubscription"]) return;
        this.#processes["manageSubscription"] = true;
        this.setValue("loadingSubscription", true);
        if (!customerId) {
            const res = await AccountWatcher.fetchCustomerId();
            if (res.customerid) {
                customerId = res.customerid;
                await this.createBillingPortal(customerId);
            } else {
                toast.error('Error fetching customer ID', {
                    style: TOAST_STYLE.ERROR
                });
                const user = await this.fetchAccountDetails(this.IsLoggedIn);
                const url = await this.handleSmartiesFreePlan(user);
                if (url) {
                    window.location.href = url;
                }
            }
        }
    }

    async createBillingPortal(customerId) {
        if (!this.#client) await this.initializeBilling();
        const requestDetails = await this.fetchRequestDetails();
        try {
            const res = await this.#client.createBillingPortalSession(customerId, requestDetails.returnurl, requestDetails.appname);
            if (res.url) {
                toast.success('Subscription successfully fetched', {
                    style: TOAST_STYLE.SUCCESS
                });
                window.location.href = res.url;
                this.#processes["manageSubscription"] = false;
                this.setValue("loadingSubscription", false);
            } else {
                toast.error('Error managing subscription', {
                    style: TOAST_STYLE.ERROR
                });
                this.#processes["manageSubscription"] = false;
                this.setValue("loadingSubscription", false);
            }
        } catch (error) {
            this.#processes["manageSubscription"] = false;
            this.setValue("loadingSubscription", false);
            toast.error('Error managing subscription', {
                style: TOAST_STYLE.ERROR,
                description: error?.response?.data || error.message || error
            });
        }
    }

    async createSubscriptionProPlan() {
        const requestDetails = await this.fetchRequestDetails();
        if (!this.#client) await this.initializeBilling();
        await this.#client.createSubscriptionPlan({
            name: 'Smarties Pro Plan',
            description: 'Pro plan for Smarties users',
            amount: 49,
            currency: 'usd',
            metadata: {
                app: requestDetails.appname,
                appUrl: requestDetails.appurl
            },
            recurring: { interval: 'month', trialPeriodDays: 0 }
        });
    }


    async handleSmartiesFreePlan(customer = null) {
        // DEBUG: Log the start of the entire process

        const requestDetails = await this.fetchRequestDetails();

        const priceId = requestDetails.priceid || null;
        try {
            if (!this.#client) await this.initializeBilling();
            let pId = priceId;

            // This block only runs if a price ID doesn't already exist
            if (!priceId) {
                // DEBUG: Log the call to the external Billing API to create a plan
                const plan = await this.#client.createSubscriptionPlan({
                    name: 'Smarties Free Plan',
                    description: 'Free plan for Smarties users',
                    amount: 0,
                    currency: 'usd',
                    metadata: { /* ... */ },
                    recurring: { interval: 'month', trialPeriodDays: 0 }
                });
                // DEBUG: Log the successful response from the Billing API
                pId = plan.priceId;
            }

            // DEBUG: Log the final step: creating the checkout session
            const checkoutSession = await this.#client.createCheckoutSession({
                mode: 'subscription',
                customer_email: customer.emailsList[0].address,
                line_items: [{ price: pId, quantity: 1 }],
                payment_method_collection: 'if_required',
                metadata: {
                    userId: customer.id,
                    app: requestDetails.appname,
                    appUrl: requestDetails.appurl
                },
                return_url: requestDetails.returnurl,
                cancel_url: requestDetails.cancelurl,
            });
            // DEBUG: Log the final success

            return checkoutSession.url || null;
        } catch (err) {
            // DEBUG: CRITICAL! Log any errors that occur.
            toast.error('Error handling Smarties Free Plan',
                {
                    style: TOAST_STYLE.ERROR,
                    description: err?.response?.data || err.message || err
                });
        }
    }

    async fetchRequestDetails() {
        try {
            const req = new requestService.RequestDetailsRequest();
            const { result } = await this.Parent.callFunc(0x99419f51, req);
            const deserialized = requestService.RequestDetailsResponse.deserializeBinary(result);
            const obj = deserialized.toObject();
            return obj
        }
        catch (error) {
            toast.error('Error fetching request details',
                {
                    style: TOAST_STYLE.ERROR,
                    description: error?.response?.data || error.message || error
                });
        }
    }

    async fetchAccountDetails(userId) {
        try {
            const req = new accService.AccAccountRequest();
            req.setUserid(userId);
            return this.Parent.callFunc(0x6feb999d, req).then(({ result }) => {
                const deserialized = accService.AccAccountResponse.deserializeBinary(result);
                return deserialized.toObject();
            });
        } catch (error) {
            toast.error('Error handling Smarties Free Plan',
                {
                    style: TOAST_STYLE.ERROR,
                    description: error?.response?.data || error.message || error
                });
        }

    }

    async fetchInvoices({ isLoadmore = false } = {}) {
        try {
            if (!Accounts.userId()) {
                return [];
            }

            if (!isLoadmore) {
                this.#data.remove({});
                this.#lastBasis = null;
            }

            if (this.#processes["fetchInvoices"]) return;
            this.#processes["fetchInvoices"] = true;
            this.setValue("loadingInvoices", true);
            const req = new toolService.FetchInvoicesRequest();
            req.setUserid(Accounts.userId());
            if (isLoadmore && this.#lastBasis) {
                req.setLastbasis(this.#lastBasis);
            }
            const { result } = await this.Parent.callFunc(0x48f221e8, req)
            const deserialized = toolService.FetchInvoicesResponse.deserializeBinary(result);
            const res = deserialized.toObject();
            const data = res.invoicesList;
            const lastBasis = res.lastbasis;
            this.#lastBasis = lastBasis;
            if (data && data.length) {
                data.forEach(item => {
                    this.DB.upsert({ id: item.id }, { $set: item });
                });
            }
            this.#processes["fetchInvoices"] = false;
            this.setValue("loadingInvoices", false);

        } catch (error) {
            toast.error('Error fetching invoices',
                {
                    style: TOAST_STYLE.ERROR,
                    description: error?.response?.data || error.message || error
                });
        }
    }

    fetchSubscriptionDetails() {
        try {
            this.setValue("isLoadingSubscription", true);
            if (this.#processes["fetchSubscription"]) return;
            this.#processes["fetchSubscription"] = true;
            const req = new toolService.fetchSubscriptionRequest();
            req.setUserid(Accounts.userId());
            return this.Parent.callFunc(0xd1fbcb2e, req).then(({ result }) => {
                const deserialized = toolService.fetchSubscriptionResponse.deserializeBinary(result);
                if (deserialized.getSuccess()) {
                    this.setValue("subscriptionDetails", deserialized.toObject());
                    this.#processes["fetchSubscription"] = false;
                    this.setValue("isLoadingSubscription", false);
                } else {
                    this.#processes["fetchSubscription"] = false;
                    this.setValue("isLoadingSubscription", false);
                    this.setValue("subscriptionDetails", null);
                    toast.error('Error fetching subscription details',
                        {
                            style: TOAST_STYLE.ERROR,
                            description: deserialized.getMessage() || 'Unknown error'
                        });
                }
                return deserialized.toObject();
            });
        } catch (error) {
            this.#processes["fetchSubscription"] = false;
            this.setValue("isLoadingSubscription", false);
            toast.error('Error handling Smarties Free Plan',
                {
                    style: TOAST_STYLE.ERROR,
                    description: error?.response?.data || error.message || error
                });
        }
    }

    fetchPaymentMethods() {
        try {
            this.setValue("isLoadingPaymentMethod", true);
            if (this.#processes["fetchPaymentMethods"]) return;
            this.#processes["fetchPaymentMethods"] = true;
            const req = new toolService.fetchpaymentMethodRequest();
            req.setUserid(Accounts.userId());
            return this.Parent.callFunc(0x47fa5676, req).then(({ result }) => {
                const deserialized = toolService.fetchpaymentMethodResponse.deserializeBinary(result);
                if (deserialized.getSuccess()) {
                    this.setValue("cardDetails", deserialized.toObject());
                    this.#processes["fetchPaymentMethods"] = false;
                    this.setValue("isLoadingPaymentMethod", false);
                } else {
                    this.#processes["fetchPaymentMethods"] = false;
                    this.setValue("isLoadingPaymentMethod", false);
                    this.setValue("cardDetails", null);
                }
                return deserialized.toObject();
            });
        } catch (error) {
            this.#processes["fetchPaymentMethods"] = false;
            this.setValue("isLoadingPaymentMethod", false);
            toast.error('Error handling Smarties Free Plan',
                {
                    style: TOAST_STYLE.ERROR,
                    description: error?.response?.data || error.message || error
                });
        }
    }

    listen() {
        if (!this.#listen) {
            this.#listen = RedisventService.Invoices.listen("invoices", Accounts.userId(), ({ event, data }) => {
                switch (event) {
                    case "remove":
                        break;
                    case "update":
                        break;
                    case "upsert":
                        break;
                    default:
                        Logger.showLog("Unknown event", event);
                        break;
                }
                this.activateWatch();
            });
        }
    }

    removeListener() {
        RedisventService.Invoices.remove(this.#listen);
    }
}

export default new BillingWatcher(Client);