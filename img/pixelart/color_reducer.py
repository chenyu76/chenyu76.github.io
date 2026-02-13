import argparse

import numpy as np
from PIL import Image, ImageFilter
from sklearn.cluster import KMeans


def reduce_colors(input_path, output_path, num_colors, mode="hsv", smooth=0):
    """
    减少图片颜色数量并进行平滑处理

    :param input_path: 输入文件路径
    :param output_path: 输出文件路径
    :param num_colors: 目标颜色数量
    :param mode: 颜色模式 'rgb' 或 'hsv'
    :param smooth: 平滑窗口大小 (0表示不平滑，建议3或5)
    """
    img = Image.open(input_path)
    original_mode = img.mode

    if original_mode != "RGBA":
        img = img.convert("RGBA")

    # 分离通道
    r, g, b, alpha = img.split()
    rgb_img = Image.merge("RGB", (r, g, b))

    # 颜色空间转换
    process_mode = mode.upper()
    if process_mode == "HSV":
        work_img = rgb_img.convert("HSV")
    else:
        work_img = rgb_img

    pixels = np.array(work_img)
    height, width = pixels.shape[:2]
    color_data = pixels.reshape(-1, 3)

    # K-Means聚类
    kmeans = KMeans(n_clusters=num_colors, random_state=0, n_init=10)
    kmeans.fit(color_data)

    # 获取原始标签矩阵
    labels = kmeans.labels_.reshape(height, width)

    # --- 核心修改：对标签进行平滑处理 ---
    if smooth > 0:
        # 将标签转为图像以便使用PIL的滤波器
        # 标签范围是0 ~ num_colors-1，可以直接存为L模式(8-bit)
        label_img = Image.fromarray(labels.astype(np.uint8), mode="L")

        # 使用 ModeFilter (众数滤波)
        # 它会将像素替换为邻域内出现频率最高的标签，非常适合去除噪点且不引入新颜色
        label_img = label_img.filter(ImageFilter.ModeFilter(size=smooth))

        # 转回numpy数组
        labels = np.array(label_img)
    # ---------------------------------

    # 根据（可能平滑过的）标签重构图像
    # labels.flatten() 将二维标签展平以索引 cluster_centers_
    new_colors = kmeans.cluster_centers_[labels.flatten()]
    new_colors = new_colors.reshape(pixels.shape).astype(np.uint8)

    # 重建图像
    output_img_no_alpha = Image.fromarray(new_colors, mode=process_mode)

    if process_mode == "HSV":
        output_img_no_alpha = output_img_no_alpha.convert("RGB")

    # 合并Alpha通道
    r_new, g_new, b_new = output_img_no_alpha.split()
    if "A" in original_mode:
        final_output = Image.merge("RGBA", (r_new, g_new, b_new, alpha))
    else:
        final_output = Image.merge("RGB", (r_new, g_new, b_new))

    final_output.save(output_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="图片颜色聚类工具")
    parser.add_argument("input", help="输入图片路径")
    parser.add_argument("-o", "--output", help="输出图片路径")
    parser.add_argument(
        "-n", "--num-colors", type=int, required=True, help="目标颜色数量（2-256）"
    )
    parser.add_argument(
        "-m",
        "--mode",
        choices=["rgb", "hsv"],
        default="hsv",
        help="颜色聚类模式：rgb 或 hsv (默认: hsv)",
    )
    parser.add_argument('-s', '--smooth', type=int, default=0,
                       help='平滑窗口大小，推荐3或5，0为不平滑 (默认: 0)')

    args = parser.parse_args()

    if args.output is None:
        from pathlib import Path

        smooth_str = ''
        if args.smooth is not None:
            smooth_str = f"_smooth_{args.smooth}"


        input_path = Path(args.input)
        # 在文件名末尾添加 color_num_{颜色数量}_{模式}
        new_filename = f"{input_path.stem}_color_num_{args.num_colors}_{args.mode}{smooth_str}{input_path.suffix}"
        args.output = str(input_path.parent / new_filename)

    if not 2 <= args.num_colors <= 256:
        raise ValueError("颜色数量必须在2到256之间")

    reduce_colors(args.input, args.output, args.num_colors, args.mode, args.smooth)
