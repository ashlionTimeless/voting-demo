const SUBJECT = 'UserBalanceChangeMonitor';
const WeiConverter = require('../helpers/WeiConverter');

let MANYTOKENS = 100000000000000000000000000000000;

class UserBalanceMonitor{
    constructor(app){
        this.app = app;
        this.urlMap = app.urlMap;
        this.httpService = app.httpService;
        this.userAccountManager=app.userAccountManager;
        this.web3http=app.web3http;
        this.web3ws = app.web3ws;
        this.logger = app.logger;
        this.validator = app.validator;
        this.ethService = app.ethService;
        this.erc20Service = app.erc20Service;
        this.thresholder = app.thresholder;
        this.currencyManager = app.currencyManager;
    }
    run(){
        setInterval(async()=>{
            // get all active accounts of users
            let accounts = await this.userAccountManager.getAllActiveAccounts();
            for(let accountIndex in accounts){
                try{
                    let account = accounts[accountIndex];
                    let address = account.address;
                    //this.logger.debug('Checking '+address);
                    let tokenPrevBalance = 0;
                    let ethPrevBalance = 0;
                    let ethBalance = 0;
                    let tokenBalance = 0;
                    // get block number to use it as timetable for logging
                    this.logger.logWarning('-------------------------------------------------------------')
                    this.ethService.provider.eth.getBlock('latest',(err,data)=>{
                        this.logger.logWarning("Current block: "+data.number);
                    });
                    this.logger.logWarning('-------------------------------------------------------------')

                    try{
                        ethBalance=await this.ethService.getEthBalance(address);
                        this.logger.logWarning('Current Eth Balance: '+ethBalance);
                        tokenBalance = await this.erc20Service.getSingleBalance(address);
                        this.logger.logWarning('Current Token Balance: '+tokenBalance);
                        tokenPrevBalance = account.prevBalances[await this.currencyManager.getCurrencySymbol('e2c')];
                        this.logger.logWarning('Token PrevBalance: '+tokenPrevBalance);
                        ethPrevBalance = account.prevBalances[await this.currencyManager.getCurrencySymbol('eth')];
                        this.logger.logWarning('Eth PrevBalance: '+ethPrevBalance);
                    }catch (e) {
                        this.logger.logError(SUBJECT,e.message);
                        this.logger.logError(SUBJECT,'Skipping this account');
                        // skip this account if we cannot get its Ethereum Address
                        continue;
                    }

                    // if current ethereum ethBalance is higher than minimum amount of ether required to make a transaction
                    if(ethBalance >= this.thresholder.getEthMinThreshold()){
                        //fetch User's private key to be later used in transaction signing
                        let privateKey = await this.ethService.getPrivateKey(address);

                        // Now we are ready to handle Ethereum and TOken Balance changes
                        // We prioritize handling to token changes because if we handle ethereum first
                        // than it is possible that ethereum handling will eat all lubricant and tokens might get stuck

                        // if recorded token balance is higher than minimum amount of Tokens worth of transferring(for gas economy reasons)
                        // TODO: why prev balance and not current token balance?
                        // TODO: how token transfer handles if there is no lubricant?
                        if(tokenPrevBalance>this.thresholder.getE2CMinThreshold()){
                            // get current token balance
                            let amount = await this.erc20Service.getSingleBalance(address);
                            // Transferring tokens from user account every time it receives tokens is bothersome because it needs gas to actually send tokens
                            // The gas is sent from admin account, so we lose a lot of gas and effort for constant controlling of accounts' gas level and sending it from admin
                            // It is much better if the admin is able to withdraw tokens from user's account by itself
                            // This is why we actually use Approve+TransferFrom algorithm instead of Transfer

                            // get how much tokens is the admin allowed to withdraw from this address
                            var allowed = await this.erc20Service.allowanceTokens(address,this.erc20Service.admin.address);
                            // if allowed amount is higher than 0 to withdraw tokens
                            if(allowed > 0){
                                // admin will try to withdraw all existing tokens from user's account
                                // if admin is allowed to withdraw more than there are tokens in user's balance - than everything is fine
                                // but if such happens that the amount of allowed tokens is lower than user's balance...
                                // ... than the admin will attempt to withdraw more than it is allowed and thus tx will revert
                                // we should not allow that, so we check if allowed amount is actually less than amount to be transferred
                                if(+allowed < +amount){
                                    // and if it is - we should allow admin to withdraw more tokens
                                    // for this we first should zero out current allowance to prevent double withdrawal attack
                                    // https://ethereum.stackexchange.com/questions/28337/prevent-double-withdrawal-erc20-api-attack
                                    await this.renewAdminAllowance(address,privateKey)
                                }else{
                                    // if everything is fine and allowed amount is equal or more than amount to be withdrawn
                                    if(tokenPrevBalance>0){
                                        await this.withdrawTokensFromUserToAdmin(address,amount)
                                    }
                                }
                            }else{
                                // if the admin is NOT allowed to withdraw any tokens from user
                                // there can be 3 cases why it is not allowed:
                                // 1.because it was never allowed
                                // 2.because it was already allowed BUT transaction with allowance was not yet confirmed
                                // 3.previous allowance was zeroed out already

                                // First scenario: we check if it was allowed at all
                                let already_allowed = await account.toSend[await this.currencyManager.getCurrencySymbol('e2c_allowed')];
                                if(already_allowed==0){
                                    // if it was not - than approve it
                                    //this.logger.debug('ALLOWED ='+allowed+' && AMOUNT ='+already_allowed)
                                    await this.approveTokenWithdrawalFromUserToAdmin(address,privateKey)
                                }
                                // Second scenario: we do nothing
                                // TODO: what do we do if approval tx was errored? e2c_allowed is set to 1 in db but there will be no actual approved tokens!

                                // Third scenario:
                                // TODO: Handle 3 scenario because it works only if allowance is higher than 0
                            }
                        }else{
                            // Lubricant is some amount of ether that is reserved for gas payments for transactions
                            // get current amount of reserved lubricant from db
                            let currentLubricant = await this.userAccountManager.getAccountFeeMoney(address);
                            this.logger.logWarning('Current Lubricant: '+currentLubricant);

                            // if(currentLubricant <= 2*this.thresholder.getEthMinThreshold() && ethBalance>=this.thresholder.getEthMaxThreshold()){
                            //     this.userAccountManager.updateAccountFeeMoney(address,this.thresholder.getEthMaxThreshold());
                            // }

                            // if there are no tokens to be transferred - than we proceed with Ethereum balance changes
                            // first check if there is amount of ether worth of sending
                            if(ethBalance>2*this.thresholder.getEthMaxThreshold()){
                                // ... then check if there is minimum amount of lubricant to pay for gas
                                if(+currentLubricant >= +this.thresholder.getEthMinThreshold()){
                                    this.logger.debug("ETH BALANCE");
                                    this.logger.debug(ethBalance);
                                    this.logger.debug("PREV ETH BALANCE");

                                    // Now we get the the recorded ethereum balance of this address from the last tick of this loop
                                    // We need it to understand whether ethereum balance has changed at all,
                                    // and depending on how it changed - we proceed with certain behaviour
                                    let prevBal = await this.userAccountManager.getAccountAssetSent(address,await this.currencyManager.getCurrencySymbol('eth'));
                                    this.logger.debug(prevBal);
                                    this.logger.logWarning('TOTALLY CURRENT BALANCE IS : '+ await this.ethService.getEthBalance(address));

                                    // If current ethereum balance is higher than previous one...
                                    if(+ethBalance>+prevBal){
                                        // ... than it means that this address has received Ether since last tick
                                        this.logger.debug('ethBalance > prevBal');

                                        let _amount = ethBalance - currentLubricant;
                                        // First report to backend that the Ethereum balance has changed
                                        // TODO: Why dont we do the same for Token transfer
                                        // TODO: Why do we report first, than send the ether?
                                        try{
                                            await this.reportAboutEthBalanceChange(address,_amount);
                                        }catch (e) {
                                            this.logger.logError(SUBJECT,e.message);
                                        }
                                        // Send the ether minus lubricant to admin account
                                        let txHash = await this.ethService.transferEther(address,this.ethService.admin.address,_amount,privateKey,true);

                                        // Log it
                                        let data = {
                                            address:address,
                                            amount:WeiConverter.formatToDecimals(_amount),
                                            txHash:txHash
                                        };
                                        this.logger.logEvent(SUBJECT,'Ether Sent to Admin',data)
                                    }
                                }else if(currentLubricant == 0){
                                    let smallSpecialLubricant = 1000;
                                    console.log("-------------SEND--LUBRICANT(ETH)--TO-CLIENT---")
                                    let txHash = await this.ethService.transferEther(this.ethService.admin.address,address,this.thresholder.getEthMaxThreshold(),this.ethService.admin.key,true);
                                    this.logger.debug(txHash);
                                    this.validator.validateString(txHash);
                                    await this.userAccountManager.updateAccountFeeMoney(address,smallSpecialLubricant);
                                    currentLubricant = smallSpecialLubricant;
                                }else{
                                    console.log('currentLubricant >0 AND <MIN_THRESHOLD OR 1000 |||||| currentLubricant =========  ' + await this.userAccountManager.getAccountFeeMoney(address));
                                }
                            }
                            this.logger.debug('check ethBalance vs prevBalance')
                            let prevBalance = await this.userAccountManager.getAccountAssetSent(address,await this.currencyManager.getCurrencySymbol('eth'));
                            this.logger.logWarning('TOTALLY CURRENT PREVBALANCE IS: '+prevBalance);
                            this.logger.logWarning('AGAIN TOTALLY CURRENT BALANCE IS : '+ await this.ethService.getEthBalance(address))
                            if(ethBalance !== prevBalance && currentLubricant >= this.thresholder.getEthMinThreshold()){
                                this.logger.debug('Passed check ethBalance vs prevBal');
                                this.logger.debug(await this.userAccountManager.updateAccountAssetSent(address,await this.currencyManager.getCurrencySymbol('eth'),ethBalance));
                            }
                            this.logger.debug('finish');
                        }
                    }
                    // else{
                    //     // check if there was no lubricant sent yet
                    //
                    //     // if it wasnt - send lubricant
                    //     if(!lubricantWasSent()){
                    //
                    //     }
                    //     // else do nothing and wait
                    // }
                }catch(e){
                    this.logger.logError(SUBJECT,e);
                }
            }
        },15000);
    }

