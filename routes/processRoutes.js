'use strict';

const chalk = require('chalk');
const express = require('express');

var Components = require('../lib/Components.js');
var Forms = require('../lib/Forms.js');
var Jobs = require('../lib/Tests.js')('job');
var Components = require('../lib/Components.js');
var permissions = require('../lib/permissions.js');
var Processes = require("../lib/Processes.js");
var router = express.Router();

module.exports = router;

//////////////////////////////////////////////////////////////////////////
// Editing and creating forms


router.get("/processjob/:jobRecordId([A-Fa-f0-9]{24})/:formRecordId([A-Fa-f0-9]{24})/:processId(\\w+)", permissions.checkPermission("jobs:process"), async function(req,res){
  // var form = await Forms.retrieve("jobForms",null,{id:req.params.formRecordId});
  // var job = await Jobs.retrieve(req.params.jobRecordId);

  var processId = decodeURIComponent(req.params.processId);
  let [form,job,pastProcesses] = await Promise.all([
      Forms.retrieve("jobForms",null,{id:req.params.formRecordId}),
      Jobs.retrieve(req.params.jobRecordId),
      Processes.findInputRecord(req.params.jobRecordId),
  ]);

  if(!form) return res.status(400).send("No such form "+req.params.formRecordId);
  if(!job) return res.status(400).send("No such job"+req.params.jobRecordId);
  console.log(form);
  if(!form.processes) return res.status(400).send("No processes in that form");
  var process_to_run = form.processes[processId];
  if(!process_to_run) return res.status(400).send("No such algorithm "+processId);


  // How locking works:
  // If this is called without query paramerters, it's a dry run.
  // Dry runs do nothing but exercise the process code. Nothing committed.
  // 
  // If query has "?commit=true" then it's not a dry_run.
  // Failed processes may insert things before failing; I hope I've pre-checked
  // for all possible problems with the dry run. User COULD circumvent this will a well-crafted 'get'
  //
  // If not a dry run, then the Process system inserts a record with state:'draft'
  //  when starting the process, deleting it and replacing it with 'submitted' if finished.
  // 
  // If any process record exists, then, the system has already or is already processing this record.
  // If the user clicks the confirmation button, this script is called with
  // ?commit=true&override=true
  // which then allows the script to run again.


  // Has this record already been processed?
  // var pastProcesses = findInputRecord(req.params.jobRecordId);
  var conflict = false;
  if(!dry_run && pastProcesses && pastProcesses.length>0) {
    // Another process has already run or is running. Deny unless override.
    if(!req.query.override) {
      dry_run = true; // revert to dry run.
      conflict = true;
    }
  } 

  var dry_run = true;
  if(req.query.commit) dry_run = false;
  var result = await Processes.run(req, form, req.params.processId, job, dry_run);

  console.log("........",result.state);
  console.log(JSON.stringify(result,null,2));
  console.log("........");

  if(dry_run == false && result && result.state==="submitted")
    return res.redirect('/processRecord/'+result._id.toString())

  res.render("processResult.pug",{dry_run, job, form, result, pastProcesses, conflict});


});


router.get("/processRecord/:processRecordId([A-Fa-f0-9]{24})", permissions.checkPermission("jobs:view"), async function(req,res){
    var processId = decodeURIComponent(req.params.processId);
    var result = await Processes.retrieve(processId);
    console.log(result);
    if(!result) return res.status(400).send("No such process record in database.");
    let [form,job,pastProcesses] = await Promise.all([
      Forms.retrieve(result.process.collection,result.process.formId,{id:result.process._id}),
      Jobs.retrieve(result.input._id),
      Processes.findInputRecord(result.input._id)
    ]); 
    res.render("processResult.pug",{result, form, job, pastProcesses});
});


// Could allow expert deletions?

