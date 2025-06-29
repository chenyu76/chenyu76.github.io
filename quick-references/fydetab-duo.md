# Fydetab Duo 折腾

买了一台 Fydetab Duo 折腾，配到哪写到哪，完全没有逻辑

## Android

如果能从sd卡启动android就好了

旋转屏幕可以使用[Rotation](https://play.google.com/store/apps/details?id=com.pranavpandey.rotation)

## ArchLinux

关闭屏幕再打开后触控会失效，不知道如何解决

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

2025/06/24
