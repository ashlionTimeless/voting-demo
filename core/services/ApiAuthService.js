'use strict';
require('../../enviroment');
class ApiAuthService{
    constructor(app){
        this.vaultService = app.vaultService;
        // this.mSAuthService = app.mSAuthService;
        this.logger = app.logger;
        this.validator = app.validator;
        return this;
    };

    addAuthHeaders(headers){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateObject(headers,'Headers');
                headers["Authorization"]=await this.getAuthHeader();
                return resolve(headers);
            }catch (e) {
                return reject(e);
            }
        })
    }

    getAuthHeader(){
        return new Promise(async(resolve,reject)=>{
            try{
                // return auth = "Basic " + new Buffer(username + ":" + password).toString("base64");
                let authToken = await this.getAuthToken();
                return resolve("Basic "+ authToken);
            }catch (e) {
                return reject(e);
            }
        })
    }
    getAuthToken(){
        return new Promise(async(resolve,reject)=>{
            try{
                let authToken = await this.vaultService.getApiAuthToken();
                return resolve(authToken);
            }catch (e) {
                return reject(e);
            }
        })
    }
}

module.exports=ApiAuthService;