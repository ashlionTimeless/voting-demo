'use strict';
var Model = require('./Model.js');
const schemaAttr = {
    txHash:String,
    closed: Boolean,
    status: String,
    topic:String,
    reportable: Boolean
};
const indexFields = {txHash:1};
const indexOptions ={unique:true};
const COLLECTION_NAME = 'SupervisedTransactions';

function SupervisedTransaction(){

};

SupervisedTransaction.prototype = new Model(COLLECTION_NAME,schemaAttr,indexFields,indexOptions);
module.exports = new SupervisedTransaction();