    handleE2CBalanceChange(address){

    }
    handleEthBalanceChange(address){

    }
    withdrawTokensFromUserToAdmin(address,amount){
        return new Promise(async(resolve,reject)=>{
            try{
                let txHash = await this.erc20Service.transferFromTokens(address,this.erc20Service.admin.address,amount,this.erc20Service.admin.key);
                let data = {
                    address:address,
                    amount:amount,
                    txHash:txHash
                };
                await this.userAccountManager.updateAccountAssetSent(address,await this.currencyManager.getCurrencySymbol('e2c'),0);
                this.logger.logWarning('AFTER TRANSFERFROM BALANCE IS : '+ await this.ethService.getEthBalance(address))
                let toUpdatePrevBalances = await this.ethService.getEthBalance(address) - await this.userAccountManager.getAccountFeeMoney(address);
                this.logger.logWarning('GOING TO UPDATE PREV BALANCE TO: '+ toUpdatePrevBalances +'; is differnece between '+ await this.ethService.getEthBalance(address) +' and '+ await this.userAccountManager.getAccountFeeMoney(address))
                await this.userAccountManager.updateAccountAssetSent(address,await this.currencyManager.getCurrencySymbol('eth'),toUpdatePrevBalances);
                this.logger.logEvent(SUBJECT,'Tokens Sent to Admin',data);
                return resolve(true);
            }catch (e) {
                return reject(e)
            }
        })
    }
    renewAdminAllowance(address,privateKey){
        return new Promise(async(resolve,reject)=>{
            try{
                let txHash = await this.erc20Service.approveTokenTransfer(address,this.erc20Service.admin.address,0,privateKey);
                let data = {
                    address:address,
                    amount:0,
                    txHash:txHash
                };
                await this.userAccountManager.updateAccountAssetSent(address,await this.currencyManager.getCurrencySymbol('e2c_allowed'),0);
                this.logger.logEvent(SUBJECT,'Allowance was insufficient to Sent to Admin. Setting it to '+data.amount+' to allow following increase',data)
                this.logger.logWarning('AFTER REAPPROVAL BALANCE IS : '+ await this.ethService.getEthBalance(address))
                return resolve(true);
            }catch (e) {
                return reject(e);
            }
        })
    }
    approveTokenWithdrawalFromUserToAdmin(address,privateKey){
        return new Promise(async(resolve,reject)=>{
            try{
                let txHash = await this.erc20Service.approveTokenTransfer(address,this.erc20Service.admin.address,MANYTOKENS,privateKey);
                let data = {
                    address:address,
                    amount:MANYTOKENS,
                    txHash:txHash
                };
                await this.userAccountManager.updateAccountAssetSent(address,await this.currencyManager.getCurrencySymbol('e2c_allowed'),1);
                this.logger.logEvent(SUBJECT,'Increased Allowance of address '+data.address+' to amount of '+data.amount,data)
                this.logger.logWarning('AFTER APPROVAL BALANCE IS : '+ await this.ethService.getEthBalance(address));
                this.logger.logWarning('!!!!!!!!!!!!!!!!!!!!!!!!!1ADDING APPROVAL TRANSACtiON -------------');
                return resolve(true);
            }catch (e) {
                return reject(e)
            }
        })
    }
    reportAboutEthBalanceChange(address,_amount){
        return new Promise(async(resolve,reject)=>{
            try{
                let dateNow = Date.now();
                let url = this.urlMap.server+this.urlMap.client_received_ethereum_post_url;
                this.logger.debug("AMOUNT = BALANCE - PREV BALANCE " + _amount);
                _amount = WeiConverter.formatToDecimals(_amount);
                this.logger.debug("AMOUNT = formatToDecimals " + _amount);
                let dataEth = {from:address,amount:_amount,hash:dateNow,status:"RECEIVE"};
                this.logger.debug("-------------DATA--DEPOSIT ETHEREUM-------------------------- " + dataEth);
                try{
                    this.logger.debug("MAKE REPORT : DEPOSIT ETHEREUM " + await this.app.postEventData(url,dataEth));
                }catch (responseError) {
                    this.logger.logError(SUBJECT,responseError.message)
                }
                return resolve(true);
            }catch (e) {
                return reject(e);
            }
        })
    }
    

}

module.exports = UserBalanceMonitor;