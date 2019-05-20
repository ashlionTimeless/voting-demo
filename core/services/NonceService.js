'use strict';
const NONCE_SUBJECT ='NONCE_SUBJECT';
class NonceService{
    constructor(web3,validator,logger){
        this.web3  = web3;
        this.validator = validator;
        this.logger= logger;
    }

    getNextNonce(address)
    {
        return new Promise(async(resolve,reject)=>{
            try{
                let result = await this.getNonces(address);
                for(let i = Math.min(...result.nonces); i<=Math.max(...result.nonces);i++)
                {
                    if(!result.nonces.includes(i+1))
                    {
                        result.nextNonce=i;
                        break;
                    }
                }
                this.validator.validateNumber(result.nextNonce,'Next Nonce');

                return resolve(result.nextNonce);
            }catch(e){
                return reject(e);
            }
        });
    }

    getNonces(address)
    {
        return new Promise(async(resolve,reject)=> {
            try{
                this.validator.validateEthAddress(address);
                let result={nonces:[],nextNonce:undefined,tx:{pending:{},queued:{}}};
                let accountNonce = await this.getAccountNonce(address);
                result.nonces.push(accountNonce);
                let pendingAccountNonce = await this.getPendingAccountNonce(address,result);
                result.nonces.push(pendingAccountNonce);
                try{
                    let txAccountNonces = await this.getTxNonces(address,result);
                    for(let txNonce in txAccountNonces){
                        result.nonces.push(txNonce);
                    }
                }catch(err){
                    this.logger.logError(NONCE_SUBJECT,err.message,err);
                }
                this.validator.validateObject(result,'Nonce Array');
                return resolve(result);
            }catch(e){
                return reject(e);
            }
        })
    }

    getAccountNonce(address)
    {
        return new Promise(async (resolve, reject)=>{
            try{
                let nonce = parseInt(await this.web3.eth.getTransactionCount(address));
                this.validator.validateNumber(nonce,'Account Nonce');
                return resolve(nonce);
            }catch(e){
                return reject(e);
            }
        });
    }

    getPendingAccountNonce(address,result){
        return new Promise(async(resolve, reject)=>{
            try{
                let nonce = parseInt(await this.web3.eth.getTransactionCount(address,'pending'));
                this.validator.validateNumber(nonce,'Pending Account Nonce');
                return resolve(nonce);
            }catch(e){
                return reject(e);
            }
        });
    }

    getTxNonces(address,result)
    {
        return new Promise(async (resolve,reject)=>{
            try{
                try{
                    let txpool = await this.web3.eth.txpool.content();
                }catch(err){
                    console.log('Could not connect to txpool')
                    return resolve(false);
                }
                let tx = {};
                let nonces = [];
                if(txpool.pending[address])
                {
                    tx.pending=txpool.pending[address];
                    for(let pending_nonce in tx.pending[address])
                    {
                        nonces.push(parseInt(pending_nonce));
                    }
                }
                if(txpool.queued[address])
                {
                    tx.queued=txpool.queued[address];
                    for(let queued_nonce in tx.queued[address])
                    {
                        nonces.push(parseInt(queued_nonce));
                    }
                }
                this.validator.validateObject(nonces,'Txpool Nonce Array');
                return resolve(nonces);
            }catch(e){
                return reject(e);
            }
        });
    }
}

module.exports = NonceService;