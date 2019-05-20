const SUBJECT = 'Web3Wrapper';
const Web3 = require('web3');

class Web3Wrapper{
    constructor(app){
        this.validator = app.validator;
        this.logger = app.logger;
    }
    init(){
        return new Promise(async(resolve,reject)=>{
            try{
                this.web3ws = new Web3(new Web3.providers.WebsocketProvider(await this.getWsProviderAddress()),{
                    headers: {
                        Origin: "some_meaningful_name"
                    }
                });
                this.web3http = new Web3(new Web3.providers.HttpProvider(await this.getHttpProviderAddress()));
                return resolve(this);
            }catch (e) {
                return reject(e);
            }
        })
    }
    getWsProvider(){
        return this.web3ws;
    }
    getHttpProvider(){
        return this.web3http;
    }
    getWsProviderAddress(){
        return new Promise((resolve,reject)=>{
            try{
                let result = process.env.node_address_ws;
                this.validator.validateString(result,'Ws Provider Address');
                return resolve(result);
            }catch(e){
                this.logger.logError(SUBJECT,e);
                return reject(e);
            }
        });
    }

    getHttpProviderAddress(){
        return new Promise((resolve,reject)=>{
            try{
                let result = process.env.node_address_http;
                this.validator.validateString(result,'Http Provider Address');
                return resolve(result);
            }catch(e){
                this.logger.logError(SUBJECT,e);
                return reject(e);
            }
        });
    }
}

module.exports = Web3Wrapper;