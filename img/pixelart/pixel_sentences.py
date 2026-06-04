import os

from PIL import Image, ImageFont, ImageDraw
from fontTools.ttLib import TTFont
from sentences import SENTENCES
import json
import math

CUSTOM_FONT_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "custom_font"
)


def _parse_custom_font_filename(filename: str):
    if not filename.endswith(".png"):
        return None
    stem = filename[:-4]
    parts = stem.rsplit("_", 1)
    if len(parts) != 2:
        return None
    try:
        return parts[0], int(parts[1])
    except ValueError:
        return None


def load_custom_glyph(char: str, custom_font_dir: str = CUSTOM_FONT_DIR):
    if not os.path.isdir(custom_font_dir):
        return None

    for filename in os.listdir(custom_font_dir):
        parsed = _parse_custom_font_filename(filename)
        if parsed is None:
            continue
        file_char, baseline = parsed
        if file_char != char:
            continue

        try:
            img = Image.open(os.path.join(custom_font_dir, filename))
            if img.mode != "RGBA":
                img = img.convert("RGBA")
            width, height = img.size
            array_2d = []
            for y in range(height):
                row = []
                for x in range(width):
                    r, g, b, a = img.getpixel((x, y))
                    if a < 128:
                        row.append(False)
                    else:
                        row.append(r < 128 and g < 128 and b < 128)
                array_2d.append(row)
            return array_2d, baseline
        except Exception:
            continue

    return None


r"""
PixelFont 类 — 加载像素字体 TTF，提供：
    - 字符去重（deduplicate_chars）
    - 单字符 → 二维布尔数组 + 基线偏移（char_to_bool_array，空格返回 6x1 空白）
    - 布尔数组 → ASCII 32-95 六位编码（encode_to_ascii）及其解码
    - 字符串 → {字符: {encoded, baseline, width, height}} 字典（generate_character_map）
build_glyph_table
    输入字符字典 + 字符串列表，按字频降序排列，
    输出 (编号列表, 字形列表)，\n 映射为 -1
write_glyph_data_js
    将上述数据写入合法 JS 文件
"""


class PixelFont:
    ASCII_ENCODE_BASE = 32
    BITS_PER_CHUNK = 6

    def __init__(self, font_path: str, size: int = 16):
        self.font_path = font_path
        self.size = size
        self.font = ImageFont.truetype(font_path, size)
        metrics = self.font.getmetrics()
        self._ascent = metrics[0] if metrics else 0

    @staticmethod
    def deduplicate_chars(s: str) -> str:
        seen = set()
        result = []
        for c in s:
            if c not in seen:
                seen.add(c)
                result.append(c)
        return "".join(result)

    def char_to_bool_array(self, char: str):
        """
        Convert a single character to a 2D boolean array.

        Returns:
            (bool_2d_array, baseline_offset)
            bool_2d_array: list[list[bool]] -- True = colored pixel
            baseline_offset: int -- baseline position from the top of the array
        """
        if char == " ":
            return [[False] * 4], 1

        bbox = self.font.getbbox(char)
        if bbox is None:
            return [], 0

        left, top, right, bottom = bbox
        width = right - left
        height = bottom - top

        if width <= 0 or height <= 0:
            return [], 0

        img = Image.new("1", (width, height), 1)
        draw = ImageDraw.Draw(img)
        draw.text((-left, -top), char, font=self.font, fill=0)

        array_2d = []
        for y in range(height):
            row = []
            for x in range(width):
                row.append(img.getpixel((x, y)) == 0)
            array_2d.append(row)

        baseline_offset = self._ascent - top
        return array_2d, baseline_offset

    @staticmethod
    def encode_to_ascii(bool_array: list) -> str:
        """
        Encode a 2D boolean array into a compact ASCII string (chars 32–95).

        Flattens left-to-right top-to-bottom, groups into 6-bit chunks,
        pads trailing bits with 0 (False).
        """
        if not bool_array or not bool_array[0]:
            return ""

        bits = []
        for row in bool_array:
            for cell in row:
                bits.append("1" if cell else "0")

        while len(bits) % 6 != 0:
            bits.append("0")

        encoded = []
        for i in range(0, len(bits), 6):
            value = int("".join(bits[i : i + 6]), 2)
            encoded.append(chr(PixelFont.ASCII_ENCODE_BASE + value))

        return "".join(encoded)

    @staticmethod
    def decode_from_ascii(encoded: str, width: int, height: int) -> list:
        """
        Decode an ASCII string (chars 32–95) back to a 2D boolean array.
        """
        bits = []
        for ch in encoded:
            value = ord(ch) - PixelFont.ASCII_ENCODE_BASE
            bits.extend(f"{value:06b}")

        total = width * height
        bits = bits[:total]

        array_2d = []
        for y in range(height):
            row = []
            for x in range(width):
                row.append(bits[y * width + x] == "1")
            array_2d.append(row)

        return array_2d

    def generate_character_map(self, s: str) -> dict:
        """
        Map each unique character in s to its pixel representation.

        Returns:
            dict like {'A': {'encoded': '...', 'baseline': 0, 'width': 8, 'height': 10}}
        """
        unique_chars = self.deduplicate_chars(s)
        result = {}

        for char in unique_chars:
            custom = load_custom_glyph(char)
            if custom is not None:
                array_2d, baseline = custom
            else:
                array_2d, baseline = self.char_to_bool_array(char)
            encoded = self.encode_to_ascii(array_2d)
            width = len(array_2d[0]) if array_2d else 0
            height = len(array_2d)

            result[char] = {
                "encoded": encoded,
                "baseline": baseline,
                "width": width,
                "height": height,
            }

        return result


