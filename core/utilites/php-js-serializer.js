const php = require('js-php-serialize');
const unserialize = require('locutus/php/var/unserialize');
var serializer = function()
{
    return {
        serialize:function(object){
            return php.serialize(object)
        },
        deserialize:function(str){
            return unserialize(str);
        }
    }
};

module.exports = serializer();
