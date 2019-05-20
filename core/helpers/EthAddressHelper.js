const Validator = require('../utilites/Validator');
class EthAddressHelper{
    static compareEthAddresses(address_1, address_2){
        let validator = new Validator();
        validator.validateEthAddress(address_1,'Address 1');
        validator.validateEthAddress(address_2, 'Address 2');
        if(address_1.toLowerCase()===address_2.toLowerCase()){
            return true
        }
        return false;
    }
}
module.exports = EthAddressHelper;