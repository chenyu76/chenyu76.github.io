#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd $DIR

# cleaning
rm scripts.js

set -e

# sentences
python pixel_sentences.py fusion-pixel-8px-proportional-zh_hans.otf 8 glyph_data.js
# ATRI
python gif2js.py atri.gif gif_matrix.js

# https://github.com/mishoo/UglifyJS
# echo "uglify JS"
# uglifyjs $DIR/*.js -c -o $DIR/scripts.js

FILES="character.js gif_matrix.js glyph_data.js land.js main.js pampas_grass.js pixel_text_renderer.js sky_element.js"

if [ "$1" = "--debug" ]; then
  echo "debug mode: concatenating files"
  cat $FILES > scripts.js
else
  echo "google-closure-compiler"
  google-closure-compiler -O ADVANCED \
    $FILES \
    --language_out ECMASCRIPT_2015 \
    --js_output_file scripts.js
fi

# clean
rm gif_matrix.js
rm glyph_data.js
