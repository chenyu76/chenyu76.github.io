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

重启后去gnome系统设置里配置键盘即可。

[rime设置为默认简体](https://miaostay.com/2018/11/rime%E8%AE%BE%E7%BD%AE%E4%B8%BA%E9%BB%98%E8%AE%A4%E7%AE%80%E4%BD%93/)

修改`~/.config/ibus/rime/build/`下的配置文件

```
  - name: simplification
    reset: 1
    states: ["漢字", "汉字"]
```

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

Mathematica为树莓派提供了一个[免费非商用版本](https://archive.raspberrypi.org/debian/pool/main/w/wolfram-engine/)。因为树莓派是arm的，所以这个deb包实际可以运行在其他linux arm机器中。your-diary 编写了一个[安装脚本](https://github.com/your-diary/Install-Wolfram-Engine-on-Arch-Linux-ARM)，虽然好像年久失修，我无法运行，但是可以手动按其中的步骤安装，大体就只是

1. 下载deb包
2. 解压deb包得到里面的data
3. 将里面的文件复制到`/opt`下
4. 创建符号链接到`/usr/bin`

这个软件包自带给树莓派的授权，所以其他linux机器会导致鉴权失败无法启动，因此需要手动把Licensing文件夹删除。其位于

```
/opt/Wolfram/WolframEngine/{version}/Configuration/
```

下。然后自行激活。(可以参考 https://tiebamma.github.io/InstallTutorial/ )

然后一个方便的desktop文件自然是极好的：

```toml
[Desktop Entry]
Version=1.0
Type=Application
Name=Mathematica
Comment=Wolfram Mathematica Computational System
Exec=/opt/Wolfram/WolframEngine/14.3/Executables/Mathematica %F
Icon=/path/to/icon
Terminal=false
Categories=Education;Science;Math;
Keywords=mathematica;math;wolfram;calculation;
MimeType=application/mathematica;application/x-mathematica;
StartupNotify=true
```

命名为`Mathematica.desktop`然后放到`/usr/share/applications`中。

### 让触控笔防误触

使用触控笔时gnome不会阻止手继续戳屏幕，所以可以编写一个脚本让检测到笔悬浮时禁用触摸屏。


脚本有依赖：
```bash
sudo pacman -S python-evdev
```

```python
#!/usr/bin/env python3
import evdev
import threading
import sys
import time
import os
from select import select

# ================= 配置 =================
# 抬笔后延迟多久恢复触控 (秒)
RESTORE_DELAY = 3
# =======================================

touch_device = None
stylus_device = None
restore_timer = None
is_grabbed = False

def find_devices():
    """自动查找触控屏和手写笔"""
    devices = [evdev.InputDevice(path) for path in evdev.list_devices()]
    t_dev = None
    s_dev = None

    for dev in devices:
        # 根据名字匹配设备，忽略大小写
        name = dev.name.lower()
        if "touchscreen" in name:
            t_dev = dev
        elif "stylus" in name:
            s_dev = dev
    
    return t_dev, s_dev

def enable_touch():
    global is_grabbed
    if not is_grabbed or touch_device is None:
        return
    
    try:
        # 解除独占，恢复触控
        touch_device.ungrab()
        is_grabbed = False
        print("✅ 触控屏已恢复")
    except Exception as e:
        print(f"Error ungrabbing: {e}")

def disable_touch():
    global is_grabbed, restore_timer
    
    # 如果有恢复计时器在跑，取消它
    if restore_timer:
        restore_timer.cancel()

    if is_grabbed:
        return

    try:
        if touch_device:
            # 独占设备，屏蔽触控
            touch_device.grab()
            is_grabbed = True
            print("🚫 触控屏已禁用 (笔进入范围)")
    except Exception as e:
        # 设备可能被拔出或正被其他程序独占
        print(f"Error grabbing: {e}")

def schedule_restore():
    global restore_timer
    if restore_timer:
        restore_timer.cancel()
    # 启动定时器
    restore_timer = threading.Timer(RESTORE_DELAY, enable_touch)
    restore_timer.start()

def main():
    global touch_device, stylus_device

    # 必须以 root 运行
    if os.geteuid() != 0:
        print("错误: 请使用 sudo 运行此脚本")
        sys.exit(1)

    print("正在搜索设备...")
    touch_device, stylus_device = find_devices()

    if not touch_device:
        print("❌ 找不到触控屏 (Touchscreen)")
        sys.exit(1)
    if not stylus_device:
        print("❌ 找不到手写笔 (Stylus)")
        sys.exit(1)

    print(f"Found Touchscreen: {touch_device.name} ({touch_device.path})")
    print(f"Found Stylus:      {stylus_device.name} ({stylus_device.path})")
    print("\n服务已启动，按 Ctrl+C 退出...")

    # 循环监听手写笔事件
    try:
        # select() 允许我们阻塞等待，直到有事件发生，不占用 CPU
        while True:
            r, w, x = select([stylus_device.fd], [], [])
            for fd in r:
                for event in stylus_device.read():
                    # BTN_TOOL_PEN (code 320) 是标准的笔接近信号
                    # value 1 = 进入感应区, value 0 = 离开感应区
                    if event.type == evdev.ecodes.EV_KEY and event.code == evdev.ecodes.BTN_TOOL_PEN:
                        if event.value == 1:
                            disable_touch()
                        elif event.value == 0:
                            schedule_restore()
                            
    except KeyboardInterrupt:
        print("\nStopping...")
        if is_grabbed:
            enable_touch()
    except OSError as e:
        print(f"\n设备连接丢失: {e}")

if __name__ == "__main__":
    main()
```

配套的systemd控制文件：

```toml
[Unit]
Description=Auto Disable Touchscreen on Stylus Proximity
After=multi-user.target

[Service]
Type=simple
ExecStart=/usr/bin/python /path/to/palm_rejection.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

将service文件放到 `/etc/systemd/system/palm_rejection.service` 。 
然后启用它：`sudo systemctl enable --now palm_rejection.service`


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
