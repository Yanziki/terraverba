#!/bin/sh
# Batch screenshots: tools/shots.sh name=url-fragment ...  (run on the Mac)
cd "$(dirname "$0")/.." && export PATH=~/.local/node/bin:$PATH && mkdir -p .shots
W=${W:-1440}; H=${H:-900}; WAIT=${WAIT:-4200}
for spec in "$@"; do
  name=${spec%%=*}; frag=${spec#*=}
  node tools/shot.mjs "http://localhost:5173/?lang=${LANG_UI:-zh}${frag}" ".shots/$name.png" $W $H $WAIT &
done
wait
