#!/bin/python
import sys

import numpy as np
from PIL import Image, ImageSequence


def get_color_str(r, g, b, a):
    """辅助函数：将RGBA转换为CSS颜色字符串"""
    if a == 0:
        return "transparent"
    elif a < 255:
        return f"rgba({r},{g},{b},{a/255:.2f})"
    else:
        return f"#{r:02x}{g:02x}{b:02x}"


def compress_gif_to_js(image_path):
    img = Image.open(image_path)

    frames = []
    for frame in ImageSequence.Iterator(img):
        frames.append(np.array(frame.convert("RGBA")))

    width, height = img.size

    # 初始化颜色列表，确保 'skip' 在索引 0
    # skip 代表该区域与上一帧一致，无需重绘
    color_list = ["skip"]

    gif_matrix = []

    # 初始上一帧数据（默认为全透明，或者认为第一帧全都需要绘制）
    # 为了逻辑统一，我们假设第0帧之前是空的，所有内容都是“变化”
    prev_pixels = None

    print(f"开始处理 GIF，共 {len(frames)} 帧...")

    for frame_idx, pixels in enumerate(frames):
        frame_instructions = []

        # visited 标记当前帧已处理（已编码）的像素
        # 无论是绘制了颜色，还是标记为 skip，都算作 visited
        visited = np.zeros((height, width), dtype=bool)

        # 按照扫描线顺序遍历（从上到下，从左到右）
        for y in range(height):
            for x in range(width):
                if visited[y, x]:
                    continue

                # --- 确定当前块的类型 (SKIP 还是 绘制颜色) ---

                r, g, b, a = pixels[y, x]
                current_color_str = get_color_str(r, g, b, a)

                target_type = "COLOR"  # 默认为绘制颜色
                target_color_index = -1

                # 检查是否可以 SKIP (与上一帧相同)
                is_same_as_prev = False
                if prev_pixels is not None:
                    pr, pg, pb, pa = prev_pixels[y, x]
                    prev_color_str = get_color_str(pr, pg, pb, pa)
                    if current_color_str == prev_color_str:
                        is_same_as_prev = True

                # 第一帧没有上一帧，所以不能 skip (除非逻辑改为背景色)
                # 这里假设第一帧全部输出颜色
                if frame_idx > 0 and is_same_as_prev:
                    target_type = "SKIP"
                    target_color_index = 0  # 0 号索引固定为 skip
                else:
                    # 如果是新颜色，加入列表
                    if current_color_str not in color_list:
                        color_list.append(current_color_str)
                    target_color_index = color_list.index(current_color_str)

                # --- 贪婪算法：寻找最大同类型矩形 ---

                # 1. 向右扩展宽度 w
                w = 0
                while x + w < width:
                    if visited[y, x + w]:
                        break

                    # 获取该位置颜色和对比上一帧状态
                    tr, tg, tb, ta = pixels[y, x + w]
                    t_color_str = get_color_str(tr, tg, tb, ta)

                    t_same_as_prev = False
                    if prev_pixels is not None:
                        pr, pg, pb, pa = prev_pixels[y, x + w]
                        if get_color_str(pr, pg, pb, pa) == t_color_str:
                            t_same_as_prev = True

                    # 判断是否符合当前 target_type
                    match = False
                    if target_type == "SKIP":
                        if t_same_as_prev:
                            match = True
                    else:
                        # 必须颜色相同，且最好不要是能被 skip 的点（虽然能 skip 的点画上也无所谓，但为了压缩应该优先 skip）
                        # 简化逻辑：只要颜色一致即可合并
                        if t_color_str == current_color_str:
                            match = True
                        # 优化：如果在绘制颜色块的过程中，遇到一个点其实和上一帧一样(能skip)，
                        # 通常为了减少碎片，我们还是把它画进去，除非这个skip块很大。
                        # 这里采用简单贪婪：只要颜色对就合并。

                    if not match:
                        break
                    w += 1

                # 2. 向下扩展高度 h
                h = 1
                while y + h < height:
                    # 检查这一行 [x : x+w] 是否全部符合条件
                    row_match = True
                    for k in range(w):
                        if visited[y + h, x + k]:
                            row_match = False
                            break

                        tr, tg, tb, ta = pixels[y + h, x + k]
                        t_color_str = get_color_str(tr, tg, tb, ta)

                        t_same_as_prev = False
                        if prev_pixels is not None:
                            pr, pg, pb, pa = prev_pixels[y + h, x + k]
                            if get_color_str(pr, pg, pb, pa) == t_color_str:
                                t_same_as_prev = True

                        if target_type == "SKIP":
                            if not t_same_as_prev:
                                row_match = False
                                break
                        else:
                            if t_color_str != current_color_str:
                                row_match = False
                                break

                    if row_match:
                        h += 1
                    else:
                        break

                # --- 记录并标记 ---
                # 格式: [w, h, color_index]
                frame_instructions.append([w, h, target_color_index])
                visited[y : y + h, x : x + w] = True

        gif_matrix.append(frame_instructions)
        prev_pixels = pixels
        print(f"帧 {frame_idx} 处理完成: {len(frame_instructions)} 个指令块")

    # 生成 JS 字符串
    js_output = f"const colorList = {str(color_list).replace(' ', '')};\n"
    js_output += "const gifMatrix = ["
    for frame in gif_matrix:
        js_output += "["
        for item in frame:
            # item:
            # [w, h, color_index] if h > 1 else [w, color_index]
            # else w == 1: color_index
            if item[1] == 1:
                if item[0] == 1:
                    js_output += f"{item[2]},"
                else:
                    js_output += f"[{item[0]},{item[2]}],"
            else:
                js_output += f"[{item[0]},{item[1]},{item[2]}],"
        if len(frame) > 0:
            js_output = js_output.rstrip(",")
        js_output += "],"
    if len(gif_matrix) > 0:
        js_output = js_output.rstrip(",")
    js_output += "];"

    js_output += (
        f"\nconst gifMatrixWidth = {width};\nconst gifMatrixHeight = {height};"
    )

    return js_output


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <GIF INPUT> <JS OUTPUT>")
        sys.exit(1)

    image_path = sys.argv[1]
    js_path = sys.argv[2]
    js_output = compress_gif_to_js(image_path)

    with open(js_path, "w", encoding="utf-8") as f:
        f.write(js_output)
    print(f"{image_path} > {js_path}")
