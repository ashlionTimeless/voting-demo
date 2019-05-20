const ContractConfigMap = require('./../contractConfigMap')
//const FileFetcher = require('../../fetchers/FileFetcher')
//const ContractData = require('./ContractData')
class ContractBuilder{
	constructor(app){
		this.app = app;
		this.validator = app.validator;
		this.eth=app.eth;
		this.httpProvider = this.eth.httpProvider;
		this.wsProvider = this.eth.wsProvider;
		this.providers = {};
		this.providers['http'] = this.httpProvider;
		this.providers['ws'] = this.wsProvider;
		//this.fetcher = new FileFetcher();
	}

	build(address,abi,provider="http"){
		return new Promise(async(resolve,reject)=>{
			try{
				let contract= new this.providers[provider].eth.Contract(
                    abi);
                contract.options.address=address;
                this.validator.validateObject(contract, 'Smart Contract');
				return resolve(contract);
			}catch(e){
				return reject(e);
			}			
		})
	}

	getContractConfig(key){
		return new Promise(async(resolve,reject)=>{
			try{

				let filepath = ContractConfigMap[key];
				let config = await this.fetcher(filepath);
				return resolve(config);
			}catch(e){
				return reject(e);
			}			
		});
	}
}

module.exports = ContractBuilder;