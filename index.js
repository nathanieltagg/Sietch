'use strict';

// All code uses two important globals: 'global.config' and 'global.db' 
// I know that's not best practice, but it is by far the most elegant solution.

// Set up configuruation.
// Be default, we use the files config/defaults.js and config/config.js
// However, if we're deploying in the cloud, we might want a special config file
// All options to sietch should be given via this config file!
 
require('app-module-path').addPath(__dirname); // Set this as the base for all 'require' lines in future.

var load_config = require("lib/configuration.js"); // exports the global 'config' variable.

//Check for override.
var argv = require('yargs')(process.argv.slice(2))
            .usage("Usage: $0 --config [path to config file] --loglevel [debug/http/info/warn/error]")
            .argv;

if(config in argv) {
    load_config(argv.config)
}

console.log("{msg: configured}");


const database = require('lib/database.js'); // Exports global 'db' variable
var App = require("lib/app.js"); 
var http = require('http'); // to run the server
// var https = require('https');

global.BaseDir = __dirname;

// logging.
var pino = require("pino");
var pino_opts = {
    customLevels: {
        http: 29
    },
};

if(process.env.NODE_ENV=='production') { 
    pino_opts.base = {level:'http', deployment: config.deployment, hostname:require('os').hostname()}
} else {
    // never use this when running under pm2
    // pino_opts.prettyPrint = {
    //     // messageFormat: "{levelLabel} {request.url} {msg}"
    //     ignore:'pid,hostname',
    //     translateTime: "SYS:HH:mm:ss",
    //     level: 'info'
    // }
}

// override with config or command line.
if(global.config.pino_opts) pino_opts = require('deepmerge')(pino_opts,global.config.pino_opts);
if(argv.loglevel) pino_opts.level = argv.loglevel;

global.logger = require("pino")(pino_opts);

logger.info("Starting up in mode: "+((process.env.NODE_ENV)||'development') + " deployment: "+config.deployment)


database.attach_to_database()
  .then(async function run(){
    var app = await App.create_app();

    var httpServer = http.createServer(app);


    function closeGracefully() {
      // see https://www.oesmith.co.uk/2012/01/08/graceful-shutdown-node-js-express.html
      // Shut down gracefully!
      logger.info("Closing on SIGTERM");
      httpServer.close();
    }
    process.on('SIGINT', closeGracefully); 
    process.on('SIGHUP', closeGracefully); 


    httpServer.on('close', async function () {
      // this runs after the above has completed. It allows us to close the database.
      logger.info("Web server closed. Shutting down DB connection.");
      await database.shutdown(true);
      logger.info("Database shutdown complete.")

      process._getActiveHandles();
      process._getActiveRequests();
      process.exit();
    });



    httpServer.listen(config.http_server_port, () => logger.info(`listening on port ${config.http_server_port}!`))  

  })



