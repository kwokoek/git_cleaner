#!/bin/sh
# Get all the branches on a git repo, and sort by date to show oldest first

if [ "$#" -ne 1 ]; then
  echo
  echo "Parent folder containing a git repository required" >&2
  echo "Usage: show_git_branches FOLDER_PATH" >&2
  echo
  exit 1

fi

cd $1
for k in $(git branch -r|grep -v "\->"|sed s/^..//);do echo $(git log -1 --pretty=format:"%at %ad %cn %s" "$k")  [[branch]]  "$k";done|sort
