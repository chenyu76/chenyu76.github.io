#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
rm $DIR/scripts.js
uglifyjs $DIR/*.js -c -o $DIR/scripts.js
