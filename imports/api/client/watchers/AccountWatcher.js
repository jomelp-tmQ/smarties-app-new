import core from "@tmq-dev-ph/tmq-dev-core-client";
import { Meteor } from "meteor/meteor";
import { Watcher2 } from "../Watcher2";
import Client from "../Client";
import accService from "../../common/static_codegen/tmq/acc_pb";
import { toast } from 'sonner';
import { TOAST_STYLE } from "../../common/const";
import { Accounts } from 'meteor/tmq:accounts';
const { Adapter, Logger } = core;

Adapter.Meteor = Meteor;
Adapter.Accounts = Accounts;

class AccountWatcher extends Watcher2 {
    #processes = {};
    constructor(parent) {
        super(parent);
    }

    get UserId() {
        return Accounts.userId();
    }

    get CurrentUser() {
        return Accounts.user();
    }


    async signup(email, password, accountName) {
        if (this.#processes["signUp"]) return;
        this.#processes["signUp"] = true;
        try {
            await Accounts.createUser({
                email: email,
                password: password,
                profile: {
                    roles: ["user"],
                    accountName: accountName
                }
            });
            toast.success('Sign up successfully', {
                style: TOAST_STYLE.SUCCESS
            });
            window.location.href = "/login";
        } catch (error) {
            this.#processes["signUp"] = false;
            Logger.showError("AccountWatcher.signup", error);
            toast.error('Failed to create account', {
                style: TOAST_STYLE.ERROR
            });
            throw error;
        } finally {
            this.#processes["signUp"] = false;
        }
    }

    async mocksignup(username, password, email, profile) {
        return new Promise((resolve, reject) => {
            if (password.length < 6) reject(new Error("Password must be at least 6 characters long"));
            Accounts.createUser({
                username: username,
                email: email,
                password: password,
                profile
            }, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve("User created successfully");
                }
            });
        });
    }


    async updateAccountDetails(formData) {
        const { location, phone, currentPassword, newPassword } = formData;
        try {
            await Accounts.updateUser(Accounts.userId(), {
                address: location,
                phone
            }, currentPassword, newPassword);
            // this.setValue("loadingUpdateAccount", true);
            // if (this.#processes["updateAccount"]) return;
            // this.#processes["updateAccount"] = true;
            // const req = new accService.UpdateAccountRequest();
            // req.setUserid(Accounts.userId());
            // req.setAddress(location);
            // req.setPhone(phone);
            // req.setCurrentpassword(currentPassword);
            // req.setNewpassword(newPassword);
            // return this.Parent.callFunc(0x4f0a7208, req).then(({ result }) => {
            //     const deserialized = accService.UpdateAccountResponse.deserializeBinary(result);
            //     if (deserialized.getSuccess()) {
            //         Logger.showStatus("AccountWatcher.updateAccountDetails", "Update user successfully");
            //         toast.success('Update User Successfully', {
            //             style: TOAST_STYLE.SUCCESS
            //         });
            //     }
            // }).finally(() => {
            //     this.#processes["updateAccount"] = false;
            //     this.setValue("loadingUpdateAccount", false);
            // });
        } catch (error) {
            Logger.showError("AccountWatcher.updateAccountDetails", error);
            toast.error(`Failed to update USER ${error.message}`, {
                style: TOAST_STYLE.ERROR
            });
        }
    }

    async fetchCustomerId() {
        try {
            const req = new accService.AccCustomerIdRequest();
            req.setUserid(Accounts.userId());
            const { result } = await this.Parent.callFunc(0x3cccdb81, req);
            const deserialized = accService.AccCustomerIdResponse.deserializeBinary(result);
            const obj = deserialized.toObject();
            return obj;
        } catch {
            Logger.showError("AccountWatcher.fetchCustomerId", error);
        }
    }

    async fetchAccountDetails(userId) {
        const req = new accService.AccAccountRequest();
        req.setUserid(userId);
        return this.Parent.callFunc(0x6feb999d, req).then(({ result }) => {
            const deserialized = accService.AccAccountResponse.deserializeBinary(result);
            return deserialized.toObject();
        });
    }
}

export default new AccountWatcher(Client);