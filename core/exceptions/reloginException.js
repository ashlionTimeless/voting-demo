const urlMap = require('../config/urlMap');
var error = new Error('ReAuth Required');
error.redirectUrl=urlMap.server+'?reauth=1';
module.exports= "<meta http-equiv=\"refresh\" content=\"0;url="+urlMap.server+'?reauth=1'+"\" />";
