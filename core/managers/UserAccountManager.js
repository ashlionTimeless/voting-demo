'use strict';
require('../../enviroment');
const UserAccount = require('../models/mongoModels/UserAccount.js');
const NotFoundException = 'notFound';

class UserAccountManager{
    constructor(app){
        // this.mSAuthService = app.mSAuthService;
        this.db = app.mongoDb;
        this.logger = app.logger;
        this.validator = app.validator;
        this.currencyManager = app.currencyManager;
        this.UserAccount = this.db.getModel(UserAccount);
        return this;
    };
    addAccount(address){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateEthAddress(address);
                let assetsMaps = (new this.UserAccount().getAssetsMaps());
                console.log(assetsMaps);
                var newAccount = new this.UserAccount({
                    address:address,
                    assets:assetsMaps,
                    active:1
                });
                newAccount.save((err,result)=>{
                    if(err) return reject(err);
                    console.log('New address '+address+'created');
                    return resolve(result);
                });
            }catch(e){
                console.log(e)
                return reject(e);
            }
        });
    };
    getAccount(address){
        return new Promise(async(resolve,reject)=>{
            try{
                console.log('getAccount')
                this.validator.validateEthAddress(address);
                var result = await this.UserAccount.findOne({ address: { $regex : new RegExp(address, "i") } });
                console.log(result)
                return resolve(result);
            }catch(e){
                return reject(e)
            }
        });
    };
    getAccountAssetSent(address, currency){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateString(currency);
                var account = await this.getAccount(address);
                let assetSent = 0;
                try{
                    assetSent = account.getAssetSent(currency);
                }catch (err) {
                    console.error('!!!!!!!!!!!!!!1RESULT IS GONNA BE 0!!!!!!!!!!!!!!!!!11')
                    console.error(err);
                    console.log(account);
                }
                return resolve(assetSent);
            }catch(e){
                return reject(e)
            }
        });
    }
    getAccountFeeMoney(address){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateEthAddress(address);
                let account = await this.getAccount(address);
                let lubricant = account.getAssetFeeMoney('eth');
                console.log('User '+address+" lubricant is "+lubricant);
                return resolve(lubricant);
            }catch(e){
                return reject(e)
            }
        });    
    }
    getAllActiveAccounts(){
        return new Promise(async(resolve,reject)=>{
            try{
                var result = await this.UserAccount.find({active:1});
                return resolve(result);
            }catch(e){
                return reject(e)
            }

        });
    };
    updateAccountAssetSent(address, currency, newAmount){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateString(address);
                this.validator.validateString(currency);
                this.validator.validateNumber(newAmount);
                let result = await this.updateAccountAssetAttribute(address,currency,'sent',newAmount);
                console.log('updated AccountPrevBalances');
                return resolve(result);
            }catch(e){
                return reject(e)
            }

        });
    }
    updateAccountFeeMoney(address, newAmount){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateString(address);
                this.validator.validateNumber(newAmount);
                let result = await this.updateAccountAssetAttribute(address,'eth','feeMoney',newAmount);
                console.log('UpdateAccountLubricant');
                console.log(result)
                return resolve(result);
            }catch(e){
                return reject(e)
            }
        });
    }
    startAwaitingFeeMoney(address){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateString(address);
                let result = await this.updateAccountAssetAttribute(address,'eth','awaitingFeeMoney',true);
                console.log('startAwaitingFeeMoney');
                return resolve(result);
            }catch(e){
                return reject(e)
            }
        });
    }
    stopAwaitingFeeMoney(address){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateString(address);
                let result = await this.updateAccountAssetAttribute(address,'eth','awaitingFeeMoney',false);
                console.log('stopAwaitingFeeMoney');
                console.log(result)
                return resolve(result);
            }catch(e){
                return reject(e)
            }
        });
    }
    startWaitingForApproval(address){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateString(address);
                let result = await this.updateAccountAssetAttribute(address,'e2c','awaitingApproval',true);
                console.log('startWaitingForApproval');
                return resolve(result);
            }catch(e){
                return reject(e)
            }
        });
    }
    stopWaitingForApproval(address){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateString(address);
                let result = await this.updateAccountAssetAttribute(address,'e2c','awaitingApproval',false);
                console.log('stopWaitingForApproval');
                console.log(result)
                return resolve(result);
            }catch(e){
                return reject(e)
            }
        });
    }
    startAwaitingApprovalNullification(address){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateString(address);
                let result = await this.updateAccountAssetAttribute(address,'e2c','awaitingApprovalNullification',true);
                console.log('startAwaitingApprovalNullification');
                return resolve(result);
            }catch(e){
                return reject(e)
            }
        });
    }
    stopAwaitingApprovalNullification(address){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateString(address);
                let result = await this.updateAccountAssetAttribute(address,'e2c','awaitingApprovalNullification',false);
                console.log('stopAwaitingApprovalNullification');
                console.log(result)
                return resolve(result);
            }catch(e){
                return reject(e)
            }
        });
    }
    updateAccountAssetAttribute(address,assetSymbol,attribute,newValue){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateString(address);
                this.validator.validateString(assetSymbol);
                this.validator.validateString(attribute);
                if(newValue===null || newValue===undefined){
                    throw new Error('Invalid newValue:'+newValue);
                }
                let account = await this.getAccount(address);
                account.updateAssetAttribute(assetSymbol,attribute,newValue);
                let result = await this.updateAccountAssets(address,account.assets);
                return resolve(result);
            }catch(e){
                return reject(e)
            }
        });
    }
    updateAccountAssets(address,newAssets){
        return new Promise(async(resolve,reject)=>{
            try{
                console.log('UpdateAcountAssets: '+address);
                console.log(newAssets)
                this.validator.validateString(address);
                this.validator.validateObject(newAssets);
                console.log('UpdateAccountAssets')
                console.log(newAssets);
                var result = await this.UserAccount.findOneAndUpdate({address: { $regex : new RegExp(address, "i") }},{assets:newAssets},{new:true});
                console.log(result)
                return resolve(result);
            }catch(e){
                return reject(e)
            }
        });
    }

    deleteAccount(address){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateEthAddress(address);
                var result = await this.UserAccount.deleteOne({address: { $regex : new RegExp(address, "i") }});
                return resolve(result);
            }catch(e){
                return reject(e)
            }

        })
    };
    deleteAllAccounts(){
        return new Promise(async(resolve,reject)=>{
            try{
                var result = await this.UserAccount.deleteMany({});
                return resolve(result);
            }catch(e){
                return reject(NotFoundException)
            }
        })
    };
}

module.exports=UserAccountManager;