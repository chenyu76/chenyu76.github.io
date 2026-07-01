#!/bin/bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=== Check dependencies ==="
MISSING=""

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    MISSING="$MISSING  - $1 ($2)\n"
  fi
}

check_py() {
  if ! python -c "import $1" 2>/dev/null; then
    MISSING="$MISSING  - python module: $1 ($2)\n"
  fi
}

check_cmd python "sudo pacman -S python"
check_cmd html-minifier "sudo npm install -g html-minifier"
check_cmd google-closure-compiler "sudo npm install -g google-closure-compiler"
check_py PIL "pip install Pillow"
check_py numpy "pip install numpy"
check_py fontTools "pip install fonttools"

if [ -n "$MISSING" ]; then
  echo -e "Missing dependencies:\n$MISSING"
  exit 1
fi
echo "    OK"

echo "=== Processing sentences ==="
python pixel_sentences.py fusion-pixel-8px-proportional-zh_hans.otf 8 glyph_data.js
echo "=== Processing ATRI ==="
python gif2js.py atri.gif gif_matrix.js

echo "=== Build scripts.js ==="
FILES="character.js gif_matrix.js glyph_data.js land.js main.js pampas_grass.js pixel_text_renderer.js sky_element.js"

if [ "$1" = "--debug" ]; then
  echo "    debug mode: concatenating files"
  cat $FILES >scripts.js
else
  echo "    using google-closure-compiler"
  google-closure-compiler -O ADVANCED \
    $FILES \
    --language_out ECMASCRIPT_2015 \
    --js_output_file scripts.js
fi

echo "=== Inline CSS and JS ==="
TMPFILE="index_fat.html"
sed '/STYLE_PLACEHOLDER/{
  r styles.css
  d
}' index_src.html | sed '/SCRIPT_PLACEHOLDER;/{
  r scripts.js
  d
}' >"$TMPFILE"

echo "=== Minify with html-minifier ==="
if [ "$1" = "--debug" ]; then
  echo "    skip since --debug"
  cp "$TMPFILE" index.html
else
  html-minifier \
    --collapse-whitespace \
    --remove-comments \
    --remove-optional-tags \
    --remove-redundant-attributes \
    --remove-script-type-attributes \
    --remove-style-link-type-attributes \
    --minify-css \
    --minify-js \
    -o index.html "$TMPFILE"
fi

echo "=== Cleanup ==="
rm -f "$TMPFILE" gif_matrix.js glyph_data.js scripts.js
