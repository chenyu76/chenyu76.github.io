# 一些常用的TikZ命令

## 零维形状

```LaTeX
% 绘制一个点，位置为 (2, 3)
\node at (2, 3) [circle, fill=black, inner sep=1pt] {}; 
\fill (2, 3) circle (2pt);
```

## 一维形状

```LaTeX
% 画一条从 (0,0) 到 (3,3) 的直线
\draw (0, 0) -- (3, 3);
% 画一个从 (0,0) 到 (3,0) 的箭头
\draw[->] (0, 0) -- (3, 0);
% 画一个双向箭头
\draw[<->] (0, 0) -- (3, 0);
% 画一条贝塞尔曲线
\draw (0, 0) .. controls (2, 2) and (4, 2) .. (6, 0);
% 画一个从0到90度的圆弧
\draw (0, 0) arc[start angle=0, end angle=90, radius=2cm];
% 画一个红色的、弯曲的、带一个X的 ⇒ ，需要 \usetikzlibrary{arrows.meta}
\draw[-Implies, double, double distance = 0.5ex, red, out=30] (2em,1em) to [pos=0.5] node {\color{red} \huge $\times$} (12em, 0em); 
```
## 二维形状

```LaTeX

% 画一个半径为2cm的圆
\draw (0, 0) circle (2cm);
% 画一个横向半径为3cm，纵向半径为1.5cm的椭圆
\draw (0, 0) ellipse (3cm and 1.5cm);
% 画一个边长为3cm的正方形
\draw (0, 0) rectangle (3cm, 3cm);
% 在坐标(0,0)处画一个节点
\node at (0, 0) {Hello, TikZ!};
% 画一个填充为红色的圆
\draw[fill=red] (0, 0) circle (2cm);
```

## node 定位

```LaTeX
\node[anchor=north] (A) at (0, 0) {Node A};  % Node A 的顶部对齐 (0,0)
\node[anchor=south] at (A.north) {Node B};   % Node B 的顶部对齐 Node A 的顶部
\node[below=1cm of A] {Node C};  % Node C 放在 Node A 下方 1cm
\node at (0, 0) {Node D};
```

在TikZ中，`anchor` 和 `below`、`above`、`left`、`right` 是两种常用的控制节点位置的方式，它们的作用和使用场景有所不同。

### 1. **`anchor`** 
- **作用**：控制节点的对齐方式，定义节点的**固定部分**。
- **常见选项**：`north`、`south`、`east`、`west`、`center` 等。
- **用法**：通过设置 `anchor` 来指定节点相对于给定位置的对齐方式。例如，`anchor=north` 会将节点的顶部与指定位置对齐，`anchor=south` 会将底部对齐。

### 2. **`below`、`above`、`left`、`right`**
- **作用**：控制节点相对于另一个节点或坐标的**相对位置**，简化节点的布局。
- **常见用法**：例如，`below=1cm of A` 表示节点位于节点 A 下方 1cm，`right=2cm of A` 表示节点位于节点 A 右侧 2cm。
- **用法**：这类关键字通过简单的相对偏移来布局节点，通常与 `of` 搭配使用。

### **总结**：
- **`anchor`** 是用来指定节点对齐部分的属性，它影响节点的位置定义。
- **`below`、`above`、`left`、`right`** 则是用来简化节点布局，通过相对位置指定节点放置的方向和距离。


## 缩放图形

```LaTeX
% 文字、线条的绝对大小、粗细不变
\begin{tikzpicture}[scale=1.5]
    ...
\end{tikzpicture}

% 线条的绝对粗细不变
% 文字的相对大小不变，绝对大小会变
\begin{tikzpicture}[scale=1.5, transform shape]
    ...
\end{tikzpicture}

% 文字、线条的相对大小、粗细不变，绝对大小、粗细会变
% 需要 \usepackage{graphicx}
\scalebox{1.5}{ % 缩放 1.5 倍
\begin{tikzpicture}
    ...
\end{tikzpicture}
}
```

## 全局线段粗细、颜色

```LaTeX
\begin{tikzpicture}[line width=1mm, draw=red]]  
    % 设置全局线条粗细为 1mm, 红色
    ...
\end{tikzpicture}
}
```
