const SUBJECT = 'UserBalanceChangeMonitor';
const WeiConverter = require('../helpers/WeiConverter');
const SupervisedTransactionMonitor = require('../../core/services/SupervisedTransactionMonitor');

let SYMBOL_E2C = 'e2c';
let SYMBOL_ETH = 'eth';

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
        this.supervisedTransactionMonitor = new SupervisedTransactionMonitor(app);
    }
    run(){
        setInterval(async()=>{
            let scanningComplete = false;
            try{
                // look through supervised transactions in case some were confirmed
                // this helps update current balances of users
                scanningComplete = await this.supervisedTransactionMonitor.scanSupervisedTransactions();
            }catch (scanningError) {
                this.logger.logError(SUBJECT,scanningError.message,scanningError);
            }
            if(scanningComplete){
                // get all active accounts of users
                let accounts = await this.userAccountManager.getAllActiveAccounts();
                for(let accountIndex in accounts){
                    try{
                        let account = accounts[accountIndex];
                        let address = account.address;
                        //this.logger.debug('Checking '+address);
                        let tokenSent = 0;
                        let ethSent = 0;
                        let ethBalance = 0;
                        let tokenBalance = 0;
                        let lubricant = 0;
                        let awaitLubricant = false;
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
                            tokenSent = account.getAssetSent(SYMBOL_E2C);
                            this.logger.logWarning('Token PrevBalance: '+tokenSent);
                            ethSent = account.getAssetSent(SYMBOL_ETH);
                            this.logger.logWarning('Eth PrevBalance: '+ethSent);

                            // Lubricant is some amount of ether that is reserved for gas payments for transactions
                            lubricant = account.getAssetFeeMoney(SYMBOL_ETH);
                            this.logger.logWarning('Eth Lubricant: '+lubricant);
                            // awaitLubricant is just a boolean with tells us
                            // whether we expect some feeMoney to get to this account
                            awaitLubricant = account.isAwaitingAssetFeeMoney(SYMBOL_ETH);
                            this.logger.logWarning('Eth Lubricant: '+lubricant);
                        }catch (e) {
                            this.logger.logError(SUBJECT,e.message);
                            this.logger.logError(SUBJECT,'Skipping this account');
                            // skip this account if we cannot get its Ethereum Address
                            continue;
                        }

                        if(tokenBalance>0 || ethBalance>0){
                            if(lubricant <= this.thresholder.getEthMinThreshold()){
                                console.log('Balances are not zero but there is no lubricant')
                                if(awaitLubricant===false){
                                    console.log('sending lubricant')
                                    await this.sendFeeMoney(address);
                                }else{
                                    if((ethBalance>=2*this.thresholder.getEthMaxThreshold()) || (ethBalance>=this.thresholder.getEthMaxThreshold() && awaitLubricant===true)){
                                        console.log('taking lubricant from existing balance')
                                        await this.userAccountManager.updateAccountFeeMoney(address,this.thresholder.getEthMaxThreshold());
                                        await this.userAccountManager.stopAwaitingFeeMoney(address);
                                        lubricant = await this.userAccountManager.getAccountFeeMoney(address);
                                    }
                                }
                            }
                        }

                        // if current feeMoney is higher than minimum amount of ether required to make a transaction
                        if(lubricant > this.thresholder.getEthMinThreshold()){
                            // Now we are ready to handle Ethereum and TOken Balance changes
                            // We prioritize handling to token changes because if we handle ethereum first
                            // than it is possible that ethereum handling will eat all lubricant and tokens might get stuck

                            // if recorded token balance is higher than minimum amount of Tokens worth of transferring(for gas economy reasons)
                            // TODO: why prev balance and not current token balance?
                            // TODO: how token transfer handles if there is no lubricant?

                            // check how much current balance differs from the amount being sent
                            let tokenDifference = tokenBalance - tokenSent;
                            // there can be 3 scenarios:
                            // 1. tokenDifference == 0 => balance and amount being sent are equal
                            // it means that tokens are still being transferred and we should do nothing ...
                            // ...and just go on working with Ethereum balance change
                            // 2. tokenDifference > 0 => current balance is greater than amount currently sent.
                            // It means that account has received tokens since last tick
                            // 3. tokenDifference < 0 => balance is lower than amount being sent
                            // it means that transaction with token transfer was successful

                            // check for Scenario 1.
                            if(tokenDifference!==0){
                                await this.handleE2CBalanceChange(account);
                            }else{
                                // Seems like current token balance equals the amount we are sending now,...
                                // ...so we should just wait for transaction with transfer to be confirmed

                                // Meanwhile, we should handle Ethereum balance change too
                                await this.handleEthBalanceChange(account);

                            }
                        }
                    }catch(e){
                        this.logger.logError(SUBJECT,e);
                    }
                }
            }
        },5000);
    }

    handleE2CBalanceChange(account){
        return new Promise(async(resolve,reject)=>{
            try{
                let address = account.address;
                let tokenBalance = await this.erc20Service.getSingleBalance(address);
                let tokenSent = account.getAssetSent(SYMBOL_E2C);
                let tokenDifference = tokenBalance - tokenSent;

                //fetch User's private key to be later used in transaction signing
                let privateKey = await this.ethService.getPrivateKey(address);

                // not Scenario 1, we should do something with tokens
                if(tokenDifference>0){
                    // Scenario 2, the address has received some tokens that need to be transferred to admin
                    // check if difference is not too miniscule to even bother transferring
                    if(tokenDifference>=this.thresholder.getE2CMinThreshold()){
                        // Transferring tokens from user account every time it receives tokens is bothersome because it needs gas to actually send tokens
                        // The gas is sent from admin account, so we lose a lot of gas and effort for constant controlling of accounts' gas level and sending it from admin
                        // It is much better if the admin is able to withdraw tokens from user's account by itself
                        // This is why we actually use Approve+TransferFrom algorithm instead of Transfer

                        // get how much tokens is the admin allowed to withdraw from this address
                        let amountAllowed = await this.erc20Service.allowanceTokens(address,this.erc20Service.admin.address);
                        let awaitingApproval = await account.getAssetAttribute(SYMBOL_E2C,'awaitingApproval');
                        let awaitingApprovalNullification = await account.getAssetAttribute(SYMBOL_E2C,'awaitingApprovalNullification');

                        // if allowed amount is higher than the amount that we are about to withdraw ...
                        if(amountAllowed > tokenDifference){
                            // admin will try to withdraw all existing tokens from user's account
                            if(awaitingApproval){
                                await this.userAccountManager.stopWaitingForApproval(address);
                            }
                            if(awaitingApprovalNullification){
                                await this.userAccountManager.startAwaitingApprovalNullification(address);
                            }
                            await this.withdrawTokensFromUserToAdmin(address,tokenDifference);
                        }else{
                            // ... but if admin is not allowed to withdraw more that we are trying to...
                            // that means that the amountAllowed is less or equal to tokenDifference
                            // if they are equal - this is still fine, but than we are 1 step from zeroing out our allowance
                            // if amountAllowed is less than tokenDifference...
                            // ... than the admin will attempt to withdraw more than it is allowed and thus tx will revert
                            // so now we have to make sure amountAllowed is greater than tokenDifference
                            // For that we should allow admin to withdraw tokens

                            // first we check whether we had not deliberately zeroed out the allowance before
                            // (This will be explained later)
                            if(amountAllowed==0 && awaitingApprovalNullification){
                                //means that nullification was successful
                                this.userAccountManager.startAwaitingApprovalNullification(address);
                            }

                            // So in order to (re)allow admin to withdraw tokens we first need:
                            // 1. To check whether admin is allowed to withdraw ANY tokens
                            // 2. If he is not allowed - to check whether or not we were the ones to disallow admin
                            // 3. To check if we have not already allowed admin to withdraw tokens,...
                            // ...because the transaction with approval command takes time to be confirmed
                            if(!awaitingApproval && !awaitingApprovalNullification){

                                // Now we explain why we need to bother with checking if current allowance is 0 or more
                                // Because in many smart contracts there is requirement...
                                // ...that user can be approved to transfer tokens from other user only if their current approval is zero
                                //  This is done to prevent double withdrawal attack
                                // https://ethereum.stackexchange.com/questions/28337/prevent-double-withdrawal-erc20-api-attack
                                // so in order to approve the admin to withdraw tokens OR reapprove if we have done it in the past -...
                                // we first need to make sure that current approval is zero

                                // Thus if allowance is not zero - we nullify it
                                if(amountAllowed !== 0){
                                    await this.nullifyAdminAllowance(address,privateKey);
                                }else{
                                    // if amountAllowed is zero - than it means that either our previous nullification was confirmed...
                                    // ...or we have never approved token transfer at all
                                    // It does not really matter to us because now we just approve token withdrawal nevertheless
                                    await this.approveTokenWithdrawalFromUserToAdmin(address,privateKey);
                                }
                            }
                        }
                    }
                }else{
                    // if current balance is lower than tokenPrevBalance
                    // it means that transaction with token transfer was successful
                    // and we should record that no more tokens are being transferred now
                    if(tokenDifference < 0 ){
                        await this.userAccountManager.updateAccountAssetSent(address,SYMBOL_E2C,0)
                    }
                }
                return resolve(true);
            }catch (e) {
                return reject(e);
            }
        })
    }
    handleEthBalanceChange(account){
        return new Promise(async(resolve,reject)=>{
            try{
                let address = account.address;
                let ethBalance=await this.ethService.getEthBalance(address);
                let ethSent = account.getAssetSent(SYMBOL_ETH);
                let lubricant = account.getAssetFeeMoney(SYMBOL_ETH);

                //fetch User's private key to be later used in transaction signing
                let privateKey = await this.ethService.getPrivateKey(address);

                // activeBalance is current ethBalance minus feeMoney,
                // so its basically the balance that we actually can work with
                let activeBalance = ethBalance - lubricant;
                let ethDifference = activeBalance - ethSent;

                // Again, there can be 3 scenarios:
                // 1. ethDifference == 0 => balance and amount being sent are equal
                // it means that ether is still being transferred and we should do nothing ...
                // 2. ethDifference > 0 => current balance is greater than amount currently sent.
                // It means that account has received ether since last tick
                // 3. ethDifference < 0 => balance is lower than amount being sent
                // it means that transaction with ether transfer was successful


                // first check if there is amount of ether worth of sending
                if(ethDifference >= this.thresholder.getEthMaxThreshold()){
                    // balance > amountSent
                    // TODO: gotta warn backend to limit deposit to be only higher than THRESHOLD
                    // account received new ether, should send
                    // we can do tx
                    // amount worth sending
                    await this.withdrawEtherFromUserToAdmin(address,activeBalance,privateKey);
                }else{
                    if(ethDifference<0){//balance<amountSent

                        // SOLVED if we unite 2 monitors and tx monitor fires first

                        // ether was successfully sent
                        // updateToSend
                        // report sending
                        await this.userAccountManager.updateAccountAssetSent(address,SYMBOL_ETH,0);
                        await this.reportAboutEthBalanceChange(address,ethSent);
                    }
                }
                this.logger.debug('finish');
                return resolve(true);
            }catch (e) {
                return reject(e);
            }
        })
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
                await this.userAccountManager.updateAccountAssetSent(address,SYMBOL_E2C,amount);
                this.logger.logWarning('AFTER TRANSFERFROM BALANCE IS : '+ await this.ethService.getEthBalance(address));
                // let toUpdatePrevBalances = await this.ethService.getEthBalance(address) - await this.userAccountManager.getAccountFeeMoney(address);
                // this.logger.logWarning('GOING TO UPDATE PREV BALANCE TO: '+ toUpdatePrevBalances +'; is difference between '+ await this.ethService.getEthBalance(address) +' and '+ await this.userAccountManager.getAccountFeeMoney(address))
                // await this.userAccountManager.updateAccountAssetSent(address,SYMBOL_ETH,toUpdatePrevBalances);
                this.logger.logEvent(SUBJECT,'Tokens Sent to Admin',data);
                try{
                    await this.reportAboutE2CBalanceChange(address,amount,txHash);
                }catch (reportError) {
                    this.logger.logError(SUBJECT,reportError);
                }

                return resolve(true);
            }catch (e) {
                return reject(e)
            }
        })
    }
    withdrawEtherFromUserToAdmin(address,amount,privateKey){
        return new Promise(async(resolve,reject)=>{
            try{
                let txHash = await this.ethService.transferEther(address,this.erc20Service.admin.address,amount,privateKey);
                let data = {
                    address:address,
                    amount:amount,
                    txHash:txHash
                };
                await this.userAccountManager.updateAccountAssetSent(address,SYMBOL_ETH,amount);
                this.logger.logEvent(SUBJECT,'Ether Sent to Admin',data);
                try{
                    await this.reportAboutEthBalanceChange(address,amount,txHash);
                }catch (reportError) {
                    this.logger.logError(SUBJECT,reportError);
                }
                return resolve(true);
            }catch (e) {
                return reject(e)
            }
        })
    }
    
    // renewAdminAllowance(address,privateKey){
    //     return new Promise(async(resolve,reject)=>{
    //         try{
    //             let txHash = await this.erc20Service.approveTokenTransfer(address,this.erc20Service.admin.address,0,privateKey);
    //             let data = {
    //                 address:address,
    //                 amount:0,
    //                 txHash:txHash
    //             };
    //             await this.userAccountManager.updateAccountAssetSent(address,SYMBOL_E2C,0);
    //            
    //             this.logger.logEvent(SUBJECT,'Allowance was insufficient to Sent to Admin. Setting it to '+data.amount+' to allow following increase',data)
    //             this.logger.logWarning('AFTER REAPPROVAL BALANCE IS : '+ await this.ethService.getEthBalance(address))
    //             return resolve(true);
    //         }catch (e) {
    //             return reject(e);
    //         }
    //     })
    // }
    nullifyAdminAllowance(address,privateKey){
        return new Promise(async(resolve,reject)=>{
            try{
                let txHash = await this.erc20Service.approveTokenTransfer(address,this.erc20Service.admin.address,0,privateKey);
                let data = {
                    address:address,
                    amount:0,
                    txHash:txHash
                };
                await this.userAccountManager.startAwaitingApprovalNullification(address);
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
                await this.userAccountManager.startWaitingForApproval(address);
                this.logger.logEvent(SUBJECT,'Increased Allowance of address '+data.address+' to amount of '+data.amount,data)
                this.logger.logWarning('AFTER APPROVAL BALANCE IS : '+ await this.ethService.getEthBalance(address));
                this.logger.logWarning('!!!!!!!!!!!!!!!!!!!!!!!!!1ADDING APPROVAL TRANSACtiON -------------');
                return resolve(true);
            }catch (e) {
                return reject(e)
            }
        })
    }
    reportAboutE2CBalanceChange(_to,_amount,_hash){
        return new Promise(async(resolve,reject)=>{
            try{
                let url = this.urlMap.server+this.urlMap.admin_received_event_post_url;
                _amount = WeiConverter.formatToDecimals(_amount);
                let data = {from:_to,amount:_amount,hash:_hash,status:"RECEIVE"};
                try{
                    await this.app.postEventData(url,data);
                    this.logger.logEvent(SUBJECT,'Reported E2C Token Transfer');
                }catch (responseError) {
                    this.logger.logError(SUBJECT,responseError.message)
                }
                return resolve(true);
            }catch (e) {
                return reject(e);
            }
        })
    }
    reportAboutEthBalanceChange(address,_amount,_hash){
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
                    this.logger.logEvent(SUBJECT,'Reported Ethereum Transfer');
                }catch (responseError) {
                    this.logger.logError(SUBJECT,responseError.message)
                }
                return resolve(true);
            }catch (e) {
                return reject(e);
            }
        })
    }
    sendFeeMoney(address){
        return new Promise(async(resolve,reject)=>{
            try{
                let txHash = await this.ethService.transferEther(
                    this.ethService.admin.address,
                    address,
                    this.thresholder.getEthMaxThreshold(),
                    this.ethService.admin.key,
                    false
                );
                let data = {
                    address:address,
                    amount:MANYTOKENS,
                    txHash:txHash
                };
                await this.userAccountManager.startAwaitingFeeMoney(address);
                this.logger.logEvent(SUBJECT,'Sent Fee Money to address '+data.address+' to amount of '+data.amount,data);
                return resolve(true);
            }catch (e) {
                return reject(e)
            }
        })
    }
}

module.exports = UserBalanceMonitor;