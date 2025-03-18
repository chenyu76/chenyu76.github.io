# LaTeX 表格速查

## 基本设置

```latex
\usepackage{booktabs}   % 三线表
\usepackage{multirow}   % 合并多行
\usepackage{makecell}   % 单元格内换行
```

## 基础表格加边框

```latex
\begin{tabular}{|l|c|r|}
  \hline
  Header1 & Header2 & Header3 \\
  \hline
  Left    & Center  & Right   \\
  \hline\hline
  Text    & 42      & Text    \\
  \hline
\end{tabular}
```

**说明**：`|` 定义列边框，`\hline` 添加水平线，`\hline\hline` 创建双横线

---

## `booktabs` 三线表

```latex
\begin{tabular}{llr}
  \toprule
  \textbf{Item} & \textbf{Category} & \textbf{Price} \\
  \midrule
  Apple  & Fruit  & 1.50 \\
  Bread  & Bakery & 3.20 \\
  \bottomrule
\end{tabular}
```

**特点**：

- `\toprule`/`\midrule`/`\bottomrule` 创建专业间距
- 无竖线，更简洁的学术风格


### `booktabs` 的 `\cmidrule` 高级用法

```latex
\begin{tabular}{ccccc}
  \toprule
  & \multicolumn{4}{c}{\textbf{带修剪的跨列横线}} \\
  \cmidrule(r{4pt}){2-4}    % 右侧留4pt空白
  \cmidrule(l{0.5em}){5-5} % 左侧留0.5em空白
  A & B & C & D & E \\
  \midrule
  ...
\end{tabular}
```

**参数解析**：

- `(r{长度})` / `(l{长度})`：在横线右/左侧添加指定长度的空白
- `(lr{长度})`：两侧同时修剪
- 常用于避免合并标题的横线与其他列线接触


## 单元格多行内容

```latex
% 方法1：makecell宏包
\begin{tabular}{|l|l|}
  \hline
  \makecell{Multi-line \\ content} & 自动换行 \\
  \hline
\end{tabular}

% 方法2：shortstack
\begin{tabular}{|l|l|}
  \hline
  \shortstack{Alternative \\ method} & 内容 \\
  \hline
\end{tabular}
```

---

## 合并单元格

### 横向合并 (multicolumn)

```latex
\begin{tabular}{|l|l|l|}
  \hline
  \multicolumn{2}{|c|}{合并2列} & 单独列 \\
  \hline
  Col1 & Col2 & Col3 \\
  \hline
\end{tabular}
```

### 纵向合并 (multirow)

```latex
\begin{tabular}{|l|l|}
  \hline
  \multirow{2}{*}{合并2行} & 行1-列2 \\
                          & 行2-列2 \\
  \hline
\end{tabular}
```

### 组合合并

```latex
\begin{tabular}{|c|c|c|}
  \hline
  \multirow{2}{*}{合并2行} & \multicolumn{2}{c|}{合并2列} \\
  \cline{2-3}             & 子列1 & 子列2 \\
  \hline
  Data1 & Data2 & Data3 \\
  \hline
\end{tabular}
```

## 最佳实践

1.  使用 `\addlinespace` 代替 `\hline` 增加行间距
2.  复杂表格推荐 `tabularx` 自动调整列宽
3.  用`table`环境配合`\caption{}` 和 `\label{}` 添加标题与引用
4.  合并时注意列数匹配（`\multicolumn{2}`需占用2列位置）

## 对齐方式

| 符号  | 说明             | 示例                 |
| ----- | ---------------- | -------------------- |
| `l`   | 左对齐           | `\begin{tabular}{l}` |
| `c`   | 居中对齐         | `\begin{tabular}{c}` |
| `r`   | 右对齐           | `\begin{tabular}{r}` |
| `p{}` | 固定宽度自动换行 | `p{3cm}`             |

## `table` 环境

```latex
\begin{table}[htbp]
  \centering                % 表格居中
  \caption{表格标题}          % 添加标题
  \label{tab:example}       % 添加引用标签
  \begin{tabular}{ccc}      % 表格内容
    ...
  \end{tabular}
\end{table}
```

**核心功能**：

- 浮动体环境，LaTeX 自动优化表格位置（`[htbp]`参数控制优先级）
  - 使用`float`宏包的`[H]`选项强制控制表格位置在原地
- 必须配合 `\caption` 生成带编号的表格标题
- 通过 `\label` 实现交叉引用



## `tabularx` 智能表格

```latex
\usepackage{tabularx}

\begin{tabularx}{\textwidth}{>{\raggedright}X X >{\centering}X}
  自动换行长文本 & 常规内容 & 居中对齐列 \\
  This column will wrap text automatically & Short text & Centered data \\
\end{tabularx}
```

**核心特性**：

- 必须指定表格总宽度（如 `\textwidth`）
- 使用 `X` 列格式自动计算列宽
- 支持列格式修饰符：  
  `>{\raggedright}` 左对齐 | `>{\centering}` 居中 | `>{\raggedleft}` 右对齐

---

## 全局增大表格行距

### 方法1：调整行高系数

```latex
\renewcommand{\arraystretch}{1.5} % 默认1.0，1.5为1.5倍行距
\begin{tabular}{ccc}
  ...
\end{tabular}
```

### 方法2：`makecell` 宏包

```latex
\usepackage{makecell}
\setcellgapes{4pt}   % 设置单元格间距
\makegapedcells      % 应用间距设置
\begin{tabular}{ccc}
  ...
\end{tabular}
```

### 方法3：`setspace` 宏包（影响整个文档）

```latex
\usepackage{setspace}
\onehalfspacing      % 1.5倍行距
\doublespacing       % 2倍行距
```
