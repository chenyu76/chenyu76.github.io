# 连接学校公共 Wi-Fi 时，avahi-daemon 占用 CPU 高

学校的公共 Wi-Fi 环境通常非常拥挤，设备数量众多。`avahi-daemon` 用于实现 mDNS/DNS-SD（多播 DNS/DNS 服务发现）协议，它会不断广播和接收网络上的服务信息。在设备众多的公共 Wi-Fi 环境中，大量的广播包可能会导致 `avahi-daemon` 消耗大量 CPU 资源来处理这些信息。

### 使用 NetworkManager 的 Dispatcher 脚本

- NetworkManager 在网络连接状态发生变化时，会运行 dispatcher 脚本。
- 您可以编写一个 dispatcher 脚本，在连接到特定 SSID 时，禁用 Avahi 服务，断开连接时，启用 Avahi 服务。

**具体步骤：**

1. 创建 dispatcher 脚本：
   - 在 `/etc/NetworkManager/dispatcher.d/` 目录下创建一个脚本，例如 `avahi-ssid-control.sh`。
   - 脚本内容示例：

```bash
#!/bin/bash

SSID="your_target_SSID" # 将 "your_target_SSID" 替换为实际的 Wi-Fi 的 SSID

if [ "$2" = "up" ]; then
    connected_ssid=$(iwgetid -r)
    if [ "$connected_ssid" = "$SSID" ]; then
        systemctl stop avahi-daemon.service
    fi
elif [ "$2" = "down" ]; then
    systemctl start avahi-daemon.service
fi

exit 0
```

1. 使用以下命令为脚本添加执行权限：
   - `sudo chmod +x /etc/NetworkManager/dispatcher.d/avahi-ssid-control.sh`
2. 重启 NetworkManager 服务：
   - `sudo systemctl restart NetworkManager.service`

**提示：**

- dispatcher 脚本的执行时机取决于 NetworkManager 的事件触发，因此可能存在一定的延迟。
- `iwgetid` 命令需要wireless_tools包。

- 由于 Avahi 的设计初衷是用于局域网服务发现，因此在公共 Wi-Fi 环境中可能会遇到一些问题。
- 通过上述方法，您可以有效地控制 Avahi 在特定 SSID 下的行为，从而避免 CPU 占用过高的问题。



2025/04/16 based on answer by Google Gemini