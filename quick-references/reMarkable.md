# reMarkable 各种折腾的备忘录

## 中文字体

似乎下面的内容多余了，[参考](https://remarkable.jms1.info/info/fonts.html)，只需要把字体放在`/home/root/.local/share/fonts/`

Any time you add, remove, or update font files, you need to rebuild the font cache files.

```bash
fc-cache -fv
```

---

字体已经放在了`/usr/share/font/ttf`中，所以只需要使用SSH连接上再软连接上字体即可

```bash
ssh root@10.11.99.1
# In Remarkable
ln -s /home/root/fonts /usr/share/fonts/ttf
```

更新后可能会报

```
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
```

需要把

`~/.ssh/known_hosts` 下的10.11.99.1 的信任删除

root 密码在 Settings > Help > Copyrights and licenses 中

## 休眠壁纸

壁纸位置

```bash
# sleep
/usr/share/remarkable/suspended.png
# light sleep
/usr/share/remarkable/sleep.png
# power off
/usr/share/remarkable/poweroff.png
```

使用scp复制过去

```
scp './suspended.png' root@10.11.99.1:/usr/share/remarkable/suspended.png
```

壁纸尺寸 1872x1404

## 可能有用的链接

[reMarkable Guide](https://remarkable.guide)

[Reenable Toltec After A System Upgrade](https://remarkable.guide/guide/software/toltec.html#toltec-reenable)

[Toltec](https://toltec-dev.org/)

### Toltec

```
WARN:  Please restart your SSH session or run 'exec bash --login' to use Toltec
Your Opkg configuration has been upgraded
INFO:  After each system upgrade, run 'toltecctl reenable' to re-enable Toltec


Run the following command(s) to use koreader as your launcher
launcherctl switch-launcher --start koreader

Run the following command(s) to use oxide as your launcher
launcherctl switch-launcher --start oxide

Configuring oxide-utils.


Run the following command(s) to use remux as your launcher
launcherctl switch-launcher --start remux
```

## 屏幕尺寸

```
1404x1872     pixels
157.2x209.6   mm
```

## 传输大于100M的文件

使用脚本`pdf2remarkable.sh`，来自[adaerr](https://github.com/adaerr/reMarkableScripts/blob/master/pdf2remarkable.sh)

说明见[这里](https://www.informaticar.net/how-to-transfer-files-to-remarkable-paper-pro-without-cloud/)

## 关于USB connection

主流浏览器似乎会默认阻止不安全的http连接，所以我只能用[Eolie](https://wiki.gnome.org/Apps/Eolie)连上
