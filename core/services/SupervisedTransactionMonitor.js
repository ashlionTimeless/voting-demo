const SUBJECT = 'SupervisedTransactionMonitor';
const EthAddressHelper = require('../helpers/EthAddressHelper');
const TxStatusHelper = require('../helpers/TxStatusHelper');
class SupervisedTransactionMonitor{
    constructor(app){
        this.supervisedTransactionManager=app.supervisedTransactionManager;
        this.ethService = app.ethService;
        this.logger = app.logger;
        this.validator = app.validator;
        this.userAccountManager = app.userAccountManager;
        this.thresholder = app.thresholder;
        this.httpService = app.httpService;
        this.urlMap = app.urlMap;
    }
    scanSupervisedTransactions(){
        return new Promise(async(resolve,reject)=>{
            try{
                let supervisedTransactions = await this.supervisedTransactionManager.getAllPendingTransactions();
                for(let key in supervisedTransactions){
                    try {
                        let supervisedTx = supervisedTransactions[key];
                        let supervisedTxHash = supervisedTx.txHash;
                        let topic = supervisedTx.topic;
                        this.logger.logNotice('Checking ' + supervisedTxHash);
                        let txInNetwork = false;
                        try{
                            txInNetwork = await this.getTransactionData(supervisedTxHash);
                            this.logger.debug(txInNetwork)
                        }catch (e) {
                            this.logger.logError(SUBJECT,' Tx is not in network',e);
                            continue;
                        }
                        if (txInNetwork){
                            try{
                                await this.handleSupervisedTransaction(txInNetwork);
                            }catch (handlingError) {
                                console.log(handlingError);
                            }
                            try{
                                if(supervisedTx.reportable){
                                    this.logger.debug("THIS FINAL REPORT ------------------ " + await this.reportTxStatus(topic, data));
                                }
                            }catch(reportError){
                                this.logger.logError(SUBJECT,reportError.message);
                            }
                        }
                    }catch(e){
                        this.logger.logError(SUBJECT,e.message);
                    }
                }
                return resolve(true);
            }catch (e) {
                return reject(e);
            }
        })
    }

    getTransactionData(txHash){
        return new Promise(async(resolve,reject)=>{
            try{
                let txInNetwork = await this.ethService.provider.eth.getTransactionReceipt(txHash);
                if(txInNetwork){
                    let tx = await this.ethService.provider.eth.getTransaction(txHash);
                    let txData = {
                        hash:txHash,
                        status:txInNetwork.status,
                        from:txInNetwork.from,
                        value: tx.value,
                        to:tx.to,
                        gasUsed: txInNetwork.gasUsed,
                        gasPrice:tx.gasPrice,
                    };
                    return resolve(txData);
                }
                throw new Error(' Tx is not in network');
            }catch (e) {
                return reject(e);
            }
        })
    }
    handleSupervisedTransaction(txData){
        return new Promise(async(resolve,reject)=>{
            try{
                let txStatus = txData.status;
                let data = {};
                this.logger.logNotice('--------------TX STATUS-----------');
                this.logger.logNotice(txStatus);
                if(txStatus===true){
                    data = {
                        hash: txData.hash,
                        status: 'SEND'
                    };
                    await this.supervisedTransactionManager.changeSupervisedTransactionStatus(txData.hash,txStatus);


                    try{
                        this.logger.logNotice('----------TRY TO GET TX SENDER--------------');
                        let sender = txData.from;
                        let txValue = txData.value;
                        let receiver = txData.to;
                        let gasUsed = txData.gasUsed;
                        let gasPrice = txData.gasPrice;

                        let senderAccount = await this.userAccountManager.getAccount(sender);
                        if(senderAccount){
                            //     console.error('SENDER ACCOUNT WAS NOT FOUND')
                            //     // this.logger.logNotice(await this.userAccountManager.getAllActiveAccounts());
                            //     let receiverAccount = await this.userAccountManager.getAccount(receiver);
                            //     if(receiverAccount && EthAddressHelper.compareEthAddresses(sender,this.ethService.admin.address) &&  txValue == this.thresholder.getE2CMaxThreshold()){
                            //         console.log("------------!!!!!!!!!!!!!updateAccountFeeMoney!!!!!!!!!!!!--------------");
                            //         await this.userAccountManager.updateAccountFeeMoney(tx.to,this.thresholder.getE2CMaxThreshold());
                            //         console.log("------------!!!!!!!!!!!!!updateAccountFeeMoney!!        DONE!!!--------------");
                            //     }
                            // }else{
                            this.logger.logNotice('sender is here')
                            let txFee =  gasUsed * gasPrice;
                            // this.logger.logNotice("txFee: "+txFee)
                            let newLubricant = await this.userAccountManager.getAccountFeeMoney(sender) - txFee;
                            await this.userAccountManager.updateAccountFeeMoney(sender,newLubricant);
                        }
                    }catch(e){
                        console.error(e)
                        this.logger.logError(SUBJECT,e.message);
                    }
                }else{
                    if(txStatus == TxStatusHelper.STATUS_ERROR){
                        data = {
                            txHash: txData.hash,
                            status: 'ERROR'
                        };
                    }else{
                        data = {
                            txHash: txData.hash,
                            status: txStatus
                        };
                    }
                }
                try{
                    this.logger.logEvent(SUBJECT,'Transaction was confirmed or errored', data);
                }catch (e) {
                    this.logger.logError(SUBJECT,e.message,e);
                }
            }catch (e) {
                return reject(e);
            }
        });
    }

    reportTxStatus(topic, data){
        return new Promise(async(resolve,reject)=>{
            try{
                let url = this.urlMap.server+'/'+topic+'/'+this.urlMap.admin_sent_ethereum_post_url;
                let result = await this.httpService.postRequest(url,data);
                return resolve(result);
            }catch (e) {
                this.logger.logError(SUBJECT,e.message);
                return reject(e);
            }
        })
    }
}

module.exports = SupervisedTransactionMonitor;