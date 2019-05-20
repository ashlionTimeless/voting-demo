const SUBJECT = 'EthService';
const EthAddressHelper = require('../helpers/EthAddressHelper');
const EthereumTx = require('ethereumjs-tx');
const NonceService = require('../../core/services/NonceService');
const Web3Wrapper = require('./Web3Wrapper')

class EthService{
    constructor(app){
        this.app = app;
        this.urlMap=app.urlMap;
        this.validator=app.validator;
        this.logger=app.logger;
        this.supervisedTransactionManager = app.supervisedTransactionManager;
        this.httpService=app.httpService;
        this.provider = false;
    }
    init(){
        return new Promise(async(resolve,reject)=>{
            try{
                let web3Wrapper = new Web3Wrapper(this.app);
                web3Wrapper = await web3Wrapper.init();
                this.wsProvider = web3Wrapper.web3ws;
                this.httpProvider = web3Wrapper.web3http;
                // this is main provider
                this.provider = this.httpProvider;

                this.nonceService = new NonceService(this.provider,this.validator,this.logger);
                await this.setAdminAccount();
                this.logger.logEvent(SUBJECT,'API IS INITIALIZED');
                return resolve(this);
            }catch (e) {
                this.logger.logError(SUBJECT,e);
                return reject(e);
            }
        })
    }
    setAdminAccount(){
        return new Promise(async(resolve,reject)=>{
            try{
                let adminAccount = await this.getAdminAccount();
                this.admin={};
                this.admin.address=adminAccount;
                try{
                    this.admin.key= await this.getAdminKey();
                }catch(e){
                    this.logger.logError(SUBJECT,'Error fetching admin key',e);
                }
                return resolve(true);
            }catch (e) {
                return reject(e);
            }
        });
    }
    createAccount(){
        return new Promise(async(resolve,reject)=>{
            try{
                return resolve(this.provider.eth.accounts.create(''))
            }catch (e) {
                return reject(e);
            }
        })
    }
    transferEther(from_address,to_address,amount,privateKey,reportable=true){
        return new Promise(async(resolve, reject)=> {
            try{
                this.validator.validateString(privateKey,'Private Key String',true);
                this.validator.validateEthAddress(from_address,'From Address');
                this.validator.validateEthAddress(to_address,'To Address');
                //this.debug(amount)
                amount = this.httpProvider.utils.toHex(amount);

                this.validator.validateNumber(amount,'Amount Transferred');
                if(from_address===to_address){
                    throw new Error('To and From Addresses are the same');
                }
                //this.debug(amount)
                let params=this.formatTransactionParams(from_address, to_address, privateKey,amount);
                let hash = await this.makeTransaction(params);
                await this.supervisedTransactionManager.addTransaction(hash,this.supervisedTransactionManager.TOPIC_ETH,reportable);
                this.logger.logEvent(SUBJECT,'Transfer Ether To ',{address:to_address,amount:amount,hash:hash});
                return resolve(hash);
            }catch(e)
            {
                this.logger.logError(SUBJECT,e);
                return reject(e);
            }
        });
    }
    getEthBalance(address){
        return new Promise(async(resolve,reject)=>{
            try{
                let balance = this.httpProvider.eth.getBalance(address)
                return resolve(balance);
            }catch (e) {
                return reject(e);
            }
        })
    }



    getAdminAccount(){
        return new Promise((resolve,reject)=>{
            try{
                let result = process.env.ADMIN_ADDRESS;
                this.validator.validateString(result,'Admin Address');
                return resolve(result);
            }catch(e){
                this.logger.logError(SUBJECT,e);
                return reject(e);
            }
        });
    }
    getAdminKey(){
        return new Promise(async(resolve,reject)=>{
            try{
                let privKey = await this.getPrivateKey(this.admin.address);//httpService.getRequest(req_url,data);
                return resolve(privKey);
            }catch(e){
                this.logger.logError(SUBJECT,e);
                return reject(e);
            }
        });
    }
    getPrivateKey(user_address){
        return new Promise(async(resolve,reject)=>{
            try{
                this.validator.validateEthAddress(user_address);
                let url = this.urlMap.server+this.urlMap.get_private_key_url;
                let data ={address:user_address};
                let headers = {"Content-Type":"application/json"};
                let result = false;
                let privateKey = '';
                try{
                    try{
                        console.log('---------------------'+user_address)
                        if(!EthAddressHelper.compareEthAddresses(user_address,this.admin.address)){
                            this.logger.logError(SUBJECT,'HARDCODED PRIVATEKEY IN EthService 137 row');
                            privateKey= "34e971d425c7b409a15566bbf7e118cfc5f320e0e7dbff373d0b4b7ff8a8813c";//await this.httpService.getRequest(url,data,headers);
                        }else{
                            privateKey= await this.httpService.getRequest(url,data,headers);
                        }
                    }catch(error){
                        throw new Error('Address Not Found');
                    }
                    try{
                        this.validator.validateString(privateKey);
                        result = privateKey;
                    }catch(error){
                        throw new Error('Private Key is not a string');
                    }
                }catch(err){
                    this.logger.logError(SUBJECT,err.message,err);
                    result = false;
                }
                return resolve(result);
            }catch(e){
                return reject(e);
            }
        });
    };



    formatTransactionParams(_from,_to,_privkey,_value=0, _data='',_gasLimit=100000,_gasPrice='5'){
        this.validator.validateEthAddress(_from,'_From Address');
        this.validator.validateEthAddress(_to,'_To Address');
        this.validator.validateString(_privkey,'Private Key',true);
        return {
            from:_from,
            to:_to,
            privateKey:_privkey,
            gasLimit:_gasLimit,
            gasPrice:_gasPrice,
            data:_data,
            value:_value,
        }
    }
    makeTransaction(params)
    {
        return new Promise(async (resolve,reject)=>
        {
            try{
                let privKeyBuffer = new Buffer.from(params.privateKey,'hex');
                let nonce = await this.nonceService.getNextNonce(params.from);
                let txParams = {
                    nonce: nonce,
                    gasPrice: this.httpProvider.utils.numberToHex(this.httpProvider.utils.toWei(params.gasPrice, 'gwei')),
                    gasLimit: params.gasLimit,
                    to: params.to,
                    value: params.value,
                    data: params.data,
                };
                console.log(params)
                //this.debug(params)

                let tx = new EthereumTx(txParams);
                tx.sign(privKeyBuffer);
                let raw = '0x' + tx.serialize().toString('hex');
                let result = await this.sendTransactionWithHash(raw);
                return resolve(result);
            }catch(e){
                return reject(e);
            }
        });
    }
    sendTransactionWithHash(raw_tx){
        return new Promise(async (resolve,reject)=>{
            await this.httpProvider.eth.sendSignedTransaction(raw_tx).on('transactionHash', (hash)=>{
                return resolve(hash);
            }).on('error',(data)=>{
                return reject(data);
            });
        })
    }

}

module.exports = EthService;