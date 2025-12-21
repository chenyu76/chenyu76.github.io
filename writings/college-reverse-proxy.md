# 宝宝也能上手的校园网穿透教程

> 给ywk宝宝写的教程

## 我们要做什么

我们将在校园网内计算机上使用[frp](https://github.com/fatedier/frp)配置[反向代理](https://zh.wikipedia.org/wiki/%E5%8F%8D%E5%90%91%E4%BB%A3%E7%90%86)并安装[WireGuard$^{\text{®}}$](https://www.wireguard.com/)实现访问校内的网络资源。

### 我们需要什么

- 一台在校园网内环境运行，并可以连接公网的计算机，比如[树莓派](https://www.raspberrypi.com/)，本文会将其称为client。
- 可选：一台在公网上运行的服务器，本文会将其称为server。
  - 如果没有，可以使用例如[SAKURA FRP](https://www.natfrp.com/)[^1]的网络服务商替代。
- 可选：一个用于给client供电的[UPS](https://zh.wikipedia.org/zh-hans/%E4%B8%8D%E9%97%B4%E6%96%AD%E7%94%B5%E6%BA%90)。
  - 如果没有，只是会在学校断电时用不了服务。

[^1]: 我没有收他们的广告费。但是他们家甚至是免费的，我都不知道他们怎么赚钱

### 这些名词是什么

#### 树莓派

简单来说，它就是一台只有信用卡大小的迷你电脑。它的功耗不高，适合 24 小时守在宿舍里，帮我们转发网络信号。

#### UPS

由于我们的宿舍区24:00至次日6:00断电，断电时我们的服务自然无法继续，
如果需要在期间保持client持续运行，我们就需要给它加个电池让它可以一直跑，这就是本场景中UPS（**U**ninterruptible **P**ower **S**upply，不间断电源）的主要作用。
$$
\begin{CD}
\fbox{220V AC}
@>\text{AC}>>
\fbox{UPS}
@>\text{DC}>>
\fbox{Client}
\end{CD}
$$

内置电池的UPS可以在直接给树莓派供电的同时，在宿舍区断电时自动切换到电池供电，保证设备不掉线。注意宿舍区每天断电六小时，如果树莓派的功耗按 $20\text{W}(5\text{V}\ 4\text{A})$ 计算，我们至少需要
$$
\frac{20 \text{W} \times 6 \text{h} }{3.7\text{V}} \times 1000\text{mA}/\text{A}
\approx 32432\text{mAh}
$$

的锂电池容量（以 $3.7\text V$ 计算）。

#### 反向代理

[维基百科](https://zh.wikipedia.org/wiki/%E5%8F%8D%E5%90%91%E4%BB%A3%E7%90%86)上是这样说的：

> 反向代理（Reverse proxy）在电脑网络中是代理服务器的一种。服务器根据客户端的请求，从其关系的一组或多组后端服务器（如Web服务器）上获取资源，然后再将这些资源返回给客户端，客户端只会得知反向代理的IP地址，而不知道在代理服务器后面的服务器集群的存在。

在我们的场景里，简单来说，现在你（user）想访问校内的网络资源，但是校内的网络资源不直接对外开放，所以我们可以借用client，所有校内的网络资源都通过client访问，并将获取的信息都转发给你。当然，由于很多时候user和client之间并没有直接的网络连接，所以需要server作为中转，client先将内容发送至server，然后server再将内容传回user。

$$
\overbrace{
\fbox{校内服务器}
\Longleftrightarrow
\underbrace{
\fbox{Client}
}_{可访问公网}
}^{\text{校园内部网}}
\Longleftrightarrow
\underbrace{
\fbox{Server}
}_{\text{位于公网}}
\Longleftrightarrow
\underbrace{
\fbox{User}
}_{\text{可访问公网}}
$$


#### frp

[frp的GitHub仓库](https://github.com/fatedier/frp)

在仓库中，[fatedier](https://github.com/fatedier/)是这样描述frp的：

> frp 是一个专注于内网穿透的高性能的反向代理应用，支持 TCP、UDP、HTTP、HTTPS 等多种协议，且支持 P2P 通信。可以将内网服务以安全、便捷的方式通过具有公网 IP 节点的中转暴露到公网。

总而言之，他就是我们实现反向代理的软件。

frp分为两部分：

1. `frps`（frp **S**erver，服务端）运行在公网服务器上，
2. `frpc`（frp **C**lient，客户端）运行在校园网内你的计算机（树莓派）上。

两者配合，就能打通一条从外网到内网的隧道。

#### WireGuard

WireGuard 是一个非常简单、快速、现代化的虚拟专用网协议。在我们的场景中，我们可以用 WireGuard 把user设备和client设备连接在同一个虚拟局域网里，这样你就可以像在宿舍里一样直接访问校园网资源了。

配置好后的网络结构大概会是这个样子：

```
┌────────────────────────────────────────────────────┐
│ WAN                                                │
│┌────────────────────────┐                          │
││ School LAN             │   ┌────────┐             │
││┌──────────┐  ┌────────┐│   │ Server │   ┌────────┐│
│││ School   │  │        └┴───┴────────┴───┘┌──────┐││
│││ Internal │  │ Client                    │ User │││
│││ Computer │  │        ┌┬───┬────────┬───┐└──────┘││
││└──────────┘  └────────┘│   └────────┘   └────────┘│
│└────────────────────────┘                          │
└────────────────────────────────────────────────────┘
```

## 我们要怎么做

需要安装并配置的软件一览：

| 设备   | 软件                                |
| ------ | ----------------------------------- |
| Client | frp客户端， WireGuard（作为服务端） |
| Server | frp服务端                           |
| User   | WireGuard（作为客户端）             |


### 配置server上的frps

> [!NOTE]
> 如果没有，使用例如[SAKURA FRP](https://www.natfrp.com/)的网络服务商替代时，可以直接跳过这一步，并直接参照[它们的教程](https://doc.natfrp.com/app/http.html)配置。

我们先从公网服务器（server）开始，因为它要负责在外面“接应”校内的 client。

#### 1. 下载 frp

在server上下载frps对应架构的压缩包并解压。

#### 2. 编写配置文件

新建一个名为 `frps.toml` 的文件，写入以下内容：

   ```toml
   bindPort = 7000           # frp 服务端监听的端口
   auth.token = "你的加密口令"  # 只有拿着正确密码的 client 才能连接
   ```

#### 3. 启动服务端

```bash
./frps -c ./frps.toml
```

### 配置client上的frpc

现在回到宿舍里的client，我们要告诉它如何找到外面的服务器。


> [!NOTE]
> 如果使用[SAKURA FRP](https://www.natfrp.com/)，他们fork并修改了frpc，使其支持通过命令行的特别参数直接启动而不用编写配置文件，你可以在[这里](https://www.natfrp.com/tunnel/download)下载并参照他们的教程运行。

#### 1. 编写配置文件

新建 `frpc.toml`，这是实现穿透的关键：

```toml
serverAddr = "你的服务器公网IP"
serverPort = 7000
auth.token = "你的加密口令"

[[proxies]]
name = "wireguard-tunnel"
type = "udp"              # WireGuard 使用的是 UDP 协议
localIP = "127.0.0.1"
localPort = 51820         # 树莓派上 WireGuard 的默认端口
remotePort = 51820        # 映射到服务器上的端口
```

这样配置后，外网用户可以通过 `server_ip:7000` 连接到 client 的服务。

#### 2. 启动客户端

使用以下命令

```bash
./frpc -c ./frpc.toml
```

### 安装并配置 WireGuard：实现局域网全访问

当你通过 `frp` 穿透了 WireGuard 的 UDP 端口后，你不仅可以连接到这台服务器本身，还可以通过它作为跳板，访问其所在的整个校园网/局域网资源。

#### 1. 安装 WireGuard (Client 端)

在内网服务器（下称 Client）上安装：

```bash
sudo apt update
sudo apt install wireguard

```

#### 2. 开启内核转发

这是实现局域网访问的关键。你需要让 Linux 内核允许数据包在不同网卡间转发。

```bash
# 临时生效
sudo sysctl -w net.ipv4.ip_forward=1

# 永久生效：修改 /etc/sysctl.conf
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### 3. 生成密钥对

在 Client 和 User 端各执行一次，并记录下各自的公钥和私钥。
```bash
wg genkey | tee privatekey | wg pubkey > publickey

```

#### 4. 配置 Client 端 (内网服务器)

编辑 `/etc/wireguard/wg0.conf`。为了让 User 能访问局域网，我们需要在接口启动时添加 `iptables` 规则来进行 NAT 伪装。

```ini
[Interface]
Address = 10.0.0.1/24
ListenPort = 51820
PrivateKey = <Client的私钥>

# 核心配置：流量转发与伪装
# 注意：将 eth0 替换为你实际的网卡名称（通过 ip addr 查看）
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
PublicKey = <User的公钥>
AllowedIPs = 10.0.0.2/32
```

> [!NOTE]
> 如果不加 `PostUp` 里的 iptables 规则，局域网内的其他设备收到你的请求后，不知道要把回包发给 `10.0.0.2`。通过 NAT 伪装，所有从 User 发出的请求在进入局域网时，都会被伪装成 Client 的本地 IP。

> [!IMPORTANT]
> 请务必在 Client 执行 `ip addr` 查看主网卡名称，如果是 `ens33` 或 `eno1`，请将配置中的 `eth0` 相应替换。

#### 5. 配置 User 端 (用户电脑)

在 User 的 WireGuard 客户端中新建配置。关键点在于 `AllowedIPs` 的设置。

```ini
[Interface]
PrivateKey = <User的私钥>
Address = 10.0.0.2/24
DNS = 114.114.114.114

[Peer]
PublicKey = <Client的公钥>
# 重点：这里不仅要写 WG 网段，还要包含你想访问的局域网网段
# 假设校园网网段是 172.16.0.0/12
AllowedIPs = 10.0.0.0/24, 172.16.0.0/12
# 填写 frp 服务器的公网 IP 和映射后的 UDP 端口
Endpoint = <frp服务器公网IP>:<frp映射后的UDP端口>
# 保持连接，防止因长时间无流量导致穿透失效
PersistentKeepalive = 25
```

> [!NOTE]
> 在 User 端配置中，`AllowedIPs` 决定了哪些流量会走 WireGuard 隧道。如果你希望访问校园网，**必须**把校园网的网段（如 `172.16.0.0/12` 或 `10.0.0.0/8`）加进去。

#### 测试

- 配置完成后，在 Client 执行 `sudo wg-quick up wg0` 启动服务。
- 在 User 端点击“连接”，尝试 `ping 10.0.0.1`，如果通了，再尝试 ping 校园网内的一台私有 IP 设备。

### 配置各个服务的自启动

我们需要配置frps, frpc, WireGuard三个服务的自动启动，让他们在开机或意外退出后可以自动重新启动。

下面以frpc为例说明如何配置，其它两个软件也类似。

在 Linux 系统里，[`systemd`](https://en.wikipedia.org/wiki/Systemd) 就像是一个大管家，我们可以写一张“任务清单”交给它，让它负责 `frpc` 的日常维护。

#### 1. 创建任务清单（Service 文件）

我们需要在系统中新建一个服务文件。请在终端输入：

```bash
sudo nano /etc/systemd/system/frpc.service
```

以创建`/etc/systemd/system/frpc.service`文件并编辑。

#### 2. 告诉systemd该做什么

在打开的空白编辑器里，粘贴下面这段内容：

```ini
[Unit]
Description=frp client for campus network  # 任务描述
After=network.target                     # 等网络连接好了再启动

[Service]
Type=simple
# 注意：下面这两行要把路径改成你存放 frpc 和 frpc.toml 的真实路径！
ExecStart=/path/to/your/frpc -c /path/to/your/frpc.toml
Restart=on-failure                       # 如果程序崩了，管家会自动把它扶起来
RestartSec=5s                            # 崩了之后等 5 秒再试

[Install]
WantedBy=multi-user.target               # 设定为多用户模式下启动
```

> [!IMPORTANT]
> 要把 `ExecStart` 里的 `/path/to/your/` 换成你实际的文件夹路径（比如 `/home/pi/frp/`）！

#### 3. 让清单正式生效

写好后，按 `Ctrl + O` 保存，再按 `Ctrl + X` 退出。然后执行下面这几条命令：

1. **刷新清单**：
`sudo systemctl daemon-reload`
2. **设置开机自动启动**：
`sudo systemctl enable frpc`
3. **现在立刻帮我启动**：
`sudo systemctl start frpc`

#### 4. 检查它有没有在偷懒

执行下面的命令查看状态：

```bash
sudo systemctl status frpc
```

如果你看到一片绿色的 <span style="color:#00FF00;">`active (running)`</span>，那就说明我们的 `frpc` 已经成功穿透校园网，开始为你工作。

## 需要注意的事项

### UPS 的电池容量

树莓派低功耗待机不需要20W的功耗，不一定需要这么大电池容量，但具体功耗我也没测试过。

### 登陆校园网

如果Client无法连接校园网，那这套方案是完全不可行的，而我们宿舍区网经常得重新登陆，所以需要一个能定时自动登陆校园网的方法。在我的[这个仓库](https://github.com/chenyu76/some-SZU-LaTeX-templates/blob/main/loginSZUnetwork.py)里就有这样一个脚本，可以用于登陆宿舍区校园网，但记得配置一个定时连接的服务。

2025/12/21