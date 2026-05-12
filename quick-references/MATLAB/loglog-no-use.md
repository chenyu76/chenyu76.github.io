# MATLAB 调用 loglog 函数绘图但图像却没有使用对数坐标轴

可能是`figure`和`hold on`的原因。

## 错误范例：

```matlab
x = [1 2 3 4];
y = [2 4 8 16];
z = [1 3 5 7];

figure;
hold on
loglog(x, y);
loglog(x, z);
```

输出

<img src="./assets/matlab_loglog_fail.svg" />

## 正确范例：

注意`hold on`的位置：

```matlab
x = [1 2 3 4];
y = [2 4 8 16];
z = [1 3 5 7];

figure;
loglog(x, y);
hold on
loglog(x, z);
```

输出

<img src="./assets/matlab_loglog_success.svg" />

## 为什么？

`hold on` 会固定当前坐标轴属性，包括 XScale 和 YScale，所以要么先 `loglog` 再 `hold on`，要么就再重新设置 XScale 和 YScale。

```matlab
hold on
loglog(x, y)
set(gca, 'XScale', 'log', 'YScale', 'log')
```

