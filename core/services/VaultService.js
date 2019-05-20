'use strict';
// var HttpService = require("./httpService.js");
// const httpService = new HttpService();
const requestPromise = require('request-promise');
const MONGO_NAMESPACE = 'mongo';
const MONGO_PASSWORD_KEY = ''
const urlMap = {
    vaultServer:process.env.SECRET_SERVER,
    init:'v1/sys/init',
  	 addSecret:'v1/secret/data/eth-proxy',
  	 getSecret:'v1/secret/data/eth-proxy',
    //addSecret:'v1/secret',
    //getSecret:'v1/secret',
  	lookupSelf:'v1/auth/token/lookup-self',
}

class VaultService{
    constructor(app){
        this.urlMap = urlMap;
        this.validator = app.validator;
        this.authToken = '';
        return this;
    }
    addSecret(namespace,key,value){
        return new Promise(async(resolve,reject)=>{
            try{
//                var url = this.urlMap.addSecret+'/'+namespace;
                var url = this.urlMap.addSecret+'/'+namespace+'/'+key;
//                var url = this.urlMap.addSecret;
                var innerData = {};
                innerData[key]=value;

                var data = {
                    data:innerData
                };

                data = JSON.stringify(data);
                var headers= {};
                headers["Content-Type"]="application/json";
                var result = await this.sendPostRequest(url,data,headers);
                if(result){
                    return resolve(true);
                }
                return resolve(result);
            }catch(e){
                return reject(e);
            }
        });
    }

    getSecret(namespace,key){
        return new Promise(async(resolve,reject)=>{
            try{
//                var url = this.urlMap.getSecret+'/'+namespace;
                var url = this.urlMap.getSecret+'/'+namespace+'/'+key;
//                var url = this.urlMap.getSecret;
                var result = await this.sendGetRequest(url);
                try{
                    result = result.data.data[key];
                }catch(e){
                    throw e;
                }
                return resolve(result);
            }catch(e){
                return reject(e);
            }
        });
    }
    lookupSelf(){
        return new Promise(async(resolve,reject)=>{
            try{
                var url = this.urlMap.lookupSelf;
                var result = await this.sendPostRequest(url);
                return resolve(result);
            }catch(e){
                return reject(e);
            }
        });
    }

    sendPostRequest(url,data,headers){
        return new Promise(async(resolve,reject)=>{
            try{
                url = this.urlMap.vaultServer+'/'+url;
                var result = await this.httpRequest('POST',url,data,headers,true);
                return resolve(result);
            }catch(e){
                return reject(e);
            }
        }); 
    }

    sendGetRequest(url,data,headers){
        return new Promise(async(resolve,reject)=>{
            try{
                var result = await this.httpRequest('GET',url,data,headers,true);
                return resolve(result);
            }catch(e){
                return reject(e);
            }
        });
    }

    httpRequest(method,url,data,headers){
        return new Promise(async(resolve,reject)=>{
            try{
                if(!headers){
                    headers= {};
                }
                if(!data){
                    data = {};
                }
                headers['X-Vault-Token']= this.getAuthToken();
                url = this.urlMap.vaultServer+'/'+url;
                var options={
                    uri:url,
                    form:data,
                    method: method,
                    headers: headers,
                    json:true
                };
                requestPromise(options).then((res)=>{
                    return resolve(res);
                }).catch(function (err) {
                    return reject(err)
                });
            }catch(e){
                return reject(e);
            }
        });
    }
    getAuthToken(){
        return this.authToken;
    }
    setAuthToken(token){
        this.validator.validateString(token,'Vault Token',true);
        this.authToken = token;
    }
    getMongoUser(){
        return new Promise(async(resolve,reject)=>{
            try{
                //let result = 'adminname';
                let result = await this.getSecret('mongo','user');
                return resolve(result);
            }catch (e) {
                return reject(e);
            }
        })
    }
    getMongoPassword(){
        return new Promise(async(resolve,reject)=>{
            try{
            //    let result = 'rootpass';
                let result = await this.getSecret('mongo','password');
                return resolve(result);
            }catch (e) {
                return reject(e);
            }
        })
    }
    getApiAuthToken(){
        return new Promise(async(resolve,reject)=>{
            try{
                //let result = 'ZTJjcHJveHk6Y3J5cHRvLWF3ZXNvbWUtcGFzc3dvcmQtITQqKi1oYXJkLXRvLWd1ZXNz';
                let result = await this.getSecret('backend','token');
                return resolve(result);
            }catch (e) {
                return reject(e);
            }
        })
    }
    verifyConnection(){
        return new Promise(async(resolve,reject)=>{
            try{
                let result = await this.getMongoUser();;
                //let result = true;
                if(result){
                    return resolve(true);
                }else{
                    return reject(new Error('Could not receive data from Vault'));
                }
            }catch (e) {
                return reject(e);
            }
        })
    }
    // vaultServiceTest(){
    //     try{
    //      console.log(await addSecret('eth-proxy','private_key','MUCH_PRIVATE2'));
    //      console.log(await getSecret('eth-proxy','private_key','key'));  
    //     }catch(e){
    //         console.log(e)
    //     }
    //     return true;
    // }
}

module.exports=VaultService;
