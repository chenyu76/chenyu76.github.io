from PIL import Image
import numpy as np
from sklearn.cluster import KMeans

def reduce_colors(input_path, output_path, num_colors):
    """
    减少图片颜色数量
    
    :param input_path: 输入文件路径
    :param output_path: 输出文件路径
    :param num_colors: 目标颜色数量
    """
    # 打开图片并保留原始模式（RGB/RGBA）
    img = Image.open(input_path)
    original_mode = img.mode
    has_alpha = 'A' in original_mode
    
    # 转换到RGB/RGBA并提取像素数据
    if original_mode not in ('RGB', 'RGBA'):
        img = img.convert('RGBA' if has_alpha else 'RGB')
    
    pixels = np.array(img)
    height, width = img.size[1], img.size[0]
    
    # 分离颜色通道和透明度通道
    if has_alpha:
        alpha_channel = pixels[:, :, 3]
        color_pixels = pixels[:, :, :3]
    else:
        color_pixels = pixels
    
    # 准备K-Means输入数据
    color_data = color_pixels.reshape(-1, 3)
    
    # 执行K-Means聚类
    kmeans = KMeans(n_clusters=num_colors, random_state=0, n_init=10)
    kmeans.fit(color_data)
    
    # 生成新颜色数据
    new_colors = kmeans.cluster_centers_[kmeans.labels_]
    new_colors = new_colors.reshape(color_pixels.shape).astype(np.uint8)
    
    # 合并透明度通道
    if has_alpha:
        output_pixels = np.dstack((new_colors, alpha_channel))
    else:
        output_pixels = new_colors
    
    # 创建并保存图片
    output_img = Image.fromarray(output_pixels, mode=original_mode)
    output_img.save(output_path)

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='图片颜色量化工具')
    parser.add_argument('input', help='输入图片路径')
    parser.add_argument('output', help='输出图片路径')
    parser.add_argument('-n', '--num-colors', type=int, required=True,
                       help='目标颜色数量（2-256）')
    
    args = parser.parse_args()
    
    if not 2 <= args.num_colors <= 256:
        raise ValueError("颜色数量必须在2到256之间")
    
    reduce_colors(args.input, args.output, args.num_colors)
