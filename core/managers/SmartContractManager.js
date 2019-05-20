'use strict';
require('../../enviroment');
const fs = require('fs');
const SmartContract = require('../models/mongoModels/SmartContract.js');
const NotFoundException = 'notFound';

class SmartContractManager{
    constructor(app){
        this.db = app.mongoDb;
        this.logger = app.logger;
        this.validator = app.validator;
        this.currencyManager = app.currencyManager;
        this.SmartContract = this.db.getModel(SmartContract);
        return this;
    };

    addSmartContract(addressSmartContract, contractAbi, status=true) {
    	return new Promise(async(resolve,reject)=>{
    		try{
    			let jsonFormatAbi = JSON.parse(contractAbi);
    			let ticker = "QWA";
    			let newSmartContract = new this.SmartContract({
    				smartContractAddress:addressSmartContract,
    				ticker:ticker,
    				active: status,
    				abi:jsonFormatAbi
    			});
    			newSmartContract.save((err,result)=>{
                    if(err) return reject(err);
                    console.log(`New Smart Contract ${addressSmartContract} added`);
                    return resolve(result);
                });
    		}catch(e){
                console.log(e)
                return reject(e);
            }
    	});
    };
};

module.exports=SmartContractManager;



//     addAccount(address,toSend=false,prevBalances=false){
//         return new Promise(async(resolve,reject)=>{
//             try{
//                 if(!toSend || !prevBalances){
//                     let currencies = await this.currencyManager.getAllCurrencies();
//                     let defaultBalances = {};
//                     for(let currencyIndex in currencies){
//                         defaultBalances[currencyIndex] = 0;
//                     }
//                     if(!toSend){
//                         toSend = {};
//                         toSend = defaultBalances;
//                     }
//                     if(!prevBalances){
//                         prevBalances = {};
//                         prevBalances = defaultBalances;
//                     }
//                 }
//                 this.validator.validateEthAddress(address);
//                 this.validator.validateObject(toSend);
//                 this.validator.validateObject(prevBalances);
//                 var newAccount = new this.UserAccount({
//                     address:address,
//                     toSend:toSend,
//                     prevBalances:prevBalances,
//                     active:1
//                 });
//                 newAccount.save((err,result)=>{
//                     if(err) return reject(err);
//                     console.log('New address '+address+'created');
//                     return resolve(result);
//                 });
//             }catch(e){
//                 console.log(e)
//                 return reject(e);
//             }
//         });
//     };
//     getAccount(address){
//         return new Promise(async(resolve,reject)=>{
//             try{
//                 this.validator.validateEthAddress(address);
//                 var result = await this.UserAccount.findOne({ address: address });
//                 return resolve(result);
//             }catch(e){
//                 return reject(e)
//             }
//         });
//     };
//     getAccountToSend(address,currency){
//         return new Promise(async(resolve,reject)=>{
//             try{
//                 this.validator.validateEthAddress(address);
//                 this.validator.validateString(currency);
//                 var result = await this.getAccount(address);
//                 try{
//                     result = result.toSend[currency]
//                 }catch (e) {
//                     result = 0;
//                 }
//                 return resolve(result);
//             }catch(e){
//                 return reject(e)
//             }
//         });
//     }
//     getAccountAssetSent(address,currency){
//         return new Promise(async(resolve,reject)=>{
//             try{
//                 this.validator.validateEthAddress(address);
//                 this.validator.validateString(currency);
//                 var result = await this.getAccount(address);
//                 try{
//                         result = result.prevBalances[currency]
//                 }catch (e) {
//                     result = 0;
//                 }
//                 return resolve(result);
//             }catch(e){
//                 return reject(e)
//             }
//         });
//     }
//     getAllActiveAccounts(){
//         return new Promise(async(resolve,reject)=>{
//             try{
//                 var result = await this.UserAccount.find({active:1});
//                 return resolve(result);
//             }catch(e){
//                 return reject(e)
//             }

//         });
//     };
//     updateAccountToSend(address,currency,newAmount){
//         return new Promise(async(resolve,reject)=>{
//             try{
//                 this.validator.validateString(address);
//                 this.validator.validateString(currency);
//                 this.validator.validateNumber(newAmount);

//                 let account = await this.getAccount(address);
//                 let toSend = account.toSend;
//                 toSend[currency]=newAmount;
//                 var result = await this.UserAccount.findOneAndUpdate({address:address},{toSend:toSend},{new:true});
//                 return resolve(result);
//             }catch(e){
//                 return reject(e)
//             }

//         });
//     }
//     updateAccountAssetSent(address,currency,newAmount){
//         return new Promise(async(resolve,reject)=>{
//             try{
//                 this.validator.validateString(address);
//                 this.validator.validateString(currency);
//                 this.validator.validateNumber(newAmount);

//                 let account = await this.getAccount(address);
//                 let prevBalances = account.prevBalances;
//                 prevBalances[currency]=newAmount;
//                 var result = await this.UserAccount.findOneAndUpdate({address:address},{prevBalances:prevBalances},{new:true});
//                 return resolve(result);
//             }catch(e){
//                 return reject(e)
//             }

//         });
//     }
//     deleteAccount(address){
//         return new Promise(async(resolve,reject)=>{
//             try{
//                 this.validator.validateEthAddress(address);
//                 var result = await this.UserAccount.deleteOne({address: address });
//                 return resolve(result);
//             }catch(e){
//                 return reject(e)
//             }

//         })
//     };
//     deleteAllAccounts(){
//         return new Promise(async(resolve,reject)=>{
//             try{
//                 var result = await this.UserAccount.deleteMany({});
//                 return resolve(result);
//             }catch(e){
//                 return reject(NotFoundException)
//             }
//         })
//     };
// }

