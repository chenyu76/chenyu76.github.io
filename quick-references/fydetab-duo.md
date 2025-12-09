# Fydetab Duo 折腾

买了一台 Fydetab Duo 折腾，配到哪写到哪，完全没有逻辑。

## Android

如果能从sd卡启动android就好了

旋转屏幕可以使用[Rotation](https://play.google.com/store/apps/details?id=com.pranavpandey.rotation)

## ArchLinux

[Arch Linux](https://wiki.fydetabduo.com/Available-OS/ArchLinux/arch-intro)如wiki上写的开箱即用。

### 换源

[清华大学开源软件镜像站  Arch Linux ARM 软件仓库](https://mirrors.tuna.tsinghua.edu.cn/help/archlinuxarm/)

### 输入法

gnome使用[iBus](https://wiki.archlinux.org/title/IBus)

```bash
sudo pacman -S ibus-rime
```

重启后去系统设置里配置键盘即可。

### YAY

See [arch wiki yay](https://wiki.archlinuxcn.org/zh-cn/Yay)

### 中文字体

刚安装好时缺字体，从[这里](https://arch.icekylin.online/guide/rookie/desktop-env-and-app.html)抄一份字体清单。

```bash
sudo pacman -S --needed adobe-source-han-serif-cn-fonts wqy-zenhei noto-fonts noto-fonts-cjk noto-fonts-emoji noto-fonts-extra
```

### 软件包

```bash
 sudo pacman -S --needed git firefox syncthing nvim vim neovim-qt wl-clipboard inkscape gimp fish ibus ibus-rime eog evince texlive texlive-lang
```

### Gnome 插件

安装

```bash
pacman -S gnome-browser-connector
```

在Firefox打开[Gnome Extensions](https://extensions.gnome.org/)，安装对应firefox插件。

- Screen Rotate
- TouchUp
- Caffine

### Mathematica ARM

[软件包下载](https://archive.raspberrypi.org/debian/pool/main/w/wolfram-engine/)

[安装脚本](https://github.com/your-diary/Install-Wolfram-Engine-on-Arch-Linux-ARM)

## Fyde OS

### Android 子系统

似乎在[`chrome://flags`](chrome://flags)里打开`Enable custom ARCVM memory size`可以优化某些占内存软件的体验

- 其下面的小猫猫代理可以系统范围的使用，包括Crostini
- 通过KDE connect 可以和电脑互联

### Crostini

- Syncthing 连不上局域网设备？我还是用Android上的Syncthing-fork吧
- 共享的文件夹在`/mnt/chromeos`下，通过`ln -s`可以方便的访问

#### Debian

包都太老了不好用

#### Archlinux

##### 安装

[安装A](https://gist.github.com/baldrailers/09ba52a17219ca1e8fbf233dc8a4b375/)

[安装B](https://wiki.archlinux.org/title/Chrome_OS_devices/Crostini)

注意需要好的互联网连接！

##### 中文输入法 Fcitx5

[Arch Wiki](https://wiki.archlinux.org/title/Fcitx)

似乎需要在`~/.sommelierrc`内设置
```
/usr/bin/fcitx-autostart
```
但我的`/usr/bin`下没看到`fcitx-autostart`

自动启动，并配置环境变量
```
GTK_IM_MODULE=fcitx
QT_IM_MODULE=fcitx
XMODIFIERS=@im=fcitx
```

安装好后可能没法通过快捷键开启，但可以通过`fcitx-remote`临时测试，再编辑配置文件设置好键位

GTK应用用不了输入法？为什么呢

2025/11/29