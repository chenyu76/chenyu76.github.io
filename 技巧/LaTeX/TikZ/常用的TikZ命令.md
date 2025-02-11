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
```

<svg
   version="1.1"
   id="svg1"
   width="227.30667"
   height="76.120003"
   viewBox="0 0 227.30667 76.120003"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:svg="http://www.w3.org/2000/svg">
  <defs
     id="defs1" />
  <g
     id="g1">
    <path
       id="path1"
       d="M 0,0 C 56.69362,56.69362 113.38724,56.69362 170.08086,0"
       style="fill:none;stroke:#000000;stroke-width:0.3985;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:10;stroke-dasharray:none;stroke-opacity:1"
       transform="matrix(1.3333333,0,0,-1.3333333,0.26533333,75.854667)" />
  </g>
</svg>

```LaTeX
% 画一个从0到90度的圆弧
\draw (0, 0) arc[start angle=0, end angle=90, radius=2cm];
% 画一个红色的、弯曲的、带一个X的 ⇒ ，需要 \usetikzlibrary{arrows.meta}
\draw[-Implies, double, double distance = 0.5ex, red, out=30] (2em,1em) to [pos=0.5] node {\color{red} \huge $\times$} (12em, 0em); 
```

<svg
   version="1.1"
   id="svg1"
   width="136.75999"
   height="45.853333"
   viewBox="0 0 136.75999 45.853333"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:svg="http://www.w3.org/2000/svg">
  <defs
     id="defs1" />
  <g
     id="g1">
    <path
       id="path1"
       d="m 19.92554,9.96277 c 33.9107,19.57831 71.93974,17.72516 97.63289,-7.96799"
       style="fill:none;stroke:#ff0000;stroke-width:2.94397;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:10;stroke-dasharray:none;stroke-opacity:1"
       transform="matrix(1.3333333,0,0,-1.3333333,-24.604,43.890667)" />
    <path
       id="path2"
       d="m 19.92554,9.96277 c 33.9107,19.57831 71.93974,17.72516 97.63289,-7.96799"
       style="fill:none;stroke:#ffffff;stroke-width:2.14697;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:10;stroke-dasharray:none;stroke-opacity:1"
       transform="matrix(1.3333333,0,0,-1.3333333,-24.604,43.890667)" />
    <path
       id="path3"
       d="M -1.70543,3.3727 C -0.87816,1.5909 1.34908,0.06363 2.6218,0 1.34908,-0.06363 -0.87816,-1.5909 -1.70543,-3.3727"
       style="fill:none;stroke:#ff0000;stroke-width:0.3985;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:none;stroke-opacity:1"
       transform="matrix(0.9428,0.9428,0.9428,-0.9428,132.14057,41.23096)" />
    <path
       id="path4"
       d="M 8.0380703,-5.7412578 3.9013516,-9.8545391 c -0.2460938,-0.2460939 -0.28125,-0.2929689 -0.4570313,-0.2929689 -0.1992187,0 -0.4101562,0.1875002 -0.4101562,0.4218752 0,0.140625 0.046875,0.1757812 0.2695312,0.4101562 l 4.1367188,4.1484375 -4.1367188,4.1601563 c -0.2226562,0.22265624 -0.2695312,0.26953124 -0.2695312,0.41015624 0,0.22265625 0.2109375,0.41015625 0.4101562,0.41015625 0.1757813,0 0.2109375,-0.0351563 0.4570313,-0.29296875 l 4.1132812,-4.10156254 4.2773442,4.27734379 c 0.04687,0.0117188 0.1875,0.1171875 0.304687,0.1171875 0.257813,0 0.421875,-0.1875 0.421875,-0.41015625 0,-0.046875 0,-0.12890625 -0.07031,-0.234375 -0.01172,-0.0351563 -3.3046879,-3.28125004 -4.3359379,-4.33593754 l 3.7851559,-3.7734375 c 0.105469,-0.1289062 0.410157,-0.3984375 0.515625,-0.515625 0.02344,-0.046875 0.105469,-0.1289062 0.105469,-0.2695312 0,-0.234375 -0.164062,-0.4218752 -0.421875,-0.4218752 -0.164062,0 -0.246094,0.08203 -0.46875,0.3164064 z m 0,0"
       style="fill:#ff0000;fill-opacity:1;fill-rule:nonzero;stroke:none"
       aria-label="×"
       transform="matrix(1.3333333,0,0,1.3333333,60.778667,20.502667)" />
  </g>
</svg>


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
\node[below left] at (0,0) {$O$};
```

### 1. `anchor`
- **作用**：控制节点的对齐方式，定义节点的**固定部分**。
- **常见选项**：`north`、`south`、`east`、`west`、`center` 等。
- **用法**：通过设置 `anchor` 来指定节点相对于给定位置的对齐方式。例如，`anchor=north` 会将节点的顶部与指定位置对齐，`anchor=south` 会将底部对齐。

### 2. `below`、`above`、`left`、`right`
- **作用**：控制节点相对于另一个节点或坐标的**相对位置**，简化节点的布局。
- **常见用法**：例如，`below=1cm of A` 表示节点位于节点 A 下方 1cm，`right=2cm of A` 表示节点位于节点 A 右侧 2cm。
- **用法**：这类关键字通过简单的相对偏移来布局节点，通常与 `of` 搭配使用。


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
\begin{tikzpicture}[line width=1mm, draw=red]  
    % 设置全局线条粗细为 1mm, 红色
    ...
\end{tikzpicture}
```


