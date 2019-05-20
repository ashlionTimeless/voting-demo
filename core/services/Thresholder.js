const MIN = 'min';
const MAX = 'max';

let thresholds = {
    'e2c':{
        'min':0,
        'max':0
    },
    'eth':{
        'min':500000000000000,
        'max':1000000000000000
    }
};
class Thresholder{
    constructor(){

    }
    getAssetThreshold(asset,type){
        return thresholds[asset][type]
    }
    getE2CMinThreshold(){
        return this.getAssetThreshold('e2c',MIN)
    }
    getE2CMaxThreshold(){
        return this.getAssetThreshold('e2c',MAX)
    }
    getEthMaxThreshold(){
        return this.getAssetThreshold('eth',MAX)
    }
    getEthMinThreshold(){
        return this.getAssetThreshold('eth',MIN)
    }
}

module.exports = Thresholder;