var Error_404 = function(data=''){
    this.code = 404;
    this.message = "Resource not found";
    this.data = data;
};
module.exports = Error_404;