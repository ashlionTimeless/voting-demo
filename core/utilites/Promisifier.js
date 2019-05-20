// let promisifiedAsyncFunction = function(callback){
// 	return new Promise(async(resolve,reject)=>{
// 		try{
// 			let result = await callback();
// 			return resolve(result);
// 		}catch(e){
// 			return reject(e);
// 		}
// 	})
// }

// module.exports = promisifiedAsyncFunction;