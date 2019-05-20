'use strict';
var Model = require('./Model.js');
const schemaSC = {
    smartContractAddress:String,
    ticker:String,
    active:Boolean,
    abi:Object,
};

const indexFields = {smartContractAddress:1};
const indexOptions ={unique:true};
const COLLECTION_NAME = 'SmartContract';

function SmartContract(){

};

SmartContract.prototype = new Model(COLLECTION_NAME,schemaSC,indexFields,indexOptions);
module.exports = new SmartContract();