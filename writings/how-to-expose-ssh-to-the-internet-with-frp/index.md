# 内网穿透：使用frp远程访问SSH

> [!WARNING]
> 若希望按照本文配置，请确保你被内网穿透的服务足够安全，对于ssh，这里提供以下建议：
>
> 1. 禁用root账户直接登录。
> 2. 使用密钥对登录并禁用密码登录。
> 3. 设置一个强密码。
>
> 笔者**不建议**在读者不具备网络安全知识的情况下尝试内网穿透。
>
> 附案例一则：[“把公司内网穿透 然后被勒索了 我得付多大责任”](https://www.v2ex.com/t/692012)

## 必备知识

本文假定读者具备一定的Linux知识，如果你知道下面奇怪的字母组合都是什么意思大概就足够了：

```text
ls, cp, mv, ssh, scp, wget, bash, ip
```

## 引入

假设你有一台部署在办公室的工作站（Workstation）。在办公室时，你可以通过局域网 IP 轻松连接；但当你回到家或在外出差时，连接就会中断。

这是因为工作站处于办公室的局域网（LAN）内部，没有公网 IP，外网用户（User）无法直接定位并访问它。

```text
 ┌──  ──  ──  ──  ──  ──  ──  ───┐
 │                   Office LAN
   ┌────────┐    ┌─────────────┐ │                ┌────────┐
 │ │ User A ├────┤ Workstation │              ?───┤ User B │
   └────────┘    └─────────────┘ │                └────────┘
 └─  ──  ──  ──  ──  ──  ──  ──  ┘
```

在这种场景下，内网穿透便派上了用场。本文选用的工具是 [frp](https://github.com/fatedier/frp)。它的实现原理非常朴素：既然一台公网上的服务器（Server）可以被用户和工作站访问，那么通过它作为中继，便能桥接起外网与内网之间的通信。

```
         ┌────────┐
         │ Server │
         └──┬──┬──┘
    ┌───────┘  └───────┐
    │              ┌── │──  ──  ──  ──  ──  ──  ───┐
    │              │   │               Office LAN
 ┌──┴───┐            ┌─┴──────┐    ┌─────────────┐ │
 │ User │          │ │ Client ├────┤ Workstation │
 └──────┘            └────────┘    └─────────────┘ │
                   └─  ──  ──  ──  ──  ──  ──  ──  ┘
```

在本文中，我们约定如下称呼：

- **Workstation**：目标访问设备（如办公室电脑）。
- **User**：发起访问的客户端（如你的笔记本电脑）。
- **Server**：公网上的中转服务器。
- **Client**：局域网内负责连接 Server 的设备（也可以是 Workstation 本身）。

此外，我们假定这些计算机都运行着GNU/Linux，后文的命令都基于此编写。

## 配置

### 下载与架构匹配的二进制程序

在下载前，我们需要确认 Server 与 Client 各自的硬件架构，否则会由于指令集不兼容导致无法运行。

你可以通过 `lscpu` 命令中的Architecture信息进行判断：

- 若为 `x86_64`，请下载带 `amd64` 字样对应系统的发布包。
- 若为 `aarch64`，请下载带 `arm64` 字样对应系统的发布包。

前往 [frp Release 页面](https://github.com/fatedier/frp/releases) 找到对应版本并在 Server 和 Client 中各下载一份并解压：

```bash
# 以 v0.68.1 amd64 版本为例
# 下载压缩包
wget https://github.com/fatedier/frp/releases/download/v0.68.1/frp_0.68.1_linux_amd64.tar.gz
# 解压
tar -zxvf frp_0.68.1_linux_amd64.tar.gz
# 进入目录
cd frp_0.68.1_linux_amd64
```

压缩包中会包含下面这些文件

| 文件      | 说明                    |
| --------- | ----------------------- |
| frpc      | frp client 端可执行文件 |
| frpc.toml | frp client 端配置文件   |
| frps      | frp server 端可执行文件 |
| frps.toml | frp server 端配置文件   |
| LICENSE   | 许可证信息              |

我们接下来将修改这两个toml文件并启动两个frp二进制程序完成我们的目标。

### Server 端配置

在 Server 端下载frp后，我们为其配置服务端程序 `frps`（frp server）。它的任务是监听一个公网端口，作为与 Client 通信的入口。

首先使用读者喜欢的编辑器修改配置文件 `frps.toml`。井号（`#`）开头的是注释内容，可以删去且不影响配置。

```toml
# bindPort 是服务端监听的基础端口，用于接收来自 Client 的隧道连接请求
bindPort = 7000

# 身份验证令牌（Token）。为了防止他人恶意连接你的服务器，
# 只有当客户端提供的 Token 与此处一致时，才能成功建立隧道。
auth.token = "请替换为一段随机复杂的字符串"
```

#### 配置自动启动

在 Linux 环境下，直接运行程序无法保证其在终端退出或系统重启后继续工作。因此，笔者建议将其注册为 `systemd` 服务。这不仅能实现后台常驻，还能在程序异常崩溃时自动重启，由系统内核直接管理其生命周期。

创建服务文件 `/etc/systemd/system/frps.service`。注意写入这个目录需要root权限。

```ini
[Unit]
# 自定义的描述
Description=Frp Server Service
# frp 需要网络连接，所以需要在网络服务启动后启动
After=network.target

[Service]
# 服务类型为 simple，表示 ExecStart 启动的进程就是主进程
Type=simple
# 以 nobody 用户运行，降低权限，增强安全性
User=nobody
# 注意：ExecStart 必须使用程序和配置文件的绝对路径
ExecStart=/path/to/frps -c /path/to/frps.toml
# 当服务进程异常退出时自动重启（非正常退出码、超时等）
Restart=on-failure
# 重启前等待 5 秒，避免频繁重启
RestartSec=5s

[Install]
# 定义该服务被哪个目标（target）所依赖，multi-user.target 表示多用户模式下自动启动
WantedBy=multi-user.target
```

执行以下命令启用并启动服务：

```bash
# 刷新可用的服务列表
sudo systemctl daemon-reload
# 启用服务，使frps能开机自启
sudo systemctl enable frps
# 现在立刻启动
sudo systemctl start frps
```

### Client 端配置

在 Client 端下载 frp 后，我们为其配置客户端程序 `frpc`（frp client）。它会主动向 Server 发起连接，并约定好流量的转发规则。

修改配置文件 `frpc.toml`：

```toml
# 你的 Server 公网 IP 或域名
serverAddr = "x.x.x.x"
# 须与 Server 端的 bindPort 保持一致
serverPort = 7000
# 必须与 Server 端设置的 Token 完全一致
auth.token = "一段随机复杂的字符串"

[[proxies]]
# 自定义的名称
name = "ssh-workstation"
type = "tcp"
# 当外部流量进入 Server 的 remotePort 时，隧道会将其转发到本地的 localIP:localPort
localIP = "127.0.0.1"
# 工作站 SSH 服务的监听端口（SSH的默认端口是22）
localPort = 22
# 映射到公网 Server 上的访问端口
remotePort = 6000
```

同样地，为了保证隧道的稳定性，我们也为 `frpc` 配置 `systemd` 服务。内容可参考上文，仅需将程序名改为 `frpc` 并指向其对应的配置文件。

### 访问 SSH

配置完成后，我们便可以在User端访问Workstation。整体的流量流向为：User 访问 `Server:6000` -> Server 通过隧道转发至 Client -> Client 转发至 Workstation 的 `22` 端口。

User 在外部网络下执行：

```bash
# -p 端口参数指定我们刚才约定的 remotePort
ssh -p 6000 <Workstation用户名>@<Server公网IP>
```

使用 `scp` 传输文件时使用：

```bash
# 注意scp的端口参数使用大写的 `-P`
scp -P 6000 ./test.txt <用户名>@<IP>:~/
```

## 附注

### Client 非必须

在实际搭建中，Client不是必须的，你可以将上述在Client中进行的操作都在Workstation中进行。不过将两种服务解耦在实际使用时具有以下优势：

- 支持远程唤醒：你可以额外配置一个 Wake-on-LAN (WOL) 隧道，让功耗低的 Client 24 小时在线。当你需要Workstation时，通过 Client 发送 WOL 指令唤醒工作站，用完再关掉，省电又静音。
- 系统解耦： 即使 Workstation 意外崩溃或重启，Client 的隧道依然在线。

### 云服务器的访问控制

部分租赁的云服务器须在服务器设置中手动放行使用的端口，否则外部流量会被云服务商的防火墙拦截。

### 现成的frp服务商

互联网上有许多内网穿透服务提供商，使用他们的服务往往比单独购入一个云服务器的性价比高很多，并且可能具有更方便的配置流程。

笔者目前使用的是[Sakura frp](https://www.natfrp.com/)（我没有收他们的广告费），他们的教程可以在[这里](https://doc.natfrp.com/)查看。
使用他们的服务可以省去配置frps的步骤。

### 同时穿透许多服务

如果除了远程SSH外，还需要访问别的服务，可以考虑直接[穿透一个VPN](https://chenyu76.github.io/writings/college-reverse-proxy.html)。

---

2026年5月5日
