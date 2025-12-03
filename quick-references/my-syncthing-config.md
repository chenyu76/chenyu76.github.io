# 我的Syncthing 配置

系统：Arch Linux

## 基础安装

```bash
# 1. 安装本体
sudo pacman -S syncthing

# 2. 安装 Syncthing Tray
yay -S syncthingtray-qt6
```

## 启动核心服务

使用 `systemd --user` 模式，这样不需要 root 权限，且配置文件位于 Home 目录下，方便迁移。

```bash
# 启动并设置开机自启
systemctl --user enable --now syncthing.service

# 检查状态 (应为 Active)
systemctl --user status syncthing.service
```

> [!NOTE]
> 此时可以通过浏览器访问 `http://127.0.0.1:8384` 进入管理界面。

## 配置 Syncthing Tray

1.  打开 Syncthing Tray设置。
3.  Tray -> Connection:
      * Url: `http://localhost:8384`
      * API Key: 在浏览器打开 Syncthing 网页版 -\> 右上角操作 -\> 设置 -\> 常规 -\> 复制 **API 密钥** 填入此处。
4.  Startup -> Systemd:
      * 勾选 Show start/stop button on tray for local instance whe systemd is available。
      * 勾选 Consider systemd unit status for ...
      * Service name 填 `syncthing.service`。

-----

## 根据插电状态开关Syncthing

我希望Syncthing只在我的笔记本插电的时候才同步，节省离电时的电量。

### 创建脚本文件

随便放在某个我喜欢的地方，比如

- `~/Application/syncthing_power_monitor.sh`
- `~/Executable/syncthing_power_monitor.sh`

```bash
#!/bin/bash

# 在不同电脑上，修改此变量以匹配 ls /sys/class/power_supply/ 的结果
TARGET_DEVICE_NAME="AC" 
CHECK_INTERVAL=60
# 构造完整路径
POWER_SUPPLY_PATH="/sys/class/power_supply/$TARGET_DEVICE_NAME/online"

# 检查路径是否存在，不存在则报错并退出（避免后台空转）
if [ ! -f "$POWER_SUPPLY_PATH" ]; then
    echo "错误: 找不到电源路径 $POWER_SUPPLY_PATH"
    echo "请运行 'ls /sys/class/power_supply/' 确认设备名称，并修改脚本中的 TARGET_DEVICE_NAME。"
    exit 1
fi

echo "开始监控电源状态，目标设备: $TARGET_DEVICE_NAME"

while true; do
    # 读取电源状态 (1=接通, 0=离电)
    POWER_STATUS=$(cat "$POWER_SUPPLY_PATH")
    
    # 检查 Syncthing systemd 服务状态
    IS_ACTIVE=$(systemctl --user is-active syncthing)

    if [ "$POWER_STATUS" == "1" ]; then
        # 接通电源
        if [ "$IS_ACTIVE" != "active" ]; then
            echo "[$(date)] 电源已接通，启动 Syncthing..."
            systemctl --user start syncthing
        fi
    else
        # 电池供电
        if [ "$IS_ACTIVE" == "active" ]; then
            echo "[$(date)] 检测到电池供电，停止 Syncthing..."
            systemctl --user stop syncthing
        fi
    fi

    sleep $CHECK_INTERVAL
done
```

给这个脚本赋予执行权限：

```bash
chmod +x ~/.Executable/syncthing_power_monitor.sh
```

### 创建 Systemd Unit

路径：`~/.config/systemd/user/syncthing-power-monitor.service`

```ini
[Unit]
Description=Syncthing Power Monitor Script
After=syncthing.service network.target

[Service]
Type=simple
ExecStart=%h/.scripts/syncthing_power_monitor.sh
Restart=on-failure
RestartSec=10
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=default.target
```

### 激活监控

```bash
systemctl --user daemon-reload
systemctl --user enable --now syncthing-power-monitor.service
```



2025/12/03