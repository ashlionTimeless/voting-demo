class FileService{
	constructor(){

	}
	read(){

	}
	readUploadedFile(file){
		return new Promise(async(resolve,reject)=>{
            var reader = new FileReader();
            reader.onload = async(e)=>{
                var content = reader.result;
                return resolve(content);
            }
            reader.onerror = (e) => {
            	return reject(e);
            }
            reader.readAsText(file);  
		})
	}
	composeFileUri(ciphertext){
		return "data:text/plain;charset=utf-8," + encodeURIComponent(ciphertext);
	}
	download(){

	}
}
module.exports = FileService;