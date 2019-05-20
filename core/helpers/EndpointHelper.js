const CurrencyMap={
    eth:"eth",
    e2c:'e2c'
};
const ActionMap={
    transfer_out:"transfer-out",
    transfer_in:"transfer-in",
    balance:"balance",
    get_all_events:"get-all-event",
    create_address:"create-address",
    create_admin_address:"create-admin-address"
};

class EndpointHelper{
    constructor(){
        this.currencyMap = CurrencyMap;
        this.actionMap = ActionMap;
    }
    transferEtherOut(){
        return this.composeEndpoint("eth","transfer_out")
    }
    transferEtherIn(){
        return this.composeEndpoint("eth","transfer_in")
    }
    getEtherBalance(){
        return this.composeEndpoint("eth","balance")
    }
    transferE2COut(){
        return this.composeEndpoint("e2c","transfer_out");
    }
    transferE2CIn(){
        return this.composeEndpoint("e2c","transfer_in")
    }
    getE2CBalance(){
        return this.composeEndpoint("e2c","balance")
    }
    getE2CEvents(){
        return this.composeEndpoint("e2c","get_all_events")
    }
    createEthAddress(){
        return this.composeEndpoint('eth','create_address');
    }
    createE2CAddress(){
        return this.composeEndpoint('e2c','create_address');
    }
    createEthAdminAddress(){
        return this.composeEndpoint('eth','create_admin_address');
    }
    createE2CAdminAddress(){
        return this.composeEndpoint('e2c','create_admin_address');
    }
    composeEndpoint(currency,action){
        return '/'+this.currencyMap[currency]+'/'+this.actionMap[action];
    }
}

module.exports = EndpointHelper;