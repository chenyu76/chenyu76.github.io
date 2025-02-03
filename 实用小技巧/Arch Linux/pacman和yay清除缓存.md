# pacman和yay清除缓存

存储不够可以清理pacman软件包缓存。

```
# 仅包含最近的三个版本
paccache -r
# 仅包含最近的1个版本
paccache -rk1
# 清理未安装软件包
pacman -Sc
# 清理缓存中所有内容
pacman -Scc
```

yay的缓存在~/.cache/yay，清理缓存的方法类似pacman：

```
# 清理未安装软件包
yay -Sc
# 清理缓存中所有内容
yay -Scc
```

See also:

[pacman - ArchWiki](https://wiki.archlinux.org/title/Pacman)
