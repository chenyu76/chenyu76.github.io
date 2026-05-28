#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd $DIR

# cleaning
rm scripts.js
rm gif_matrix.js

set -e

# sentences
python pixel_sentences.py fusion-pixel-8px-proportional-zh_hans.otf 8 glyph_data.js
# ATRI
python gif2js.py atri.gif gif_matrix.js

# https://github.com/mishoo/UglifyJS
uglifyjs $DIR/*.js -c -o $DIR/scripts.js
