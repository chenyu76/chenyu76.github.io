# autorun.sh 配置

```bash
sudo -i
mount -t ext2 /dev/mmcblk0p5 /tmp/config
vim /tmp/config/autorun.sh
```

修改后保存退出

```bash
chmod +x /tmp/config/autorun.sh
umount /tmp/config
exit
```
