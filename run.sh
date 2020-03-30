git pull
git submodule init
git pull --recurse-submodules
git submodule update --remote
npm i
tsc
node ./index.js
open http://localhost:9000
python -m SimpleHTTPServer 9000


