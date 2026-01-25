#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
uglifyjs $DIR/*.js -c -o $DIR/scripts.js
