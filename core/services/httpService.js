'use strict';
const GET_METHOD = 'GET';
const POST_METHOD = 'POST';
require('../../enviroment');
var request = require("request");
var requestPromise = require("request-promise");

class HttpService{
    constructor(app){
        // this.mSAuthService = app.mSAuthService;
        this.logger = app.logger;
        this.validator = app.validator;
        this.apiAuthService = app.apiAuthService;
        return this;
    };
    postRequest(req_url,data,headers,protocolCompliant=true) {
        return new Promise(async(resolve,reject)=>{
            try{
                var result = await this.httpRequest(POST_METHOD, req_url,data,headers,protocolCompliant)
                return resolve(result);
            }catch(e){
                return reject(e);
            }
        });
    };
    getRequest(req_url,data,headers,protocolCompliant=true) {
        return new Promise(async(resolve,reject)=>{
            try{
                var result = await this.httpRequest(GET_METHOD, req_url,data,headers,protocolCompliant)
                return resolve(result);
            }catch(e){
                return reject(e);
            }
        });
    };
    httpRequest(method,req_url,data,headers={},protocolCompliant){
        return new Promise(async(resolve,reject)=>{
            // if(protocolCompliant!==false){
            //     data = this.mSAuthService.signMSRequest(data);
            //     protocolCompliant = true;
            // }
            try{
                this.validator.validate(req_url,'url');
                // if(!headers){
                //     headers = {
                //         'Content-Type': 'multipart/form-data',
                //     };
                // }
                if(this.apiAuthService){
                    headers = await this.apiAuthService.addAuthHeaders(headers);
                }
                this.validator.validateString(req_url,'Req Url');
                this.validator.validateObject(headers,'Headers');
            }catch (e) {
                throw new Error(e);
                //            throw e;
            }
            // if(protocolCompliant){
            //     this.validator.validateObject(data,'Request Data');
            //     data = {data:JSON.stringify(data)};
            // }

            var options={
                uri:req_url,
                //form:data,
                body:data,
                method: method,
                headers: headers,
                json:true
            };
            requestPromise(options).then((res)=>{
                return resolve(res);
            }).catch(function (err) {
                return reject(err)
            });
        })
    }
}

module.exports=HttpService;
