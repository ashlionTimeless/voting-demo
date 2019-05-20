'use strict'
//var FileSystem = require("fs");
//var FileSystem;

var FileSystem = typeof window === 'object'
    ? null
    : eval('require("fs")');

const Crypto = require("crypto");

class Safe {
    constructor(phrase, password) {
        this.piu = phrase;
        this.password = password;
     }

    encrypt(data, pass) {
        try {
            var cipher = Crypto.createCipher('aes-256-cbc', pass);
            var encrypted = Buffer.concat([cipher.update(new Buffer(JSON.stringify(data), "utf8")), cipher.final()]);
            FileSystem.writeFileSync(this.piu, encrypted);
            return { message: "Encrypted!" };
        } catch (exception) {
            throw new Error(exception.message);
        }
    }
    
    decrypt() {
        try {
            var data = FileSystem.readFileSync(this.piu);
            var decipher = Crypto.createDecipher("aes-256-cbc", this.password);
            var decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
            return JSON.parse(decrypted.toString());
        } catch (exception) {
            throw new Error(exception.message);
        }
    }
    
    encryptAsync(data) {
        return new Promise((resolve, reject) => {
            try {
                var cipher = Crypto.createCipher('aes-256-cbc', this.password);
                var encrypted = Buffer.concat([cipher.update(new Buffer(JSON.stringify(data), "utf8")), cipher.final()]);
            } catch (exception) {
                reject({ message: exception.message });
            }
            FileSystem.writeFile(this.piu, encrypted, error => {
                if(error) {
                    reject(error)
                }
                resolve({ message: "Encrypted!" });
            });
        });
    }
    
    decryptAsync(pass) {
        return new Promise((resolve, reject) => {
            FileSystem.readFile(this.piu, (error, data) => {
                if(error) {
                    reject(error);
                }
                try {
                    var decipher = Crypto.createDecipher("aes-256-cbc", pass);
                    var decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
                    resolve(JSON.parse(decrypted.toString()));
                } catch (exception) {
                    reject({ message: exception.message });
                }
            });
        });
    }

}

module.exports = Safe;