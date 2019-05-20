'use strict';
require('../../enviroment.js');
const loggerSubject = 'MONGO';
const Mongoose = require('mongoose');
Mongoose.Promise = Promise;
const NotFoundException = 'notFound';


class MongoDb{
    constructor(app){
        this.vaultService = app.vaultService;
        this.validator = app.validator;
        this.logger = app.logger;
    };
    init(){
        return new Promise(async(resolve,reject)=>{
            try{
                const uri = await this.getDbUrl();
                let options = await this.getDbOptions();
                let db = await this.connectToDb(uri, options);
                this.db = db;
                return resolve(this);
            }catch(e){
                return reject(e);
            }
        })
    }
    getModel(model){
        try{
            var schema =  new Mongoose.Schema(model.fields);
            schema.methods = model.methods;
            schema.index(model.indexFields, model.indexOptions);
            return Mongoose.model(model.collectionName,schema);
        }catch (e) {
            this.logger.logError(loggerSubject,e.message,e);
            return false;
        }
    }
    getDb(){
        return this.db;
    }
    getDbUrl(){
        return new Promise(async(resolve,reject)=>{
            try{
                let params = {
                    protocol:"mongodb://",
                    connectUrl: await this.getMongoUrl(),
                    dbName: await this.getDbName(),
                    parsedCredentials: await this.getParsedCredentials()
                }
                let url = params.protocol+''+params.parsedCredentials+''+params.connectUrl+'/'+params.dbName;            
                return resolve(url);
            }catch(e){
                return reject(e);
            }
        });
        return url;
    }
    getMongoUrl(){
        return new Promise((resolve,reject)=>{
            return resolve(process.env.MONGODB_URL);
        });
    }
    getDbName(){
        return new Promise((resolve,reject)=>{
            return resolve(process.env.MONGODB_DB);
        });
    }
    getParsedCredentials(){
        return new Promise(async(resolve,reject)=>{
            try{
                let user = await this.getUserCred();
                let password = await this.getPassword(user);
                let parsed = user+":"+password+"@";
                return resolve(parsed);
            }catch(e){
                return reject(e);
            }
        });
    }
    getUserCred(){
        return new Promise(async(resolve,reject)=>{
            try{
                let result = await this.vaultService.getMongoUser();
                this.validator.validateString(result,'Mongo User',true);
                return resolve(result);
            }catch (e) {
                return reject(e);
            }
        });
    }
    getPassword(){
        return new Promise(async(resolve,reject)=>{
            try{
                let result = await this.vaultService.getMongoPassword();
                this.validator.validateString(result,'Mongo Password',true);
                return resolve(result);
            }catch (e) {
                return reject(e);
            }
        });
    }
    getDbOptions(){
        return new Promise((resolve,reject)=>{
            var options = {
                    autoReconnect: true,
                    reconnectTries: 1000000,
                    reconnectInterval: 3000,
                    useNewUrlParser: true,
                    bufferCommands:false,
                    // server: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } },
                    // replset: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } },
                };

            return resolve(options);
        })
    }
    connectToDb(uri, options){
        return new Promise(async(resolve,reject)=>{
            // const db = Mongoose.connection;
            // db.on('connected', () => {
            //     this.logger.logEvent(loggerSubject,'Connection Established');
            // });
            //
            // db.on('reconnected', () => {
            //     this.logger.logEvent(loggerSubject,'Connection Reestablished');
            // });
            //
            // db.on('disconnected', () => {
            //     this.logger.logError(loggerSubject,'Connection Disconnected');
            // });
            //
            // db.on('close', () => {
            //     this.logger.logError(loggerSubject,'Connection Closed');
            // });
            //
            // db.on('error', (error) => {
            //     this.logger.logError(loggerSubject,'ERROR: ' + error);
            // });

            const db = Mongoose.connect(uri, options);
            //const db=  Mongoose.createConnection(URI,OPTIONS);
            db.then(()=>{
//                    console.log(Mongoose.connection)
                    this.db = db;
                    return resolve(this);
                }).catch((error)=>{
                    return reject(error);
                });
        })
    }
};
module.exports = MongoDb;
