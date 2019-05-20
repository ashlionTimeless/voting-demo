const bitcoinjs = require("./bitcoinjs-3.3.2");
const bchaddr = require("./bchaddrjs-0.2.1");
const ethUtil = require("./ethereumjs-util");
const Mnemonic = require("./jsbip39");

var mnemonic = new Mnemonic();
var bip32RootKey = null;
var bip32ExtendedKey = null;

class MnemonicToWallets {
    constructor(wallet,network, addressCount=1) {
        this.wallet=wallet;
        this.networks=wallet.networks;
        this.networkIndex = network;
        this.initialAddressCount = addressCount;
    }
    converterMnemonicToAddress(phrase) {
        return new Promise(async(resolve, reject)=>{
            let address = this.phraseChangedForAddress(phrase);
            return resolve(address)
        });
    }
    converterMnemonicToPrivkey(phrase) {
        return new Promise(async(resolve, reject)=>{
            let privkey = this.phraseChangedForPrivkey(phrase);
            return resolve(privkey)
        });        
    }
    networkChanged(network) {
        var networkIndex = this.networkIndex;
        var network = this.networks[networkIndex];
        network.onSelect();
    }
    phraseChangedForAddress(phrase) {
        this.networkChanged()
        var phrase = phrase;
        var passphrase;
        let seed = mnemonic.toSeed(phrase, passphrase);
        bip32RootKey = bitcoinjs.bitcoin.HDNode.fromSeedHex(seed, network);        
        this.calcForDerivationPath();
        var initialAddressCount = this.initialAddressCount;
        let address = this.displayAddresses(0, initialAddressCount, this.networkIndex);
        return address
    }
    phraseChangedForPrivkey(phrase) {
        this.networkChanged()
        var phrase = phrase;
        var passphrase;
        let seed = mnemonic.toSeed(phrase, passphrase);
        bip32RootKey = bitcoinjs.bitcoin.HDNode.fromSeedHex(seed, network);        
        this.calcForDerivationPath();
        var derivationPath = this.getDerivationPath();
        bip32ExtendedKey = this.calcBip32ExtendedKey(derivationPath);        
        var initialAddressCount = this.initialAddressCount;
        let privkey = this.displayPrivkey(0, initialAddressCount, this.networkIndex);
        return privkey
    }
    calcForDerivationPath() {
        var derivationPath = this.getDerivationPath();
        bip32ExtendedKey = this.calcBip32ExtendedKey(derivationPath);
    }
    // сложная функция по формированию HD extendedKey с нужным Derivation Path
    calcBip32ExtendedKey(path) {
        var extendedKey = bip32RootKey;
        var pathBits = path.split("/");
        for (var i=0; i<pathBits.length; i++) {
            var bit = pathBits[i];
            var index = parseInt(bit);
            if (isNaN(index)) {
                continue;
            }
            var hardened = bit[bit.length-1] == "'";
            var isPriv = !(extendedKey.isNeutered());
            var invalidDerivationPath = hardened && !isPriv;
            if (invalidDerivationPath) {
                extendedKey = null;
            }
            else if (hardened) {
                extendedKey = extendedKey.deriveHardened(index);
            }
            else {
                extendedKey = extendedKey.derive(index);
            }
        }
        return extendedKey
    }
    getDerivationPath() {
        if (this.networkIndex == "BCH") {
            var derivationPath = "m/44'/145'/0'/0";
            return derivationPath;
        }            
        if (this.networkIndex == "BTC") {
            var derivationPath = "m/44'/0'/0'/0";
            return derivationPath;
        }   
        if (this.networkIndex == "DASH") {
            var derivationPath = "m/44'/5'/0'/0";
            return derivationPath;
        }  
        if (this.networkIndex == "ETC") {
            var derivationPath = "m/44'/61'/0'/0";
            return derivationPath;
        }  
        if (this.networkIndex == "ETH") {
            var derivationPath = "m/44'/60'/0'/0";
            return derivationPath;
        }  
        if (this.networkIndex == "LTC") {
            var derivationPath = "m/44'/2'/0'/0";
            return derivationPath;
        }                  
    }
    displayAddresses(start, total, networkIndex) {
        for (var i=0; i<total; i++) {
            var index = i + start;
            var isLast = i == total - 1;
            let address = this.calculateAddress(index, isLast, networkIndex);
            return address
        }
    }
    displayPrivkey(start, total, networkIndex) {
        for (var i=0; i<total; i++) {
            var index = i + start;
            var isLast = i == total - 1;
            let privkey = this.calculatePrivKey(index, isLast, networkIndex);
            return privkey
        }
    }   
    calculateAddress(index, isLast, networkIndex) {
        let key = bip32ExtendedKey.derive(index);
        var keyPair = key.keyPair;
        var address = keyPair.getAddress().toString();
        if (networkIndex == "BTC" || networkIndex == "DASH" || networkIndex == "LTC") {
            return address
        }
        if (networkIndex == "BCH"){
            address = bchaddr.toCashAddress(address);
            return address
        }
        if (networkIndex == "ETC" || networkIndex == "ETH") {
            var privKeyBuffer = keyPair.d.toBuffer(32);
            var addressBuffer = ethUtil.privateToAddress(privKeyBuffer);
            var hexAddress = addressBuffer.toString('hex');
            var checksumAddress = ethUtil.toChecksumAddress(hexAddress);
            address = ethUtil.addHexPrefix(checksumAddress);
            return address
        }
    }
    calculatePrivKey(index, isLast, networkIndex) {
        let key = bip32ExtendedKey.derive(index);
        var keyPair = key.keyPair;
        let privkey = keyPair.toWIF();
        if (networkIndex == "BTC" || networkIndex == "DASH" || networkIndex == "LTC") {
            return privkey
        }
        if (networkIndex == "BCH"){
            return privkey
        }
        if (networkIndex == "ETC" || networkIndex == "ETH") {
            var privKeyBuffer = keyPair.d.toBuffer(32);
            privkey = privKeyBuffer.toString('hex');
            //privkey = ethUtil.addHexPrefix(privkey);
            return privkey;
        }
    }

}

module.exports = MnemonicToWallets;

