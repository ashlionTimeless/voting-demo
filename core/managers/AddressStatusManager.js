'use strict';
require('../../enviroment');
var mongoose = require('mongoose');

var url = '127.0.0.1';//process.env.MONGODB_URL;
var dbname = 'test';//process.env.MONGODB_DB;

var uri = 'mongodb://'+url+'/'+dbname;
// console.log(url,dbname);
const NotFoundException = 'notFound';

var options = {
    // "user":user,
    // "pass":pass,
    // "dbName":dbname,
    // server: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } },
    // replset: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } },
    useNewUrlParser: true
};

mongoose.connect(uri, options);

const db = mongoose.connection;

var addressStatusSchema = new mongoose.Schema({
    address:String,
    transactionHash: String,
    amount:Number,
    closed: Number
});
addressStatusSchema.index({address:1},{unique:false});
const COLLECTION_NAME = 'addressStatus';
const addressStatus = mongoose.model(COLLECTION_NAME,addressStatusSchema);

class AddressStatusManager{
    constructor(app){
        // this.mSAuthService = app.mSAuthService;
        this.logger = app.logger;
        this.validator = app.validator;
        return this;
    };

    addAddress(address,transactionHash,amount){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateEthAddress(address);
                this.validator.validateString(transactionHash);
                this.validator.validateNumber(amount);
                var newAddress = new addressStatus({
                    address:address,
                    transactionHash: transactionHash,
                    amount:amount,
                    closed:0
                });
                var result = await newAddress.save((err,result)=>{
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
    isAddressOpen(address){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateEthAddress(address);
                var result = await this.getAddressByAddress(address);
                return resolve(result.closed);
            }catch(e){
                return reject(err)
            }
        });
    }
    isAddressOpenByTxHash(txHash){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateString(txHash);
                var result = await this.getAddressByTxHash(txHash);
                return resolve(result.closed);
            }catch(e){
                return reject(err)
            }
        });
    }
    closeAddressByAddress(address){
        return new Promise(async(resolve,reject)=>{
            this.validator.validateEthAddress(address);
            var result = await addressStatus.findOneAndUpdate({address:address},{closed:1},{new:true});
            try{
                result = await this.getAddressByAddress(address);
                return resolve(result.closed);
            }catch(e){
                return reject(err)
            }

        });
    };
    closeAddressByTxHash(txHash){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateString(txHash);
                var result = await addressStatus.findOneAndUpdate({transactionHash:txHash},{closed:1},{new:true});
                return resolve(result);
            }catch(e){
                return reject(err)
            }

        });
    };
    getAddressByAddress(address){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateEthAddress(address);
                var result = await addressStatus.findOne({ address: address });
                return resolve(result);
            }catch(e){
                return reject(err)
            }

        });
    };
    getAddressByTxHash(transactionHash){
        return new Promise(async(resolve,reject)=>{
            try{
                var result = await addressStatus.findOne({ transactionHash: transactionHash })
                return resolve(result);
            }catch(e){
                return reject(err)
            }

        });
    };
    getAllOpenAddresses(){
        return new Promise(async(resolve,reject)=>{
            try{
                var result = await addressStatus.find({closed:0});
                return resolve(result);
            }catch(e){
                return reject(err)
            }

        });
    };
    getAllClosedAddresses(){
        return new Promise(async(resolve,reject)=>{
            try{
                var result = await addressStatus.find({closed:1});
                return resolve(result);
            }catch(e){
                return reject(err)
            }

        });
    };
    deleteAddressByAddress(address){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateEthAddress(address);
                var result = await addressStatus.deleteOne({address: address });
                return resolve(result);
            }catch(e){
                return reject(err)
            }

        })
    };
    deleteAddressByTxHash(txHash){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateString(txHash);
                var result = await addressStatus.deleteOne({transactionHash: txHash });
                return resolve(result);
            }catch(e){
                return reject(NotFoundException)
            }
        })
    };
    deleteAllAddresses(){
        return new Promise(async(resolve,reject)=>{
            try{
                var result = await addressStatus.deleteMany({});
                return resolve(result);
            }catch(e){
                return reject(NotFoundException)
            }
        })
    };
}

module.exports=AddressStatusManager;