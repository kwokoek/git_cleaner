/*
 * Helper utility to help clean repositories which many 'dead' branches.
 *
 * All the branches for the target repo are pulled, sorted to show oldest branches first, and then
 * cycle the branches to the user.
 *
 * The user can then delete the branch, or skip it, and continue.
 */
var util = require('util'),
  fs = require('fs'),
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
function parseBranch(branch_info,callback) {
  var branch_split_idx = branch_info.indexOf(BRANCH_MARKER);
  if(branch_split_idx === -1) {
    return callback("Log entry missing branch marker "+BRANCH_MARKER+ " on log entry "+branch_info);
  }

  var branch_split = branch_info.substring(branch_split_idx + BRANCH_MARKER.length).trim();
  if(!branch_split) {
    return callback(branchParseFail(branch_info , "No branch delimiter found"));
  }
  var remote_split_idx = branch_split.indexOf("/");
  if(remote_split_idx === -1) {
    return callback(branchParseFail(branch_info ,"No remote branch split found"));
  }

  var git_remote = branch_split.substring(0,remote_split_idx);
  var git_branch = branch_split.substring(remote_split_idx + 1);
  if(!git_remote || !git_branch) {
    return callback(branchParseFail(branch_info ,"Unable to parse out remote and branch"));
  }

  // Wrap up the parse info for easy consumption
  var branch = {
    git_remote:git_remote,
    git_branch:git_branch,
    branch_info:branch_info
  }

  callback(null,branch);
}

// helper to capture a common log format
function branchParseFail(branch_info,reason) {
  return "Unable to parse branch information from branch ("+reason+") "+branch_info;
}

// Helper wrapper to run the passed in command
// On success, callback will be sent the cmd run
function runShellCommand(target_path,command,ignore_errors,callback) {
  var cmd = util.format("cd %s;%s",target_path,command);
  child_process.exec(cmd,
   function (error, stdout, stderr) {

     if(!ignore_errors && (stderr || error)) {
       console.log('stderr: ' + stderr);
       if (error !== null) {
         console.log('exec error: ' + error);
       }
       var msg = "FAILURE running shell command:"+cmd;
       return callback(msg);
     }

     console.log("OK: "+cmd);
     callback(null,cmd);
   });
}

// Confirm deletion as this is permanent! Then run actual delete.
function confirmDelete(target_path,branch,callback) {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  var remote_delete = util.format("git push --porcelain %s :%s",branch.git_remote,branch.git_branch);

  rl.question("Run this cmd '"+remote_delete+"' ? (yes/no) ", function(answer) {
    rl.close();
    if(answer === "yes" || answer === "y") {
      return runShellCommand(target_path,remote_delete,false,function(err,cmd) {
        if(err) { 
          return callback(err);
        }
        // remote delete success, now clean up the local branch
        // Ignore any error on this call, as a local copy may not exist
        var local_del = util.format("git branch -D %s",branch.git_branch);
        runShellCommand(target_path,local_del,true,callback);
      });

    } 

    // Fall through - skip this branch
    console.log("Skipping",branch.git_branch);
    callback();
  });

}
// Handle the processing of the list of git log entries, and run through the options per branch
function branchCycle(target_path,git_logs,main_callback) {
  var runStats = {
    branch_count:0,
    delete_count:0
  };

  // using async series for our readline interaction on a per entry basis
  async.eachSeries(git_logs, function(git_log_entry,callback) {
    if(!git_log_entry) {
      return callback();
    }

    runStats.branch_count += 1;
    parseBranch(git_log_entry,function(err,branch) {
      if(err) {
        return callback(err);
      }

      console.log("\n\n");
      console.log(branch.branch_info.trim(),"\n");
      var branch_target = branch.git_remote+"/"+branch.git_branch;
      var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question("Delete branch "+branch_target+"? (yes/no/exit) ", function(answer) {
        rl.close();

        if(answer === "yes" || answer === "y") {
          return confirmDelete(target_path,branch,function(err,cmd_run) {
            if(cmd_run) {
              runStats.delete_count += 1;
            }

            callback(err);
          });
        } else if(answer === "exit" || answer === "x") {
          return callback("User Exit");
        } 

        console.log("Skipping",branch.git_branch);
        callback();
      });
      
    });
  }, function(err){
    main_callback(err,runStats);
  });
}

// Cleaning entry point
function launchCleaner(target_path) {

  child_process.exec('./show_git_branches.sh '+target_path,
   function (error, stdout, stderr) {

     if(stderr || error) {
       util.log("Exiting with git log retrieval error");
       console.error('stderr: ' + stderr);
       if (error !== null) {
         console.error('exec error: ' + error);
       }
       return;
     }

     // If there is no stdout, that means there is no git repo at the target path
     if(!stdout) {
       console.error("\nNo git repository found at path",target_path);
       return;
     }

     var git_logs = stdout.split(/\r\n|\r|\n/g);
     branchCycle(target_path,git_logs,function(err,run_stats) {
    
       // Cleaner could have already completed some operations, show stats
       if(run_stats) {
         console.log();
         util.log("Total number branches processed: "+run_stats.branch_count);
         util.log("Number of branches deleted: "+run_stats.delete_count);
         console.log();
         console.log();
       }

       if(err) {
         util.log("Git clean processing failure - "+util.inspect(err));
       }
     });
   });

}

// Entry point to read in options and fire off cleaning
function cleanDriver() {
  if(process.argv.length != 3) {
    console.error("\nMissing target git repository");
    console.error("Usage : node git_cleaner PATH_TO_FOLDER_TO_CLEAN\n");
    return;
  }

  var target_path = process.argv[2];
  if(!fs.existsSync(target_path)) {
    console.error("\nTarget folder to clean must exist. Was passed:",target_path);
    return;
  }
  if(!fs.lstatSync(target_path).isDirectory()) {
    console.error("\nTarget must be a folder. Was passed:",target_path);
    return;
  }
  launchCleaner(target_path);
}

cleanDriver();

