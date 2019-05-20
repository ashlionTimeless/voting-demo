'use strict';
const ethereum_address = require('ethereum-address');
const _STRING = 'string';
const _NUMBER = 'number';
const _BOOLEAN = 'boolean';
const _URL = 'url';
const _JSON = 'json';
const _OBJECT = 'object';
var assert = require('assert');
class Validator{
    constructor(){
        return this;
    };
    validateInvoice(data)
    {
        this.validateChatId(data.chat_id);
        this.validateUserId(data.sender_id);
        this.validateAuthToken(data.auth_token);
        this.validateNumber(data.offer_id,"offer_id");
        this.validateString(data.serviceName,"serviceName");
        this.validateString(data.provider_payment_credentials,"provider_payment_credentials");
        this.validateString(data.deadline,"deadline");
        this.validateNumber(data.sum,"sum");
        this.validateNumber(data.datetime,"datetime");
        this.validateNumber(data.currency,"currency");
        this.validateNumber(data.paymentMethod,"Payment Method");
    };
    validateInvoicePayment(data)
    {
        this.validateString(data.type,"type");
        this.validateChatId(data.chat_id);
        this.validateUserId(data.sender_id);
        this.validateAuthToken(data.auth_token);
        this.validateNumber(data.offer_id,"offer_id");
        this.validateNumber(data.sum,"sum");
        this.validateString(data.additional_info,"additional_info");
        this.validateString(data.client_payment_credentials,"client_payment_credentials");
        this.validateNumber(data.datetime,"datetime");
    };
    validateServiceAcceptanceInit(data)
    {
        this.validateChatId(data.chat_id);
        this.validateUserId(data.sender_id);
        this.validateAuthToken(data.auth_token);
        this.validateNumber(data.offer_id,"offer_id");
        this.validateNumber(data.datetime,"datetime");
    };
    validateServiceAcceptanceResult(data)
    {
        this.validateChatId(data.chat_id);
        this.validateUserId(data.sender_id);
        this.validateAuthToken(data.auth_token);
        this.validateNumber(data.offer_id,"offer_id");
        this.validateNumber(data.result,"User Choice");
        this.validateNumber(data.datetime,"datetime");
    };
    validateEthAddress(address,name){

        if(name==undefined){
            name = 'Ethereum Address';
        }
        if(!ethereum_address.isAddress(address)){
            throw new Error('Invalid Ethereum Address');
        }
    };
    validateFile(event){
        if(event.file.size>process.env.maxFileSize){
            throw new Error('File is too big. Try compressing it below 5MB.');
        }
        var forbiddenFileExt = [
            '.exe','.html','.css','.js','.xml','.php',
            '.py','.jar','.sh','.bat','.svg',
            '.htaccess'];

        var forbiddenFileNames=['web.config','robots.txt','crossdomain.xml',
            ' clientaccesspolicy.xml'];
        for(var ii=0; i<forbiddenFileNames.length;i++){
            var itmp = forbiddenFileNames[ii];
            if(event.file.name.indexOf(itmp)!==-1){
                throw new Error('Blacklisted File Name');
            }
        }
        var file_ext = event.file.name.split('.').pop();
        for(var i=0; i<forbiddenFileExt.length;i++){
            var tmp = forbiddenFileExt[i];
            if(file_ext.indexOf(tmp)!==-1){
                throw new Error('Blacklisted File Extension');
            }
        }
        return true;
    };
    validateChatId(chat_id){
        try{
            this.validateString(chat_id,'Chat Id')
        }catch(e){
            this.validateNumber(chat_id,'Chat Id');
        }
    };
    validateUserId(user_id){
        try{
            this.validateString(user_id,'User Id')
        }catch(e){
            this.validateNumber(user_id,'User Id');
        }
    };
    validateAuthToken(auth_token){
        this.validateString(auth_token,'Auth Token',true);
    };
    validateMSAData(msadata){
        if(msadata['code'] && msadata['token']){
            this.validateString(msadata['code'],'MS Code',true);
            this.validateString(msadata['token'],'MS Token',true);
            return true;
        }
        throw new Error('Invalid MSAuth Data');
    };
    validateString(value,name,silent){
        return this.validate(value,_STRING,name,silent);
    };
    validateNumber(value,name,silent){
        return this.validate(value,_NUMBER,name,silent);
    };
    validateBoolean(value,name,silent){
        return this.validate(value,_BOOLEAN,name,silent);
    };
    validateObject(value,name,silent){
        return this.validate(value,_OBJECT,name,silent);
    };
    validateUrl(value,name,silent){
        return this.validate(value,_URL,name,silent);
    };
    validateJson(value,name,silent){
        return this.validate(value,_JSON,name,silent);
    };
    validate(value, type,field,silent)
    {
        if(silent===undefined){
            silent = false;
        }
        if(value === undefined){
            throw new Error(field+' is '+undefined);
        }
        var msg='';
        if(!field){
            field = 'Some '+ type;
        }


        // if(value.length<100){
        //     var log_message = 'validating '+field+' of type '+type;
        //     if(typeof value !== _OBJECT && !silent){
        //         log_message+=' and value '+value;
        //     }
        //     console.log(log_message);
        // }else{
        //  if(typeof value===_STRING && !silent){
        //         console.log('validating '+field+' of type '+type+' and value '+value.substr(0,100)+'...');
        //  }else{
        //         console.log('validating '+field+' of type '+type);
        //     }
        //  }
        try{
            switch (type) {
                case _JSON:
                    if(innerValidateJSON(value)){
                        return true;
                    }else{
                        throw typeErrorMessage(value,type,field);
                    }
                    break;
                case _OBJECT:
                    if(innerValidateObject(value)){
                        return true;
                    }else{
                        throw typeErrorMessage(value,type,field);
                    }
                    break;
                case _URL:
                    if(innerValidateUrl(value)){
                        return true;
                    }else{
                        throw typeErrorMessage(value,type,field);
                    }
                    break;
                case _BOOLEAN:
                    if(innerValidateBoolean(value)){
                        return true;
                    }else{
                        throw typeErrorMessage(value,type,field);
                    }
                    break;
                case _NUMBER:

                    if(innerValidateNumber(value)){
                        return true;
                    }else{
                        throw typeErrorMessage(value,type,field);
                    }
                    break;
                case _STRING:
                    if(innerValidateString(value)){
                        return true;
                    }else{
                        throw typeErrorMessage(value,type,field);
                    }
                    break;
                default:
                    throw new Error('Unknown datatype "'+type+'"');
                // if(!validateString(value)){
                //     validationError(msg);
                // }
            }
        }catch(e){
            if(typeof e === _STRING){
//                var error = {};          
                var error = new Error();
                error.message = e;
                error.data = {type:type,name:field};
                if(!silent){
                    error.data.value = value;
                }
                throw error;
            }
            throw e;
        }

        function innerValidateString(value){

            return typeof value === _STRING;
        }
        function innerValidateNumber(value){
            if(isNaN(value)){
                throw new Error('Value is NaN');
            }
            if(parseInt(value)== new Number(value) || parseFloat(value)== new Number(value)){
                return true;
            }
            return false;
        }
        function innerValidateBoolean(value){
            return typeof value === _BOOLEAN;
        }
        function innerValidateObject(value){
            return typeof value === _OBJECT;
        }
        function innerValidateUrl(value){
            if(typeof value === _STRING){
                var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
                return regexp.test(value);
            }
        }
        function innerValidateJSON(value){
            innerValidateString(value);
            try{
                value = JSON.parse(value);
                return innerValidateObject(value);
            }catch (e) {
                return false;
            }
        }
        function typeErrorMessage(value,type,field){
            var text = '';
            if(field){
                text = field+" must be of type "+type+", "+typeof value+" given.";
            }else{
                text = 'Data type "'+type+'" was expected, '+typeof value+' received instead';
            }
            return new Error(text);
        }
        return true;
    };
};
module.exports=Validator;