def get_missing_chars(font_path, text: str) -> str:
    """
    Check which characters in text are not available in the font.

    Returns:
        A string of characters that are missing from the font.
        Returns an empty string if all characters exist.
    """
    missing = []
    with TTFont(font_path) as font:
        cmap = font.getBestCmap()
        for ch in text:
            if ch == "\n":
                continue
            if ord(ch) not in cmap:
                missing.append(ch)
    return "".join(missing)


def build_glyph_table(char_map: dict, texts: list):
    """
    Build a frequency-ordered glyph table and convert texts to index lists.

    Args:
        char_map: {char: {'encoded': str, 'baseline': int, 'width': int, 'height': int}}
        texts: list of strings (may contain \\n newlines)

    Returns:
        (index_lists, glyphs)
        index_lists: list[list[int]] — each string as a list of char indices (-1 = newline)
        glyphs: list[list] — [[encoded, baseline, width], ...] ordered by frequency
    """
    freq = {}
    for text in texts:
        for ch in text:
            if ch == "\n":
                continue
            if ch in char_map:
                freq[ch] = freq.get(ch, 0) + 1

    sorted_chars = sorted(freq.keys(), key=lambda c: freq[c], reverse=True)

    char_to_idx = {ch: i for i, ch in enumerate(sorted_chars)}

    glyphsEncoded = []
    glyphsBaseline = ""
    glyphsWidth = ""
    maxAbove = 0
    maxBelow = 0
    for ch in sorted_chars:
        encoded = char_map[ch]["encoded"]
        baseline = char_map[ch]["baseline"]
        width = char_map[ch]["width"]
        height = char_map[ch]["height"]

        glyphsEncoded.append(encoded)
        glyphsBaseline += chr(baseline + 32)
        glyphsWidth += chr(width + 32)

        if height <= 0 or len(encoded) == 0:
            continue
        above = baseline
        below = height - baseline
        if above > maxAbove:
            maxAbove = above
        if below > maxBelow:
            maxBelow = below

    index_lists = []
    for text in texts:
        indices = []
        for ch in text:
            if ch == "\n":
                indices.append(-1)
            elif ch in char_to_idx:
                indices.append(char_to_idx[ch])
        index_lists.append(indices)

    return (
        index_lists,
        glyphsEncoded,
        glyphsBaseline,
        glyphsWidth,
        maxAbove,
        maxBelow,
    )


_INDEX_ASCII_BASE = 32
_INDEX_ASCII_RANGE = 64


