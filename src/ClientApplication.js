const EthereumLib = require('./EthereumLib');
const ContractLib = require('./../core/contracts/ethereum/elections/ContractLib');

let Validator = require('../core/utilites/Validator');
let Logger = require('../core/utilites/Logger')

class ClientApplication{
    constructor(){
        this.initialized = false;
        this.logger = new Logger();
        this.validator = new Validator();
        //new code
        this.protocols = {};
        this.eth = new EthereumLib(this);
        this.contract = new ContractLib(this);   
    }  

init(){
    return new Promise(async(resolve,reject)=>{
        try{
            await this.contract.init();
            this.initialized = true;
            console.log('Application is ready');
            return resolve(true);
        }catch(e){
            return reject(e)
        }
    })
}
isReady(){
    return this.initialized;
}
    vote(key,privKey){
        return new Promise(async(resolve,reject)=>{
            console.log(key,privKey)
            try{
                return resolve(await this.contract.vote(key,privKey))
            }catch(e){
                return reject(e);
            }
        })
    }
    getAllCandidates(){
        return new Promise(async(resolve,reject)=>{
            try{
                return resolve(await this.contract.getAllCandidates())
            }catch(e){
                return reject(e);
            }
        })
    }
    getCandidateData(key){
        return new Promise(async(resolve,reject)=>{
            try{
                return resolve(await this.contract.getCandidateData(key))
            }catch(e){
                return reject(e);
            }
        })
    }
    getCandidateVotes(key){
        return new Promise(async(resolve,reject)=>{
            try{
                return resolve(await this.contract.getVotes(key))
            }catch(e){
                return reject(e);
            }
        })
    }
    recalculateWinners(privKey){
        return new Promise(async(resolve,reject)=>{
            try{
                return resolve(await this.contract.calculateWinners(privKey))
            }catch(e){
                return reject(e);
            }
        })
    }
    getWinners(){
        return new Promise(async(resolve,reject)=>{
            try{
                return resolve(await this.contract.getWinners())
            }catch(e){
                return reject(e);
            }
        })
    }
}

module.exports = ClientApplication;