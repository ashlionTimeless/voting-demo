var Error_401 = function(data=''){
    this.code = 401;
    this.message = "Not authorized";
    this.data = data;
};
module.exports = Error_401