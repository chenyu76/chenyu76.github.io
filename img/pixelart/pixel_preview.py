from PIL import Image
import math

_ASCII_BASE = 32
_ASCII_RANGE = 64


def _decode_encoded(encoded: str, width: int, height: int) -> list:
    bits = []
    for ch in encoded:
        value = ord(ch) - _ASCII_BASE
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


def _decode_index_list(encoded: str) -> list:
    result = []
    for i in range(0, len(encoded), 2):
        hi = ord(encoded[i]) - _ASCII_BASE
        lo = ord(encoded[i + 1]) - _ASCII_BASE
        v = hi * _ASCII_RANGE + lo
        result.append(v - 1)
    return result


def render_sentences(
    index_lists: list,
    glyphsEncoded: list,
    glyphsBaseline: str,
    glyphsWidth: str,
    js_path: str,
    output_path: str,
    scale: int = 8,
    line_gap: int = 2,
    sentence_gap: int = 3,
):
    if index_lists and isinstance(index_lists[0], str):
        index_lists = [_decode_index_list(lst) for lst in index_lists]

    baselines = [ord(ch) - _ASCII_BASE for ch in glyphsBaseline]
    widths = [ord(ch) - _ASCII_BASE for ch in glyphsWidth]

    decoded = []
    for i in range(len(glyphsEncoded)):
        encoded = glyphsEncoded[i]
        baseline = baselines[i]
        width = widths[i]
        if width <= 0 or len(encoded) == 0:
            decoded.append(([], 0, 0, 0))
            continue
        height = math.floor(len(encoded) * 6 / width)
        array_2d = _decode_encoded(encoded, width, height)
        decoded.append((array_2d, baseline, width, height))

    all_rows = []
    for si, sentence_indices in enumerate(index_lists):
        current_row = []
        x = 0
        for idx in sentence_indices:
            if idx == -1:
                if current_row:
                    all_rows.append(("glyphs", current_row))
                    all_rows.append(("gap", line_gap))
                current_row = []
                x = 0
                continue
            if idx < 0 or idx >= len(decoded):
                continue
            arr, base, w, h = decoded[idx]
            if w <= 0 or h <= 0:
                continue
            current_row.append((arr, base, w, h, x))
            x += w
        if current_row:
            all_rows.append(("glyphs", current_row))

        if si < len(index_lists) - 1:
            all_rows.append(("gap", sentence_gap))
            all_rows.append(("sep", None))
            all_rows.append(("gap", sentence_gap))

    max_width = 0
    row_metrics = []

    for row_type, data in all_rows:
        if row_type == "gap":
            row_metrics.append(("gap", data, None, None))
        elif row_type == "sep":
            row_metrics.append(("sep", 1, None, None))
        elif row_type == "glyphs" and data:
            max_baseline = max(g[1] for g in data)
            max_below = max(g[3] - g[1] for g in data)
            row_height = max_baseline + max_below
            row_width = sum(g[2] for g in data)
            if row_width > max_width:
                max_width = row_width
            row_metrics.append(("glyphs", row_height, data, max_baseline))
        else:
            row_metrics.append(("gap", 1, None, None))

    if max_width == 0:
        print("Warning: nothing to render (all glyphs empty)")
        return

    total_height = sum(rm[1] for rm in row_metrics)

    canvas = Image.new("RGB", (max_width, total_height), "white")

    y = 0
    for rtype, height, data, row_baseline in row_metrics:
        if rtype == "sep":
            for gx in range(max_width):
                canvas.putpixel((gx, y), (200, 200, 200))
        elif rtype == "glyphs" and data is not None:
            for arr, base, w, h, char_x in data:
                char_y = row_baseline - base
                for gy in range(h):
                    for gx in range(w):
                        if arr[gy][gx]:
                            canvas.putpixel(
                                (char_x + gx, y + char_y + gy), (0, 0, 0)
                            )
        y += height

    img = canvas.resize(
        (max_width * scale, total_height * scale), Image.NEAREST
    )
    img.save(output_path)
    print(f"Preview saved to: {output_path}")
