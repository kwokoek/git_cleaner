### Clean my repo
When a git repository gets active, with many branches per feature,
you are left with a large mess to clean up. Most developers do not clean
out branches when complete, and you can find yourself with 100's of
branches.

At this point you have some options: 

* Leave the branches there and let it continue to grow (unclean!!)
* Make an automated script to delete branches older than x days
(possible deleting something useful)
* Delete branches manually (this is tedious with 100's of branches, but
seems like the best approach)

git_cleaner enables the the explicit control of a hu-man to figure out
which branches to delete, and which to keep, while eliminating the
tedious task of doing each delete manually.

### How it works

Pointing at a repository on disk, all the branches are pulled from git.
The branches are sorted to show the oldest first (usually the ones
you want to eliminate).

Each branch is shown with base information (date, author, and the last
commit for that branch). Options are given to delete the branch, or skip it to continue to the next branch.  
In this way you can preserve specific branches (say for a release, or an
interesting experiment), while deleting ones that you no longer want.


### Run it

Step 1: run npm install from the git cleaner folder  
```npm install ``` 
  
Step 2: point git cleaner at your target repository  
```node git_cleaner.js ~/me/repoX```
  
Step 3: profit! delete the branches you no longer want.

#### *** USE WITH CAUTION !! ***  
The script will delete the branches as soon as you confirm that branch
deletion.   

This will ***PERMANENTLY DELETE*** that branch.   

Use with caution.

