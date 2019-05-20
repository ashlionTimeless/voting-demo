const webpack = require('webpack');
const path = require('path');

const config = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
    
  },
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 9000
  },
  watchOptions: {
      aggregateTimeout: 100
  }
}

module.exports = config;


// const serverConfig = {
//   target: 'node',
//   output: {
//     path: path.resolve(__dirname, 'dist'),
//     filename: 'lib.node.js'
//   }
//   //…
// };

// const clientConfig = {
//   target: 'web', // <=== can be omitted as default is 'web'
//   output: {
//     path: path.resolve(__dirname, 'dist'),
//     filename: 'lib.js'
//   }
//   //…
// };

// module.exports = [ serverConfig, clientConfig ];


//const FileSystem = require("fs");
//console.log(FileSystem)
// const Crypto = require("crypto");

// var password = "my-password";
//  var cipher = Crypto.createCipher('aes-256-cbc', password);
//  var encrypted = Buffer.concat([cipher.update(new Buffer(JSON.stringify("data"), "utf8")), cipher.final()]);
// FileSystem.writeFileSync("wallet.dat", encrypted);