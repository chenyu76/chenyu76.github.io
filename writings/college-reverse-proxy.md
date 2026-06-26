# 宝宝也能上手的校园网穿透教程

> 给ywk宝宝写的教程
>
> 本教程假定读者具备一定的计算机与网络的基础知识。

## 我们要做什么

我们将在校园网内计算机上使用[frp](https://github.com/fatedier/frp)配置[反向代理](https://zh.wikipedia.org/wiki/%E5%8F%8D%E5%90%91%E4%BB%A3%E7%90%86)并安装[WireGuard$^{\text{®}}$](https://www.wireguard.com/)实现在校外访问校内的网络资源。

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

内置电池的UPS可以在直接给client树莓派供电的同时，在宿舍区断电时自动切换到电池供电，保证设备不掉线。注意宿舍区每天断电六小时，如果树莓派的功耗按 $15\text{W}(5\text{V}\ 3\text{A})$ 计算，我们至少需要

$$
\frac{15 \text{W} \times 6 \text{h} }{3.7\text{V}} \times 1000\text{mA}/\text{A}
\approx 24324\text{mAh}
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

这里的“加密口令”可以是你自定义的任意文本

#### 3. 启动服务端

```bash
./frps -c ./frps.toml
```

### 配置client上的frpc

现在回到宿舍里的client，我们要告诉它如何找到外面的服务器。

> [!NOTE]
> 如果使用[SAKURA FRP](https://www.natfrp.com/)，他们fork并修改了frpc，使其支持通过命令行的`-f`参数直接启动而不用编写配置文件，你可以在[这里](https://www.natfrp.com/tunnel/download)下载并参照他们的教程运行。

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

在Client上安装WireGuard，例如如果使用debian系的发行版：

```bash
sudo apt update
sudo apt install wireguard
```

#### 2. 开启内核转发

这是实现局域网访问的关键。你需要让 Linux 内核允许数据包在不同网卡间转发。

可以通过命令在临时修改，测试配置：

```bash
sudo sysctl -w net.ipv4.ip_forward=1
```

如果想重启后仍生效，需要设置配置文件。如果`/etc/sysctl.conf`存在，可以将`net.ipv4.ip_forward=1`添加到文件中：

```bash
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

不同发行版可能具有不同配置，`/etc/sysctl.conf`可能不存在，这时也可以考虑将配置添加到`/etc/sysctl.d`文件夹中的一个新的文件中，如

```bash
sudo echo "net.ipv4.ip_forward=1" > /etc/sysctl.d/9999-ip-forward.conf
```

#### 3. 生成密钥对

在 Client 和 User 端各执行一次，并记录下各自的公钥和私钥，我们需要在接下来的配置文件中输入它们。

下面命令可以快速的完成这个步骤，它会将公钥和私钥保存为当前目录下的文件`publickey`与`privatekey`。

```bash
wg genkey | tee privatekey | wg pubkey > publickey
```

#### 4. 配置 Client 端 (内网服务器)

编辑 `/etc/wireguard/wg0.conf`。为了让 User 能访问局域网，我们需要在接口启动时添加 `iptables` 规则来进行 NAT 伪装。

```toml
[Interface]
Address = 10.0.0.1/24
ListenPort = 51820
PrivateKey = <Client的私钥>

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

> [!IMPORTANT]
> 请务必修改配置文件其中的`<Client的私钥>`和`<User的公钥>`为实际密钥。

#### 5. 配置 User 端 (用户电脑)

先在User的电脑中也安装一个WireGuard。

在 User 的 WireGuard 客户端中新建配置。关键点在于 `AllowedIPs` 的设置。

```toml
[Interface]
PrivateKey = <User的私钥>
Address = 10.0.0.2/32
DNS = 114.114.114.114

[Peer]
PublicKey = <Client的公钥>
AllowedIPs = 10.0.0.0/24, 172.16.0.0/12, ...<你需要访问的IP，逗号分隔>
Endpoint = <frp服务器公网IP>:<frp映射后的UDP端口>
# 保持连接，防止因长时间无流量导致穿透失效
PersistentKeepalive = 25
```

> [!NOTE]
> 在 User 端配置中，`AllowedIPs` 决定了哪些流量会走 WireGuard 隧道。如果你希望访问校园网，必须把校园网的网段（如 `172.16.0.0/12` 或 `10.0.0.0/8`）加进去。
>
> > [!TIP]
> > 如果不确定有哪些IP需要访问，可以将`0.0.0.0/0`（全部IP）添加到`AllowedIPs`，但注意此时你的所有网络流量都会被路由。

> [!NOTE]
> 在 User 端配置中`[Interface]`的`Address`与Client 端`[Peer]`的`AllowedIPs`一致。

> [!IMPORTANT]
> 请务必修改配置文件其中的`<Client的私钥>`和`<User的公钥>`为实际密钥；修改`<frp服务器公网IP>:<frp映射后的UDP端口>`为实际地址和端口。

#### 6. 启动WireGuard

配置完成后，在 Client 执行

```bash
sudo wg-quick up wg0
```

启动WireGuard服务。

在 User 端点击“连接”，测试是否能连接上。

> [!TIP]
>
> 我们在Client的配置中设置了`Address = 10.0.0.1`，这意味着我们可以在连接上后通过10.0.0.1这个地址访问Client自身的网络服务，例如ssh。

> [!NOTE]
>
> 我们现在配置的WireGuard只支持同时一个用户使用，若需要多个用户使用，参加后面的“多用户同时连接”章节

### 配置各个服务的自启动

我们需要配置frps, frpc, WireGuard三个服务的自动启动，让他们在开机或意外退出后可以自动重新启动。

下面以frpc为例说明如何配置，其他服务是类似的。

在 Linux 系统里，[`systemd`](https://en.wikipedia.org/wiki/Systemd) 就像是一个大管家，我们可以写一张“任务清单”交给它，让它负责 `frpc` 的日常维护。

#### 1. 创建Service 文件

我们需要在系统中新建一个服务文件。请在终端输入：

```bash
sudo nano /etc/systemd/system/frpc.service
```

以创建`/etc/systemd/system/frpc.service`文件并编辑。

#### 2. 告诉systemd该做什么

在打开的空白编辑器里，粘贴下面这段内容：

```ini
[Unit]
Description=frp client for campus network
After=network.target

[Service]
Type=simple
ExecStart=/path/to/your/frpc -c /path/to/your/frpc.toml
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
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

#### 4. 检查服务状态

执行下面的命令查看状态：

```bash
sudo systemctl status frpc
```

如果你看到绿色的 <span style="color:#06C762;">`active (running)`</span>，那就说明我们的 `frpc` 已经成功穿透校园网，开始为你工作。

## 需要注意的事项

### WireGuard 的自启动管理

WireGuard的.service有些许不同，在此附上如下。

```ini
[Unit]
Description=WireGuard via wg-quick(8) for %I
After=network.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/wg-quick up %i
ExecStop=/usr/bin/wg-quick down %i
Environment=WG_ENDPOINT_RESOLUTION_RETRIES=infinity

[Install]
WantedBy=multi-user.target
```

将以上内容保存为`/etc/systemd/system/wg-quick@.service`。

控制方法如下：

```bash
# 启用服务（开机自启）
sudo systemctl enable wg-quick@wg0

# 立即启动服务
sudo systemctl start wg-quick@wg0

# 查看服务状态
sudo systemctl status wg-quick@wg0

# 查看日志
sudo journalctl -u wg-quick@wg0 -f
```

### 多用户（多设备）接入配置

在 WireGuard 的架构中，**身份验证与 IP 路由是绑定的**。每一个连接端（User）都必须拥有独一无二的公私钥对，且在中心节点中被分配唯一的内网 IP 地址。

如果你直接将 User A 的配置文件复制给 User B 使用，不仅会导致密钥冲突，还会因为 IP 地址重复而导致路由混乱，最终造成两个设备互相顶号、掉线或无法联网。

因此，接入多个用户（或设备）时，需要遵循以下三个步骤：

1.  **生成密钥**：为每一个新用户生成独立的公私钥对。
2.  **分配 IP**：为每一个新用户规划一个不重复的内网 IP（如 `10.0.0.2`, `10.0.0.3`）。
3.  **双向注册**：在中心节点（Client）注册所有用户的公钥；在各用户设备上填入自己的私钥和中心节点的公钥。

#### 1. 详细配置逻辑

**中心节点 (Client) 的变化：**

- `[Interface]` 部分保持不变（它定义了中心节点自己的地址和监听端口）。
- 需要为每一个新用户增加一个独立的 `[Peer]` 区块。
- 每个 `[Peer]` 区块中，`PublicKey` 填写该用户的公钥，`AllowedIPs` 填写分配给该用户的具体 IP（通常使用 `/32`掩码，表示仅允许该特定 IP 流量）。

**用户端 (User) 的变化：**

- 每个用户拥有独立的配置文件。
- `[Interface]` 中填写自己的私钥 (`PrivateKey`) 和分配到的唯一 IP (`Address`)。
- `[Peer]` 指向中心节点，所有用户的 `[Peer]` 部分基本相同（都指向同一个中心节点的公钥和 Endpoint）。

#### 2. 修改后的配置示例

假设我们将中心节点定义为 Client（作为网关/服务器），并接入三个用户设备（User_A, User_B, User_C）。

##### A. 中心节点配置 (Client)

该文件位于中心节点设备上。注意观察 `[Peer]` 区块是如何一一对应用户的。

```toml
[Interface]
# 中心节点的内网 IP，使用 /24 表示它属于该子网
Address = 10.0.0.1/24
ListenPort = 51820
PrivateKey = <Client 的私钥>

# 启动/关闭时的防火墙规则 (保持原样)
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# -------------------------------------------------
# 用户 A (User_A)
# -------------------------------------------------
[Peer]
PublicKey = <User_A 的公钥>
# 指定 User_A 只能使用 10.0.0.2 这个 IP 通信
AllowedIPs = 10.0.0.2/32

# -------------------------------------------------
# 用户 B (User_B)
# -------------------------------------------------
[Peer]
PublicKey = <User_B 的公钥>
# 指定 User_B 只能使用 10.0.0.3 这个 IP 通信
AllowedIPs = 10.0.0.3/32

# -------------------------------------------------
# 用户 C (User_C)
# -------------------------------------------------
[Peer]
PublicKey = <User_C 的公钥>
# 指定 User_C 只能使用 10.0.0.4 这个 IP 通信
AllowedIPs = 10.0.0.4/32

```

##### B. 用户端配置 (User_A)

- **身份**：User A
- **IP**：10.0.0.2

```toml
[Interface]
# 这里必须填 User_A 独有的私钥
PrivateKey = <User_A 的私钥>
# 这里必须填分配给 User_A 的唯一 IP
Address = 10.0.0.2/32
DNS = 114.114.114.114

[Peer]
# 指向中心节点的公钥
PublicKey = <Client 的公钥>
# 允许访问的网段：包括 VPN 内网(10.0.0.0/24) 和其他目标网段
AllowedIPs = 10.0.0.0/24, 172.16.0.0/12
# 通过 FRP 中转的连接地址
Endpoint = <frp服务器公网IP>:<frp映射后的UDP端口>
# NAT 保持活跃心跳（防止连接中断）
PersistentKeepalive = 25

```

##### C. 用户端配置 (User_B)

- **身份**：User B
- **IP**：10.0.0.3

```toml
[Interface]
# 注意：使用 User_B 的私钥
PrivateKey = <User_B 的私钥>
# 注意：IP 变为 10.0.0.3
Address = 10.0.0.3/32
DNS = 114.114.114.114

[Peer]
# 指向同一个中心节点
PublicKey = <Client 的公钥>
AllowedIPs = 10.0.0.0/24, 172.16.0.0/12
Endpoint = <frp服务器公网IP>:<frp映射后的UDP端口>
PersistentKeepalive = 25

```

##### D. 用户端配置 (User_C)

- **身份**：User C
- **IP**：10.0.0.4

```toml
[Interface]
# 注意：使用 User_C 的私钥
PrivateKey = <User_C 的私钥>
# 注意：IP 变为 10.0.0.4
Address = 10.0.0.4/32
DNS = 114.114.114.114

[Peer]
PublicKey = <Client 的公钥>
AllowedIPs = 10.0.0.0/24, 172.16.0.0/12
Endpoint = <frp服务器公网IP>:<frp映射后的UDP端口>
PersistentKeepalive = 25

```

#### 3. 关键注意事项

1. **公钥与私钥的配对**：
   - 切记：**Client 配置文件**中填写的 `[Peer] PublicKey`，必须是对应 **User 配置文件**中 `[Interface] PrivateKey` 生成的公钥。
2. **AllowedIPs 的唯一性**：
   - 在中心节点（Client）的配置文件中，每个 Peer 的 `AllowedIPs` 必须互不冲突（例如 `10.0.0.2/32` 和 `10.0.0.3/32`）。
   - 原理：当中心节点收到一个发往 `10.0.0.2` 的数据包时，它会根据 `AllowedIPs` 列表查找，发现它属于 User_A，于是使用 User_A 的公钥加密并发送。如果 IP 重复，WireGuard 将无法判断数据包该发给谁。
3. **心跳包 (PersistentKeepalive)**：
   - 由于你是通过 FRP 进行内网穿透或处于 NAT 环境后，**务必**在所有客户端（User 端）保留 `PersistentKeepalive = 25` 配置。这能强制每 25 秒发送一个空包，防止路由器或防火墙关闭 UDP 连接映射。

### UPS 的电池容量

树莓派低功耗待机不需要15W的功耗，不一定需要这么大电池容量，但具体功耗我也没测试过。

### 在每日断电前自动关机

如果不配备UPS，并且不想Client树莓派在宿舍断电时直接掉电的话，我们就需要在将要掉电前将树莓派关机。但是手动关机显然不太现实，可以编写脚本实现这点。

学校的断电规则比较规律：在每天二十四点出头时，如果第二天要上课，就会断电直到早上六点。完全根据调休执行，但问题是调休规则并不规律。幸运的是，有[好心人](https://timor.tech)提供了一个联网API，我可以每天查询明天是否放假，从而决定是否关机。

#### 1. 不放假就关机的脚本

编写python脚本如下：

```python
import datetime
import os
import time

import requests

LOG_FILE = __file__ + ".log"


def log(message):
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    t_msg = f"[{now}] {message}"
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(t_msg + "\n")
    print(t_msg)


def get_tomorrow_status():
    tomorrow_str = (datetime.date.today() + datetime.timedelta(days=1)).strftime(
        "%Y-%m-%d"
    )
    url = f"https://timor.tech/api/holiday/info/{tomorrow_str}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    try:
        response = requests.get(url, headers=headers, timeout=15)

        # 如果返回状态码不是 200，说明 API 服务出问题了
        if response.status_code != 200:
            log(f"API 服务器返回错误码: {response.status_code}")
            return None

        # 检查返回内容是否为空
        if not response.text.strip():
            log("API 返回内容为空")
            return None

        data = response.json()
        if data.get("code") == 0:
            type_code = data.get("type", {}).get("type")
            return type_code in [0, 3]
        else:
            log(f"API 逻辑报错: {data.get('msg')}")

    except requests.exceptions.JSONDecodeError:
        log("API 返回了非 JSON 格式的内容（可能是 HTML 错误页）")
    except Exception as e:
        log(f"请求发生异常: {e}")

    return None


def shutdown():
    # 延迟1分钟关机
    os.system('sudo shutdown +1 "明天是工作日，关机"')


def main():
    # 第一次尝试
    log("开始检查明天是否是假期...")
    is_workday = get_tomorrow_status()

    if is_workday is None:
        log("第一次检查失败，10分钟后进行最终尝试...")
        time.sleep(600)  # 等待 600 秒

        log("开始第二次检查...")
        is_workday = get_tomorrow_status()

        if is_workday is None:
            log("第二次检查依然失败。直接关机。")
            is_workday = True  # 强制判定为工作日，触发关机

    if is_workday:
        log("明天是工作日，准备关机...")
        shutdown()
    else:
        log("明天是假期，今晚不关机。")


if __name__ == "__main__":
    main()

```

这个脚本会在执行后联网检查明天放不放假，如果不放假就关机，放假则不做任何事。为了防止刚好网络掉线情况，如果第一次检查失败，脚本会在十分钟后检查第二次。

#### 2. 每天运行关机检查

接着，我们配置每天晚上23:40通过crontab自动运行这个脚本。通过命令

```bash
crontab -e
```

编辑Cron 定时任务。在文件末尾添加一行：

```bash
40 23 * * * /usr/bin/python3 /home/username/scripts/holiday_shutdown.py
```

> [!IMPORTANT]
>
> 请确保 `python3` 和 `脚本` 的路径都是绝对路径。

#### 3. 给`shutdown`设置免密

由于关机命令 `shutdown` 需要 root 权限，而定时任务自动运行时无法手动输入密码，我们需要为 `shutdown` 命令设置免密。

1. 在终端输入：`sudo visudo`
2. 在文件末尾添加以下内容（将 `username` 替换为你的实际用户名）：

```bash
username ALL=(ALL) NOPASSWD: /usr/sbin/shutdown
```

> [!TIP]
>
> 树莓派似乎本身就不用输密码，可以跳过这一步。

### 自动登陆校园网

如果Client无法连接广域网，那这套方案是肯定不可行的，而我们宿舍区网经常得重新登陆，所以需要一个能定时自动登陆校园网的方法。在我的[这个仓库](https://github.com/chenyu76/some-SZU-LaTeX-templates/blob/main/loginSZUnetworkDormArea.py)里就有这样一个脚本，可以用于登陆szu宿舍区校园网[^2]。

[^2]: 2026.06.27 更新：请注意这个脚本仅能登录宿舍区的校园网。教学区的是登录不了的！我在同一个仓库里放了另一个登录教学区校园网的脚本，如有需要请仔细查看。

为了解决有时校园网需要重新登陆的问题，我们配置另一个定时脚本和对应的service。

#### 1. 监控脚本

我们需要写一个简单的 Shell 脚本来执行循环检测逻辑。

1. 在目录下（假设是 `/home/user/scripts`）创建一个文件 `auto_login_monitor.sh`：
2. 写入以下内容：

```bash
#!/bin/bash

# --- 配置区域 ---
# 校园网登录脚本的绝对路径
LOGIN_SCRIPT="/home/user/scripts/login.py"
# 目标IP
CHECK_IP="223.5.5.5" # 阿里的 DNS
# 检查间隔（秒）
INTERVAL=300

echo "Campus network monitor started..."

while true; do
    # ping 1个包，超时时间5秒
    ping -c 1 -W 5 $CHECK_IP > /dev/null 2>&1

    if [ $? -ne 0 ]; then
        echo "$(date): Network is down. Attempting to login..."
        # 执行登录脚本
        python $LOGIN_SCRIPT
    else
        echo "$(date): Network is OK."
    fi

    sleep $INTERVAL
done

```

3. 执行命令赋予脚本执行权限：

```bash
chmod +x /home/user/scripts/auto_login_monitor.sh
```

#### 2. 创建 Systemd 服务

为了让这个脚本像系统服务一样在后台运行，并随开机启动，我们需要创建一个 `.service` 文件。

1. 创建服务文件：
   `sudo nano /etc/systemd/system/auto-login.service`
2. 使用以下配置：

```ini
[Unit]
Description=Campus Network Auto-Login Service
After=network.target

[Service]
User=your_username
ExecStart=/bin/bash /home/user/scripts/auto_login_monitor.sh
Restart=always
RestartSec=5
WorkingDirectory=/home/user/scripts/

[Install]
WantedBy=multi-user.target
```

> [!IMPORTANT]
> 请将 `your_username`、`user` 和 `ExecStart` 路径替换为你实际的用户名和路径。

#### 3. 启动并激活服务

执行以下命令让服务生效：

```bash
# 重新加载系统服务配置
sudo systemctl daemon-reload
# 设置开机自启
sudo systemctl enable auto-login.service
# 立即启动服务
sudo systemctl start auto-login.service
```

#### 如何管理服务

- **查看运行状态**：`sudo systemctl status auto-login.service`
- **查看实时日志**（排查是否成功 ping 通）：`journalctl -u auto-login.service -f`
- **停止服务**：`sudo systemctl stop auto-login.service`

2025/12/21

