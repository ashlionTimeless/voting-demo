const BigNumberHelper = require('../helpers/BigNumberHelper')
const WeiConverter = require('../helpers/WeiConverter');
const EthAddressHelper = require('../helpers/EthAddressHelper');
const UserBalanceMonitor = require('../../core/services/UserBalanceMonitor');
const SUBJECT = 'UserService';

const NO_ETHER = 'NO_ETHER';
const SEND_TOKENS = 'SEND_TOKENS';

let MANYTOKENS = 100000000000000000000000000000000;

class UserService{
    constructor(app){
        this.app = app;
        this.userAccountManager = app.userAccountManager;
        this.ethService = app.ethService;
        this.validator = app.validator;
        this.logger=app.logger;
        this.erc20Service = app.erc20Service;
        this.urlMap = app.urlMap;
        this.thresholder = app.thresholder;
        this.currencyManager = app.currencyManager;
        this.userBalanceMonitor = new UserBalanceMonitor(app);
        this.thresholder=app.thresholder;
    }
    checkUserAddress(user_address){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateEthAddress(user_address);
                let user_account = await this.userAccountManager.getAccount(user_address);
                if(user_account){
                    let result = '';
                    if((await this.checkEnoughLubricant(user_address))===true){
                        result = SEND_TOKENS;
                    }else{
                        result = NO_ETHER;
                    }
                    //this.debug('CHECK USER ADRESS');
                    //this.debug(result);
                    return resolve(result);
                }
            }catch(e){
                return reject(e);
            }
        });
    };
    checkEnoughLubricant(user_address){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateEthAddress(user_address);
                let balance = await this.ethService.getEthBalance(user_address);
                let result = false;
                if(balance >= this.thresholder.getEthMaxThreshold()){
                    result = true;
                }
                return resolve(result);
            }catch (e) {
                console.error(e);
                return reject(e);
            }
        });
    }

    listenToBalanceChange(){
        this.userBalanceMonitor.run();
    }
//     listenToSupervisedTransactions(){
//         console.log('!!!!!!!!!!!!!!!SupervisedTrsansactionMonitor was disabled')
// //        this.supervisedTransactionMonitor.run();
//     }
    listenToTransferEvent(){
        this.erc20Service.TokenTransfer(async(error,eventData)=>
        {
            try{
                if(!error)
                {
                    this.logger.logEvent(SUBJECT,'Transfer Event',[eventData.returnValues,eventData.transactionHash]);
                    let args = eventData.returnValues;
                    let _from = args.from;
                    let _to = args.to;
                    let _amount = BigNumberHelper.toFixedBigValue(args.value);
                    let _hash = eventData.transactionHash;

                    this.validator.validateEthAddress(args.to,'To Address');
                    this.validator.validateEthAddress(args.from,'From Address');
                    this.validator.validateString(_hash,'TxHash');
                    this.validator.validateNumber(_amount);

                    let url ='';
                    let data ={};
                    let result = false;
                    if(EthAddressHelper.compareEthAddresses(_to,this.ethService.admin.address) || EthAddressHelper.compareEthAddresses(_from,this.ethService.admin.address)){
                        this.logger.debug('ADMIN TRANSACTION');
                        if(_to===this.ethService.admin.address){
                            this.logger.debug("RECEIVED TO ADMIN");
                        }
                        if(_from === this.ethService.admin.address){
                            this.logger.debug("SEND FROM ADMIN");
                        }
                    }else{
                        let userIsOurs = await this.checkUserAddress(_to);
                        this.logger.debug("User Check Result:");
                        this.logger.debug(userIsOurs);
                        let user_address = _to;
                        if(userIsOurs){
                            if(userIsOurs === NO_ETHER){
                                try{
                                    // if validator passes than its TX Hash
                                    url = this.urlMap.server+this.urlMap.admin_received_event_post_url;
                                    _amount = WeiConverter.formatToDecimals(_amount);
                                    data = {from:_to,amount:_amount,hash:_hash,status:"RECEIVE"};
                                    let txHash = await this.ethService.transferEther(this.ethService.admin.address,user_address,this.thresholder.getEthMaxThreshold(),this.ethService.admin.key,false);
                                    this.logger.debug(txHash);
                                    this.validator.validateString(txHash);
                                    await this.userAccountManager.updateAccountAssetSent(user_address,await this.currencyManager.getCurrencySymbol('e2c'),_amount);
                                    await this.userAccountManager.updateAccountFeeMoney(user_address,this.thresholder.getEthMaxThreshold());
                                    this.logger.debug('Added user '+user_address+' to monitor');
                                    result = "LISTENING";
                                }catch(error){
                                    console.error(error);
                                    throw new Error('Response is not TX Hash');
                                }
                            }else{
                                if(userIsOurs === SEND_TOKENS){
                                    url = this.urlMap.server+this.urlMap.admin_received_event_post_url;
                                    _amount = WeiConverter.formatToDecimals(_amount);
                                    data = {from:_to,amount:_amount,hash:_hash,status:"RECEIVE"};
                                    let privateKey = await this.ethService.getPrivateKey(user_address);
                                    this.validator.validateString(privateKey);
                                    let allowanceResult = await this.erc20Service.allowanceTokens(user_address, this.erc20Service.admin.address);
                                    this.validator.validateNumber(allowanceResult);

                                    if(allowanceResult < _amount ){
                                        result = await this.erc20Service.approveTokenTransfer(user_address,this.erc20Service.admin.address,MANYTOKENS,privateKey);
                                        await this.userAccountManager.updateAccountAssetSent(user_address,await this.currencyManager.getCurrencySymbol('e2c'),_amount);
                                        await this.userAccountManager.updateAccountAssetSent(user_address,await this.currencyManager.getCurrencySymbol('e2c_allowed'),1);
                                    }else{
                                        result = await this.userAccountManager.updateAccountAssetSent(user_address,await this.currencyManager.getCurrencySymbol('e2c'),_amount);
                                    }
                                }
                            }
                        }
                    }
                    if(url && data){
                        if(process.env.NODE_ENV=='development' || process.env.NODE_ENV=='production'){
                            this.logger.debug("REPORT TO BACK " + await this.app.postEventData(url,data));
                        }
                        this.logger.logEvent(SUBJECT,'Delivered Transfer Event Data',result);
                    }
                }else
                {
                    this.logger.logError(SUBJECT,'Error Handling Transfer Event',error)
                    return false;
                }
            }catch (e) {
                this.logger.logError(SUBJECT,e);
                return false;
            }
        });
    }
}

module.exports = UserService;