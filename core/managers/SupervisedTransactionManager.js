'use strict';
require('../../enviroment');

const TxStatuses = require('../helpers/TxStatusHelper');
const SupervisedTransaction = require('../models/mongoModels/SupervisedTransaction.js');

const TOPIC_ETH = 'eth';
const TOPIC_E2C = 'e2c';

const NotFoundException = 'notFound';

class SupervisedTransactionManager{
    constructor(app){
        // this.mSAuthService = app.mSAuthService;
        this.TOPIC_ETH = TOPIC_ETH;
        this.TOPIC_E2C = TOPIC_E2C;
        this.db = app.mongoDb;
        this.logger = app.logger;
        this.validator = app.validator;
        this.SupervisedTransaction = this.db.getModel(SupervisedTransaction);
        return this;
    };
    addTransaction(txHash,topic,reportable=true){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateString(txHash);
                this.validator.validateString(topic);
                var newTx = new this.SupervisedTransaction({
                    txHash:txHash,
                    closed:0,
                    topic:topic,
                    status:TxStatuses.STATUS_PENDING,
                    reportable:reportable
                });
                var result = await newTx.save((err,result)=>{
                    if(err) return reject(err);
                    console.log('New Tx '+txHash+' added to supervised list');
                    return resolve(result);
                });
            }catch(e){
                console.log(e)
                return reject(e);
            }
        });
    };
    isTransactionSupervised(txHash){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateString(txHash);
                var result = await this.getSupervisedTransaction(txHash);
                return resolve(result.closed);
            }catch(e){
                return reject(e)
            }
        });
    };
    changeSupervisedTransactionStatus(txHash, newStatus){
        return new Promise(async(resolve,reject)=>{
            try{
                // if(!newStatus){
                //     throw 'NewStatus is not true '+newStatus+" given";
                // }
                this.validator.validateString(txHash);
                this.validator.validateBoolean(newStatus);
                var result = await this.SupervisedTransaction.findOneAndUpdate({txHash:txHash},{status:newStatus},{new:true});
                return resolve(result);
            }catch(e){
                return reject(e)
            }
        });
    }
    openSupervisedTransaction(txHash,status=true){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateString(txHash);
                var result = await this.SupervisedTransaction.findOneAndUpdate({txHash:txHash},{status:status,closed:0},{new:true});
                return resolve(result);
            }catch(e){
                return reject(e)
            }
        });
    };
    closeSupervisedTransaction(txHash){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateString(txHash);
                var result = await this.SupervisedTransaction.findOneAndUpdate({txHash:txHash},{closed:1},{new:true});
                return resolve(result);
            }catch(e){
                return reject(e)
            }
        });
    };
    getSupervisedTransaction(txHash){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateString(txHash);
                var result = await this.SupervisedTransaction.findOne({ txHash: txHash });
                return resolve(result);
            }catch(e){
                return reject(e)
            }

        });
    };
    getAllPendingTransactions(){
        return new Promise(async(resolve,reject)=>{
            try{
                var result = await this.SupervisedTransaction.find({status:TxStatuses.STATUS_PENDING});
                return resolve(result);
            }catch(e){
                return reject(e)
            }
        });
    };
    getAllErroredTransactions(){
        return new Promise(async(resolve,reject)=>{
            try{
                var result = await this.SupervisedTransaction.find({status:TxStatuses.STATUS_ERROR});
                return resolve(result);
            }catch(e){
                return reject(e)
            }
        });
    };

    getAllSupervisedTransactions(){
        return new Promise(async(resolve,reject)=>{
            try{
                var result = await this.SupervisedTransaction.find({closed:0});
                return resolve(result);
            }catch(e){
                return reject(e)
            }
        });
    };
    getAllClosedTransactions(){
        return new Promise(async(resolve,reject)=>{
            try{
                var result = await this.SupervisedTransaction.find({closed:1});
                return resolve(result);
            }catch(e){
                return reject(e)
            }

        });
    };
    deleteSupervisedTransaction(txHash){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateEthAddress(txHash);
                var result = await this.SupervisedTransaction.deleteOne({txHash: txHash });
                return resolve(result);
            }catch(e){
                return reject(e)
            }

        })
    };
    deleteAllSupervisedTransactions(){
        return new Promise(async(resolve,reject)=>{
            try{
                var result = await this.SupervisedTransaction.deleteMany({});
                return resolve(result);
            }catch(e){
                return reject(NotFoundException)
            }
        })
    };
}

module.exports=SupervisedTransactionManager;