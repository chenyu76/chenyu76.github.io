# Neovide 标题栏中文不显示

在当前 GNOME Wayland 环境中，Neovide 标题栏读取独立的标题字体设置且不会fallback。标题字体默认为 `Adwaita Sans Bold 11`，不包含中文字形。

只需要将标题字体设为 Noto CJK（需要`noto-fonts`包）或者别有中文字形的字体：

```bash
gsettings set org.gnome.desktop.wm.preferences titlebar-font 'Noto Sans CJK SC Bold 11'
```

如需恢复原设置：

```bash
gsettings set org.gnome.desktop.wm.preferences titlebar-font 'Adwaita Sans Bold 11'
```

2026/10/28
