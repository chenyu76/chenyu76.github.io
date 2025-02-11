#!/bin/bash

# 检查必要依赖
if ! command -v xelatex &> /dev/null; then
    echo "错误：未找到 xelatex，请安装 TeX Live 或相关套件" >&2
    exit 1
fi

if ! command -v inkscape &> /dev/null; then
    echo "错误：未找到 inkscape，请先安装 Inkscape" >&2
    exit 1
fi

# 创建临时目录
tempdir=$(mktemp -d)
trap 'rm -rf "$tempdir"' EXIT

# 从标准输入读取内容
input_content=$(cat)

# 生成LaTeX文档
tex_file="$tempdir/diagram.tex"
cat > "$tex_file" <<LATEX
\documentclass{standalone}
\usepackage{tikz}
\usepackage{xcolor}
\usetikzlibrary{arrows.meta}
\begin{document}
\begin{tikzpicture}
$input_content
\end{tikzpicture}
\end{document}
LATEX

# 编译LaTeX文档
if ! xelatex -interaction=nonstopmode -output-directory "$tempdir" "$tex_file" >/dev/null 2>&1; then
    echo "错误：LaTeX 编译失败，请检查 TikZ 代码" >&2
    exit 1
fi

# 验证PDF生成
pdf_file="$tempdir/diagram.pdf"
if [ ! -f "$pdf_file" ]; then
    echo "错误：未生成预期PDF文件" >&2
    exit 1
fi

# 转换为SVG格式
svg_file="$tempdir/diagram.svg"
if ! inkscape --export-type=svg --export-plain-svg="$svg_file" "$pdf_file" >/dev/null 2>&1; then
    echo "错误：PDF 转 SVG 转换失败" >&2
    exit 1
fi

# 输出SVG内容
cat "$svg_file"
