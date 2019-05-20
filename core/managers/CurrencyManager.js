const eth = {
    name:"ETH",
    symbol:"eth",
    data:""
};
const e2c = {
    name:"E2C",
    symbol:"e2c",
    data:""
};
const e2c_allowed = {
    name:"E2C_allowed",
    symbol:"e2c_allowed",
    data:""
};

class CurrencyManager{
    constructor(){

    }
    getCurrency(currency){
        return new Promise(async(resolve,reject)=>{
            try{
                let result = this.getAllCurrencies()[currency];
                if(result){
                    return resolve(result);
                }else{
                    return reject('No such currency found in CurrencyManager')
                }
            }catch (e) {
                return reject(e);
            }

        })
    }
    getCurrencySymbol(currency){
        return new Promise(async(resolve,reject)=>{
            try{
                let currencyData = await this.getCurrency(currency);
                return resolve(currencyData.symbol);
            }catch (e) {
                return reject(e);
            }
        })
    }
    getAllCurrencies(){
        return {
            eth:eth,e2c:e2c,e2c_allowed:e2c_allowed
        };
    }
}

module.exports = CurrencyManager;