'use strict';

const chalk = require('chalk');
const express = require('express');
var ManagementClient = require('auth0').ManagementClient;

var permissions = require('../lib/permissions.js');
var router = express.Router();

module.exports = router;

var manager = new ManagementClient({
  domain: 'dev-pserbfiw.auth0.com', //  domain: '{YOUR_ACCOUNT}.auth0.com',
  clientId: "4huNuPkxWJfK0BKUkPCEfME4x9eR5rb6",
  clientSecret: "MWnwkyjIZSUOLQf-6Sskw9OUjm-bHqQovA-kDsOFlYV3_khF-tafmbk87c_FxZ55",//'{YOUR_NON_INTERACTIVE_CLIENT_SECRET}',
  scope: 'read:users update:users'
});

(async function(){
  console.log(await manager.getUsersByEmail('ntagg@otterbein.edu'))
})();


router.get('/profile/:userId',permissions.checkPermission("tests:view"),
  async function(req,res,next) {

});