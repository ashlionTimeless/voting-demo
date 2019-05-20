import _ from "lodash";
console.log("Server is Started");

const ClientApplication = require('./ClientApplication');
let application = new ClientApplication();
application.init();

window.application = application;
