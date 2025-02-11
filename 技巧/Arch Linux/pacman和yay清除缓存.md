# pacman和yay清除缓存

储存空间不够可以清理pacman软件包缓存，很久不清就会有几十个G.

## [paccache](https://man.archlinux.org/man/paccache.8)

paccache removes old packages from the pacman cache directory. By default the last three versions of a package are kept.

```bash
# 仅包含最近的三个版本
paccache -r
# 仅包含最近的1个版本
paccache -rk1
```

## 使用 pacman 

```bash
# 清理未安装软件包
pacman -Sc
# 清理缓存中所有内容
pacman -Scc
```

## 使用yay

yay的缓存在`~/.cache/yay`，清理方法类似pacman：

```bash
# 清理未安装软件包
yay -Sc
# 清理缓存中所有内容
yay -Scc
```

See also:

[pacman - ArchWiki](https://wiki.archlinux.org/title/Pacman)
