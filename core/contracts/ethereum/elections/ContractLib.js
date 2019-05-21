const EthereumUtil = require('ethereumjs-util');
const ContractBuilder = require('./../EthContractBuilder')
const ContractData = require('./ContractData.js')
class ElectionsLib{
	constructor(app){
        this.app = app;
        this.eth = app.eth;
        this.validator=app.validator;
        this.logger = app.logger;
        this.contractBuilder = new ContractBuilder(app);
        this.httpProvider=this.eth.httpProvider;
        this.wsProvider = this.eth.wsProvider;
        this.provider = this.eth.provider;
        this.admin = this.eth.admin;
	}
    init(){
        return new Promise(async(resolve,reject)=>{
            try{
                this.contractData = new ContractData();
                this.contract = await this.contractBuilder.build(
                        this.contractData.getAddress(),
                        this.contractData.getAbi(),
                        this.contractData.getRecommendedProvider(),
                    );
                // this.getAllCandidates().then((data)=>{
                //     console.log(data)
                //     return resolve(data)
                // })
                return resolve(true);
            }catch(e){
                return reject(e)
            }
        })
    }

    vote(key,privKey){
        let address = "0x"+EthereumUtil.privateToAddress("0x"+privKey).toString('hex');
        return new Promise(async(resolve,reject)=>{
            let params=this.eth.formatTransactionParams(
                        address,
                        this.contract.address,
                        privKey,
                        '0',
                        10,
                        300000,
                        this.contract.methods.vote(key).encodeABI()
                        );
            let txHash = await this.eth.makeTransaction(params);
            return resolve(txHash); 
        })
    }
    calculateWinners(privKey){
        console.log(privKey)
        let address = "0x"+EthereumUtil.privateToAddress("0x"+privKey).toString('hex');
        return new Promise(async(resolve,reject)=>{
            let params=this.eth.formatTransactionParams(
                        address,
                        this.contract.address,
                        privKey,
                        '0',
                        10,
                        300000,
                        this.contract.methods.calculateWinners().encodeABI()
                        );
            let txHash = await this.eth.makeTransaction(params);
            return resolve(txHash); 
        })
    }
    getCandidateData(key){
        return new Promise(async(resolve,reject)=>{
            try{
                let result = await this.contract.methods.getCandidate(key).call();
                return resolve(result);
            }catch(e){
                return reject(e)
            }
        });
    }
    getAllCandidates(){
        return new Promise(async(resolve,reject)=>{
            try{
                let result = await this.contract.methods.getAllCandidates().call();
                return resolve(result);
            }catch(e){
                return reject(e)
            }
        });
    }
    getWinners(){
        return new Promise(async(resolve,reject)=>{
            try{
                let result = await this.contract.methods.getWinners().call();
                return resolve(result);
            }catch(e){
                return reject(e)
            }
        });
    }
    getVotes(key){
        return new Promise(async(resolve,reject)=>{
            try{
                let result = await this.contract.methods.getVotes(key).call();
                return resolve(result);
            }catch(e){
                return reject(e)
            }
        });
    }
}

module.exports = ElectionsLib;