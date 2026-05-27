#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd $DIR

# cleaning
rm ./scripts.js
rm ./gif_matrix.js

# ATRI
python ./gif2js.py ./atri.gif ./gif_matrix.js
# sentences
python pixel_font.py fusion-pixel-10px-proportional-zh_hans.otf 10 glyph_data.js

# https://github.com/mishoo/UglifyJS
uglifyjs $DIR/*.js -c -o $DIR/scripts.js