def encode_index_list(indices: list) -> str:
    """
    Encode a list of glyph indices into a compact two-char-per-index string.

    Each index is shifted by +1 so that -1 (newline) becomes 0,
    then split into two base-64 ASCII digits (chars 32–95).
    """
    chars = []
    for idx in indices:
        v = idx + 1
        hi = v // _INDEX_ASCII_RANGE
        lo = v % _INDEX_ASCII_RANGE
        chars.append(chr(_INDEX_ASCII_BASE + hi))
        chars.append(chr(_INDEX_ASCII_BASE + lo))
    return "".join(chars)


def decode_index_list(encoded: str) -> list:
    """
    Decode an index string back to a list of glyph indices.

    Inverse of encode_index_list.
    """
    result = []
    for i in range(0, len(encoded), 2):
        hi = ord(encoded[i]) - _INDEX_ASCII_BASE
        lo = ord(encoded[i + 1]) - _INDEX_ASCII_BASE
        v = hi * _INDEX_ASCII_RANGE + lo
        result.append(v - 1)
    return result


def write_glyph_data_js(
    output_path,
    index_lists,
    glyphsEncoded,
    glyphsBaseline,
    glyphsWidth,
    maxAbove,
    maxBelow,
):
    """
    Write index lists and glyph data to a JavaScript file.

    The output file defines a global variable:

        const PIXEL_GLYPH_DATA = {
            glyphsEncoded: [encoded1, encoded2 ...],
            glyphsBaseline: encoded_string
            glyphsWidth: encoded_string,
            indexLists: ["encoded_string", ...],
            lineBaseOffset: number,
            lineRowHeight: number
        };

    indexLists are encoded as compact strings using encode_index_list.
    """

    encoded_lists = [encode_index_list(lst) for lst in index_lists]

    data = {
        "glyphsEncoded": glyphsEncoded,
        "glyphsBaseline": glyphsBaseline,
        "glyphsWidth": glyphsWidth,
        "indexLists": encoded_lists,
        "lineBaseOffset": maxAbove,
        "lineRowHeight": maxAbove + maxBelow,
    }
    js_content = (
        "const PIXEL_GLYPH_DATA = "
        + json.dumps(data, ensure_ascii=False)
        + ";\n"
    )

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(js_content)


if __name__ == "__main__":
    import sys

    usage = f"Usage: {sys.argv[0]} <font.ttf> <font_size> <output.js>"
    if len(sys.argv) != 4:
        print(usage)
        sys.exit(1)

    font_path = sys.argv[1]
    size = int(sys.argv[2])
    js_path = sys.argv[3]
    texts = SENTENCES

    custom_chars = set()
    if os.path.isdir(CUSTOM_FONT_DIR):
        for f in os.listdir(CUSTOM_FONT_DIR):
            parsed = _parse_custom_font_filename(f)
            if parsed:
                custom_chars.add(parsed[0])

    missing = get_missing_chars(font_path, "".join(texts))
    missing = "".join(ch for ch in missing if ch not in custom_chars)
    if missing:
        print(
            f"Error: the following characters are not supported by {font_path}: \n{missing}"
        )
        sys.exit(1)

    pf = PixelFont(font_path, size)
    pixel_map = pf.generate_character_map("".join(texts))

    (
        index_lists,
        glyphsEncoded,
        glyphsBaseline,
        glyphsWidth,
        maxAbove,
        maxBelow,
    ) = build_glyph_table(pixel_map, texts)
    print(f"Glyphs length: {len(glyphsEncoded)}")

    write_glyph_data_js(
        js_path,
        index_lists,
        glyphsEncoded,
        glyphsBaseline,
        glyphsWidth,
        maxAbove,
        maxBelow,
    )
    print(f"Written: {js_path}")

    from pixel_preview import render_sentences

    preview_path = os.path.splitext(js_path)[0] + "_preview.png"
    render_sentences(
        index_lists,
        glyphsEncoded,
        glyphsBaseline,
        glyphsWidth,
        js_path,
        preview_path,
        scale=8,
    )
