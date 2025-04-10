# 在LaTeX中添加参考文献

> BibTeX是一套用于管理文献、产生文献目录的格式。 使用上通常与LaTeX一起使用。(摘自[WikiPedia](https://zh.wikipedia.org/zh-cn/BibTeX))

有了BibTeX，我们可以方便的在一个文件中收集需要的文献，并在LaTeX文件中引用它。

## 创建包含参考文献条目 `.bib` 文件

首先，创建一个文件后缀为 `.bib` 的文件，包含参考文献条目。每个参考文献条目都需要遵循BibTeX格式，通常包括如作者、标题、出版年份等信息。

例如，在与`.tex`相同目录下创建一个 `references.bib` 文件，示例内容如下：

```bibtex
@book{latexguide,
  author    = {Leslie Lamport},
  title     = {LaTeX: A Document Preparation System},
  publisher = {Publisher},
  year      = {2077},
  edition   = {2nd},
}

@misc{citename, 
  author  = {chenyu76},
  title   = {Add citation in LaTeX},
  year    = {2025}
}

…… 
可以添加更多条目，
只有在正文中使用\cite命令的条目
才会出现在最后编译好的文档中
```

每个@开头是一个条目，条目内部填入作者、标题等信息；这个示例中第一个条目中book是文档类型， 此外还有article, inproceedings, misc等；`latexguide`是引用时使用的名称，可以在之后使用类似的格式添加更多内容。推荐直接在[Google Scholar](https://scholar.google.com/)或其他文献网站上复制，不要手写；也可以让ai生成，但注意核对信息。

![Google Scholar 示例](./assets/google_scholar.png)

## 引用参考文献
在 LaTeX 文件中，使用 `\cite{}` 命令引用参考文献。例如：

```latex
This is a reference to the LaTeX guide \cite{latexguide}.
```

这里的`latexguide`是上面的例子中定义的名称。

## 插入参考文献列表

在文档任意位置插入使用的参考文献列表。只有使用了`\cite{}`命令插入的文献才会出现。

使用 `\bibliographystyle{}` 命令指定参考文献的格式，并使用 `\bibliography{}` 命令指定 `.bib` 文件的路径。在编译好的文档中，参考文献列表会出现在`\bibliography{}`命令调用处。

```latex
\bibliographystyle{plain}  % 参考文献的样式
\bibliography{references.bib}  % 引用.bib文件
```

### Tips

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
2. 可以通过使用`hyperref`宏包使引用标签可点击

```latex
\usepackage{hyperref}
```

## 完整示例


```latex
\documentclass{article}

\begin{document}

This is a reference to the LaTeX guide \cite{latexguide}.

\bibliographystyle{plain}  % 选择参考文献的格式
\bibliography{references.bib}  % 引用.bib文件

\end{document}
```

你可以在[这里](./Add-citation-in-LaTeX.zip)下载这个示例。

##  编译流程

在 LaTeX 中正确处理参考文献需要多次编译。如果你使用overleaf等在线平台，他们应该会自动帮你处理好编译流程，不用操心，否则：

### 如果没有编译过：

(如果使用XeLaTeX)

1. 使用 `xelatex` 编译 LaTeX 文件，生成需要的文献列表（.aux 文件）
2. 使用 `bibtex` 编译参考文献。
3. 再次使用 `xelatex` 编译两次，第一次会生成参考文献，第二次确保参考文献引用和引用列表正确生成。

如果使用命令行:
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
即可

## 参考文献样式

 LaTeX 支持多种参考文献样式（如 `plain`, `unsrt`, `alpha`, `ieeetr` 等）：

在完整示例中修改

```
\bibliographystyle{plain}  % 修改这里的plain
```
可以根据需要选择不同的样式。

2025/02/20
