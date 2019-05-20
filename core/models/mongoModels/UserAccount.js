'use strict';
var Model = require('./Model.js');
let ethAssetMap = {
    sent: 0,
    feeMoney: 0,
    awaitingFeeMoney: false
};
let e2cAssetMap = {
    sent: 0,
    awaitingApproval: false,
    awaitingApprovalNullification:false,
    feeMoney: 0,
    awaitingFeeMoney: false
};

const schemaAttr = {
    address:String,
    assets:Object,
    active: Boolean
};
const AssetsMap = {
    'eth':ethAssetMap,
    'e2c':e2cAssetMap
};

const indexFields = {address:1};
const indexOptions ={unique:true};
const COLLECTION_NAME = 'UserAccounts';

function UserAccount(){
};

let methods = {
    getAssets:function(){
      return this.assets;
    },
    updateAssets:function(newAssets){
        this.assets = newAssets;
    },
    getAssetData: function(symbol){
        return this.getAssets()[symbol];
    },
    updateAssetData:function(symbol,newAssetData){
        let assets = this.getAssets();
        assets[symbol] = newAssetData;
        this.updateAssets(assets);
    },
    getAssetAttribute:function(symbol,attribute){
        return this.getAssetData(symbol)[attribute];
    },
    updateAssetAttribute:function(symbol,attribute,newValue){
        let assetData = this.getAssetData(symbol);
        assetData[attribute]=newValue;
        this.updateAssetData(symbol,assetData)
    },
    getAssetSent:function(symbol){
        return this.getAssetAttribute(symbol,'sent')
    },
    getAssetsMaps:function(){
        return AssetsMap;
    },
    getAssetMap:function(symbol){
        return this.getAssetsMaps()[symbol];
    },
    getAssetFeeMoney:function(symbol){
        return this.getAssetAttribute(symbol,'feeMoney');
    },
    isAwaitingAssetFeeMoney:function(symbol){
        return this.getAssetAttribute(symbol,'awaitingFeeMoney');
    }
};


UserAccount.prototype = new Model(COLLECTION_NAME,schemaAttr,indexFields,indexOptions,methods);
module.exports = new UserAccount();
