# 在LaTeX中添加参考文献

## 创建 `.bib` 文件
首先，创建一个 `.bib` 文件，包含你的参考文献条目。每个参考文献条目都遵循BibTeX格式，通常包括如作者、标题、出版年份等信息。

例如，在与`.tex`相同目录下创建一个 `references.bib` 文件，内容如下：

```bibtex
@book{latexguide,
  author    = {Leslie Lamport},
  title     = {$\LaTeX$: A Document Preparation System},
  publisher = {Publisher},
  year      = {2077},
  edition   = {2nd},
}

% 每个@开头是一个条目，这个条目中book是文档类型，
% 此外还有article, inproceedings等
% 可以在之后使用类似的格式添加更多内容，
% 推荐直接在Google Scholar或其他网站上复制，不要手写
```

## 引用参考文献
在 $\LaTeX$ 文件中，使用 `\cite{}` 命令引用参考文献。例如：

```latex
This is a reference to the $\LaTeX$ guide \cite{latexguide}.
```

## 插入参考文献列表
在文档的末尾插入参考文献列表。使用 `\bibliographystyle{}` 命令指定参考文献的格式，并使用 `\bibliography{}` 命令指定 `.bib` 文件的位置。

```latex
\bibliographystyle{plain}  % 参考文献的样式
\bibliography{references}  % 引用.bib文件（.bib后缀被省略）
```

### Tip

1. 如果在beamer中使用，可以添加 allowframebreaks 参数使文献列表自动换页

```latex
\begin{frame}[allowframebreaks]{References}
	\bibliographystyle{plain}
	\bibliography{references}
\end{frame}
```
文献列表编号（而不是图标）
```
\setbeamertemplate{bibliography item}{\insertbiblabel}
```
2. 使用`hyperref`宏包使引用标签可点击

## 完整示例

一个完整的例子，展示如何在 $\LaTeX$ 中添加参考文献：

```latex
\documentclass{article}

\begin{document}

\section{Introduction}
This is a reference to the $\LaTeX$ guide \cite{latexguide}.

\bibliographystyle{plain}  % 选择参考文献的格式
\bibliography{references}  % 引用.bib文件

\end{document}
```

##  编译流程

在 $\LaTeX$ 中正确处理参考文献需要多次编译。

### 如果没有编译过：

(如果使用XeLaTeX)

1. 使用 `xelatex` 编译 $\LaTeX$ 文件，生成需要的文献列表（.aux 文件）
2. 使用 `bibtex` 编译参考文献。
3. 再次使用 `xelatex` 编译两次，第一次会生成参考文献，第二次确保参考文献引用和引用列表正确生成。

在命令行中:
```bash
xelatex yourfile.tex
bibtex yourfile.aux
xelatex yourfile.tex
xelatex yourfile.tex
```

### 如果编译过了

只需要在参考文献有更新时运行

```bash
bibtex yourfile.aux
```

## 参考文献样式

 $\LaTeX$ 支持多种参考文献样式（如 `plain`, `unsrt`, `alpha`, `ieeetr` 等）。你可以根据需要选择不同的样式。

2025/03/07
