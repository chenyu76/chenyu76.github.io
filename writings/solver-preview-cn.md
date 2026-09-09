# 一些有趣的优化算法预览

## 信赖域（Trust Region）

[信赖域](https://zh.wikipedia.org/wiki/%E7%BD%AE%E4%BF%A1%E5%9F%9F%E6%96%B9%E6%B3%95)方法是一类方法的统称。其核心思想是在当前点周围维护一个“模型值得信赖”的区域，并限制候选步长落在这个区域内。不同的信赖域算法可以使用不同类型的模型和求解方式。一般来说，算法会比较模型预测的改进与目标函数实际产生的改进，据此接受或拒绝候选步，并调整信赖域大小。本动画展示的是基于梯度使用局部二次模型的一种实现。

<div style="display: flex; justify-content: center; align-items: flex-start; gap: 30px; width: 100%; flex-wrap: nowrap;">
  <div style="flex: 0 0 70%; text-align: center;">
    <iframe src="assets/animations/solver-preview/trust-region.html"
            loading="lazy"
            title="Trust Region algorithm demo"
            style="width:100%; aspect-ratio:1/1; border:1px solid #d4dae2; border-radius:12px; background:#fff;"></iframe>
    <div>Trust Region</div>
  </div>
</div>

## 梯度下降（Gradient Descent, GD）

[梯度下降](https://en.wikipedia.org/wiki/Gradient_descent)在每一步计算整个目标函数的梯度，并沿负梯度方向移动。

<div style="display: flex; justify-content: center; align-items: flex-start; gap: 30px; width: 100%; flex-wrap: nowrap;">
  <div style="flex: 0 0 70%; text-align: center;">
    <iframe src="assets/animations/solver-preview/gradient-descent.html"
            loading="lazy"
            title="Gradient Descent algorithm demo"
            style="width:100%; aspect-ratio:1/1; border:1px solid #d4dae2; border-radius:12px; background:#fff;"></iframe>
    <div>Gradient Descent</div>
  </div>
</div>

## 随机梯度下降（Stochastic Gradient Descent, SGD）

[随机梯度下降](https://en.wikipedia.org/wiki/Stochastic_gradient_descent)可以看作梯度下降的随机近似，每一步只随机抽取一个样本或一个 mini-batch。这样做牺牲了一部分单步方向的准确性和收敛速度，却显著降低了每次迭代的计算量，尤其适合高维、大规模数据问题。

<div style="display: flex; justify-content: center; align-items: flex-start; gap: 30px; width: 100%; flex-wrap: nowrap;">
  <div style="flex: 0 0 70%; text-align: center;">
    <iframe src="assets/animations/solver-preview/stochastic-gradient-descent.html"
            loading="lazy"
            title="Stochastic Gradient Descent algorithm demo"
            style="width:100%; aspect-ratio:1/1; border:1px solid #d4dae2; border-radius:12px; background:#fff;"></iframe>
    <div>Stochastic Gradient Descent</div>
  </div>
</div>

## 直接搜索（Direct Search, DS）

[直接搜索](https://en.wikipedia.org/wiki/Pattern_search_%28optimization%29)不使用梯度。每一轮从当前点向几个预设方向探测目标函数值；本例使用上下左右四个坐标方向，并移动到其中最好的改进点。找到改进时放大统一的步长，找不到时缩小步长，因此在开阔区域移动较快、接近谷底时逐渐变得谨慎。

<div style="display: flex; justify-content: center; align-items: flex-start; gap: 30px; width: 100%; flex-wrap: nowrap;">
  <div style="flex: 0 0 70%; text-align: center;">
    <iframe src="assets/animations/solver-preview/direct-search.html"
            loading="lazy"
            title="Direct Search algorithm demo"
            style="width:100%; aspect-ratio:1/1; border:1px solid #d4dae2; border-radius:12px; background:#fff;"></iframe>
    <div>Direct Search</div>
  </div>
</div>

## BDS

[BDS](https://github.com/blockwise-direct-search/bds) 把变量分成若干块分别搜索，是直接搜索的一种分块版本。本例把两个坐标轴视为两个 block，交替沿一个坐标轴的正、负方向探测，并为每个方向维护独立的步长；某个方向找到改进时只放大自己的步长，失败时也只缩小自己的步长。这样，当目标函数在不同方向上的尺度差异很大时，算法可以分别适应，而不必让所有方向共用同一个步长。

<div style="display: flex; justify-content: center; align-items: flex-start; gap: 30px; width: 100%; flex-wrap: nowrap;">
  <div style="flex: 0 0 70%; text-align: center;">
    <iframe src="assets/animations/solver-preview/bds.html"
            loading="lazy"
            title="Blockwise Direct Search algorithm demo"
            style="width:100%; aspect-ratio:1/1; border:1px solid #d4dae2; border-radius:12px; background:#fff;"></iframe>
    <div>Blockwise Direct Search</div>
  </div>
</div>
