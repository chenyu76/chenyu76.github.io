# 一个选项可点击的godot幸运转盘

[仓库地址](https://github.com/chenyu76/wheelOfFortune)

通过文件保存转盘上的可选项，默认读取当前目录下.md文件，如果没有会弹出文件选择框。

转盘上的按钮可点击显示不同的自定义内容。

## 转盘选项规范：

有两种写法：

### 1

每行代表一个转盘选项，点击转盘选项没有有效内容。

### 2

每个 `# ` 开头的此行内容代表一个转盘选项，其后直到下一个 `# ` 都被视为转盘选项的详情，可以通过点击转盘上该选项的文字查看。

# web version

似乎web版无法读取本地文件，但仍可以通过手动输入粘贴文件内容代替

[Start](https://chenyu76.github.io/program/WheelOfFortune/WheelOfFortune.html)
