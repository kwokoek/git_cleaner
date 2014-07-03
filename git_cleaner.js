var util = require('util'),
  child_process = require('child_process'),
  readline = require('readline'),
  async = require('async');

var BRANCH_MARKER = "[[branch]]";


// Given a git log info entry, parse out the remote and branch
// The entry is expect to be in a know format:
//  <info> <BRANCH_MARKER> <remote>/<origin>
//
// Return a wrapper holding the orig info, and the remote/branch pair
//
function parse_branch(branch_info,callback) {
  var branch_split_idx = branch_info.indexOf(BRANCH_MARKER);
  if(branch_split_idx === -1) {
    return callback("Log entry missing branch marker",BRANCH_MARKER,"on log entry",branch_info);
  }

  var branch_split = branch_info.substring(branch_split_idx + BRANCH_MARKER.length).trim();
  if(!branch_split) {
    return callback(branch_parse_fail(branch_info , "No branch delimiter found"));
  }
  var remote_split_idx = branch_split.indexOf("/");
  if(remote_split_idx === -1) {
    return callback(branch_parse_fail(branch_info ,"No remote branch split found"));
  }

  var git_remote = branch_split.substring(0,remote_split_idx);
  var git_branch = branch_split.substring(remote_split_idx + 1);
  if(!git_remote || !git_branch) {
    return callback(branch_parse_fail(branch_info ,"Unable to parse out remote and branch"));
  }

  var branch = {
    git_remote:git_remote,
    git_branch:git_branch,
    branch_info:branch_info
  }

  callback(null,branch);
}

// helper to capture a common log format
function branch_parse_fail(branch_info,reason) {
  return "Unable to parse branch information from branch ("+reason+") "+branch_info;
}

// Handle the processing of the list of git log entries, and run through the options per branch
function branch_cycle(git_logs) {
  // using async series for our readline interaction on a per entry basis
  async.eachSeries(git_logs, function(git_log_entry,callback) {
    if(!git_log_entry) {
      callback();
    }

    parse_branch(git_log_entry,function(err,branch) {

      console.log("\n",branch.branch_info);
      var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      var branch_target = branch.git_remote+"/"+branch.git_branch;

      rl.question("Delete branch "+branch_target+"? (yes/no/exit) ", function(answer) {
        rl.close();

        if(answer === "yes") {
          console.log("Deleting",branch_target);
        } else if(answer === "exit" || answer === "x") {
          return callback("User Exit");
        } else {
          console.log("Skipping",branch_target);
        }

        callback();
      });
      
    });
  }, function(err){
    if( err ) {
      var msg = 'Git log processing failure: '+util.inspect(err);
      console.log();
      util.log(msg);
      console.log();
      return;
    }
  });
}

// Cleaning entry point
function clean_driver() {

  child_process.exec('cd ~/glg/node-cmp; gs',
   function (error, stdout, stderr) {

     if(stderr || error) {
       util.log("Exiting with git log retrieval error");
       console.log('stderr: ' + stderr);
       if (error !== null) {
         console.log('exec error: ' + error);
       }
       return;
     }

     var git_logs = stdout.split(/\r\n|\r|\n/g);
     branch_cycle(git_logs);
   });

}

clean_driver();

