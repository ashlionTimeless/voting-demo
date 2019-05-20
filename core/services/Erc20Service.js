const SUBJECT = 'ERC20Service';
const ContractWrapper = require('./ContractWrapper');
const BigNumberHelper = require('../helpers/BigNumberHelper');

let MANYTOKENS = 100000000000000000000000000000000;


class Erc20Service{
    constructor(app){
        this.app = app;
        this.validator=app.validator;
        this.logger = app.logger;
        this.userService = app.userService;
        this.supervisedTransactionManager = app.supervisedTransactionManager;
        this.ethService = app.ethService;
    }
    init(){
        return new Promise(async(resolve,reject)=>{
            try{
                this.httpProvider=this.ethService.httpProvider;
                this.wsProvider = this.ethService.wsProvider;
                this.provider = this.ethService.provider;
                this.admin = this.ethService.admin;
                let contractWrapper = new ContractWrapper(this.wsProvider,this.validator);
                this.contract = await contractWrapper.getContract();
                return resolve(this);
            }catch (e) {
                return reject(e);
            }
        })
    }
    transferTokens(from_address,to_address,amount,privateKey){
        return new Promise(async(resolve, reject)=> {
            try{
                this.validator.validateString(privateKey,'Private Key String',true);
                this.validator.validateEthAddress(from_address,'From Address');
                this.validator.validateEthAddress(to_address,'To Address');
                amount = this.httpProvider.utils.toHex(amount);
                this.validator.validateNumber(amount,'Amount Transferred');
                if(from_address===to_address){
                    throw new Error('To and From Addresses are the same');
                }
                let params=this.ethService.formatTransactionParams(from_address,this.contract.options.address, privateKey);
                params.data=this.contract.methods.transfer(to_address, amount).encodeABI();
                let result = await this.ethService.makeTransaction(params);
                await this.supervisedTransactionManager.addTransaction(result,this.supervisedTransactionManager.TOPIC_E2C);
                this.logger.logEvent(SUBJECT,'Transfer Tokens To ',{address:to_address,amount:amount,hash:result});
                return resolve(result);
            }catch(e)
            {
                return reject(e);
            }
        });
    }

    approveTokenTransfer(from_address, adminAccount,amount,privateKey){
        //this.logger.debug("approvteToken: "+from_address + ' ' + amount);
        return new Promise(async(resolve, reject)=> {
            try{
                this.validator.validateString(privateKey,'Private Key String',true);
                this.validator.validateString(adminAccount,'To Address');
                amount = BigNumberHelper.toFixedBigValue(amount);
                //this.logger.debug("decimals - " + amount);
                amount = this.httpProvider.utils.toHex(amount);
                //this.logger.debug("hex - " + amount);
                this.validator.validateNumber(amount,'Amount Transferred');
                if(from_address===adminAccount){
                    throw  new Error('To and From Addresses are the same');
                }
                var data=this.contract.methods.approve(adminAccount, amount).encodeABI();
                var params=this.ethService.formatTransactionParams(from_address,this.contract.options.address, privateKey,0,data);
                var hash = await this.ethService.makeTransaction(params);
                await this.supervisedTransactionManager.addTransaction(hash,this.supervisedTransactionManager.TOPIC_E2C,false)
                this.logger.logEvent(SUBJECT,'Approve Tokens Transfer',{address:adminAccount,amount:MANYTOKENS,hash:hash});
                return resolve(hash);
            }catch(e)
            {
                return reject(e);
            }
        });
    }

    allowanceTokens(from_address,adminAccount){
        return new Promise(async(resolve, reject) => {
            try{
                this.validator.validateString(from_address,'From Address');
                this.validator.validateString(adminAccount,'To Address');
                if(from_address===adminAccount){
                    throw  new Error('To and From Addresses are the same');
                }
                var result = await this.contract.methods.allowance(from_address, adminAccount).call();
                this.validator.validateNumber(result,'User Allowance Tokens for Admin');
                result=parseInt(result);
                //this.logger.debug(result);
                return resolve(result);
            }catch(e)
            {
                return reject(e);
            };
        })
    }

    transferFromTokens(from_address,to_address,amount,privateKey){
        return new Promise(async(resolve, reject)=> {
            try{
                this.validator.validateString(privateKey,'Private Key String',true);
                this.validator.validateString(to_address,'To Address');
                this.validator.validateString(from_address,'From Address');
                amount = BigNumberHelper.toFixedBigValue(amount);
                //this.logger.debug("amount decimals - " + amount);
                amount = this.httpProvider.utils.toHex(amount);
                this.validator.validateNumber(amount,'Amount Transferred');
                if(from_address===to_address){
                    throw new Error('To and From Addresses are the same');
                }
                let data=this.contract.methods.transferFrom(from_address,to_address, amount).encodeABI();
                var params=this.ethService.formatTransactionParams(to_address, this.contract.options.address, privateKey,0,data);
                var hash = await this.ethService.makeTransaction(params);
                await this.supervisedTransactionManager.addTransaction(hash,this.supervisedTransactionManager.TOPIC_E2C);
                this.logger.logEvent(SUBJECT,'TransferFrom Tokens To ',{address:to_address,amount:amount,hash:hash});
                return resolve(hash);
            }catch(e)
            {
                return reject(e);
            }
        });
    }

    getSingleBalance(user_address){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateEthAddress(user_address,'User Address');
                let result = await this.contract.methods.balanceOf(user_address).call();
                this.validator.validateNumber(result,'User Token Balance');
                result = parseInt(result);
                return resolve(result);
            }catch(e){
                return reject(e);
            }
        })
    }

    TokenTransfer(callback){
        this.contract.events.Transfer({},
            callback);
    }
}

module.exports = Erc20Service;