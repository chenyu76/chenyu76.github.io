import sys
from PIL import Image
import numpy as np

def compress_image_to_js(image_path):
    # 打开图片
    img = Image.open(image_path).convert("RGBA")
    pixels = np.array(img)

    # 获取图片的宽度和高度
    width, height = img.size

    # 初始化颜色列表和颜色矩阵
    color_list = []
    compressed_matrix = []

    for y in range(height):
        row = []
        current_color = None
        current_count = 0

        for x in range(width):
            r, g, b, a = pixels[y, x]

            # 判断透明度
            if a == 0:
                color = "transparent"
            elif a < 255:
                color = f"rgba({r}, {g}, {b}, {a/255:.2f})"
            else:
                color = f"#{r:02x}{g:02x}{b:02x}"

            # 如果颜色不在颜色列表中，则添加
            if color not in color_list:
                color_list.append(color)
            color_index = color_list.index(color)

            # 如果当前颜色与上一个颜色相同，增加计数
            if color_index == current_color:
                current_count += 1
            else:
                # 如果当前颜色不同，记录上一个颜色的块
                if current_color is not None:
                    if current_count == 1:
                        row.append(current_color)
                    else:
                        row.append([current_color, current_count])
                current_color = color_index
                current_count = 1

        # 记录最后一组颜色块
        if current_color is not None:
            row.append([current_color, current_count])
        compressed_matrix.append(row)

    # 将颜色列表和压缩矩阵转换为JavaScript格式
    js_output = f"const colorList = {str(color_list).replace(" ", "")};\n"
    js_output += "const imgMatrix= ["
    for row in compressed_matrix:
        js_output += str(row).replace(" ", "") + ","
    js_output = js_output.rstrip(",") + "];"
    # js_output += "export { colorList, compressedMatrix };"

    return js_output

# 从命令行参数获取图片路径
if len(sys.argv) != 2:
    print("使用方法: python script.py <图片路径>")
    sys.exit(1)

image_path = sys.argv[1]

# 生成压缩后的JS内容
js_output = compress_image_to_js(image_path)

# 将内容保存为单独的JS文件
output_js_path = "imgMatrix.js"
with open(output_js_path, "w", encoding="utf-8") as f:
    f.write(js_output)

