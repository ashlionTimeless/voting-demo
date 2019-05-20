var randomNumber = require("random-number-csprng");
var arr = [];

class Randomizer {
	constructor(min=0, max=255) {
		this.min = min,
		this.max = max
	}

	randomizer() {
		return new Promise(async(resolve, reject)=>{
			for (let i = 0; i < 16; i++) {
    		    try{
    		        let number = await randomNumber(0, 255);
    		        arr.push(number)
    		    }catch(e) {
    		        return reject(e);
    		    }
    		}
    	});
	}	

	resultRandomizer() {
		return new Promise(async(resolve, reject)=>{
    		    try{
    		    	arr = [];
    		    	this.randomizer()
    		        setTimeout(function() {
					let newArr = arr;
					return resolve(newArr);
					}, 250);
    		    }catch(e) {
    		        return reject(e);
    		    }
    	});
	}
}

module.exports = Randomizer;
