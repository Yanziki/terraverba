#!/bin/sh
# Push the working copy to the Mac (where the project lives and the data is built).
# Data generated on the Mac under public/data is protected from --delete.
rsync -a --delete --filter='P public/data/' --exclude .git --exclude node_modules --exclude dist --exclude 'data/.venv' --exclude 'data/raw' --exclude '.shots' \
  "$(dirname "$0")/" mac-host:Glossa/
