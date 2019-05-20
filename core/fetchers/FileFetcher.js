class FileFetcher{
	fetch(filepath){
		return new Promise(async(resolve,reject)=>{
            var reader = new FileReader();
            reader.onload = async(e)=>{
                var content = reader.result;
                return resolve(content);
            }
            reader.onerror = (e) => {
            	return reject(e);
            }
            reader.readAsText(filepath);  
		})
	}
}

module.exports = FileFetcher;