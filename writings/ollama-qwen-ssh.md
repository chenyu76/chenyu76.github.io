# Ollama 千问3.8 27B：24GB 显卡部署与SSH转发客户端接入

在一台配备 24GB NVIDIA 显卡的 Linux 服务器上运行千问 27B，通过 SSH 隧道供本地 Agent 使用。

本文命令均在Ubuntu 24下执行。

## 配置服务器与模型

### 检查 NVIDIA 驱动

```bash
nvidia-smi
```

确认能看到显卡型号、显存容量和驱动版本。否则应先完成对应发行版的 NVIDIA 驱动安装。硬件支持条件参考 [Ollama GPU 文档](https://docs.ollama.com/gpu)。

### 安装 Ollama

Ollama 是一个用于在自己的电脑或服务器上运行大语言模型的工具。它负责模型下载、加载和推理，并提供 API，让其他应用调用模型。

可以使用[官方脚本](https://docs.ollama.com/linux)在服务器上安装：

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

安装并重启后，systemd服务应会自动启用，可以通过命令

```bash
systemctl status ollama
```

检查ollama服务。

### 下载模型

在服务器终端运行

```bash
ollama pull qwen3.8:27b
```

以下载[qwen3.8](https://ollama.com/library/qwen3.8)。
需要下载约17GB的数据，请耐心等待。

### Ollama 服务设置

在服务器终端通过

```bash
sudo systemctl edit ollama
```

编辑 Ollama 的服务设置。在编辑区域添加以下内容并保存：

```ini
[Service]
Environment="OLLAMA_FLASH_ATTENTION=1"
Environment="OLLAMA_KV_CACHE_TYPE=q4_0"
Environment="OLLAMA_NUM_PARALLEL=1"
Environment="OLLAMA_MAX_LOADED_MODELS=1"
```

> [!TIP]
> 这几项的含义如下：
>
> `Environment="OLLAMA_FLASH_ATTENTION=1"` 开启 Flash Attention。
>
> - 降低长上下文时的显存占用；
> - 通常能提高注意力计算效率；
>
> `Environment="OLLAMA_KV_CACHE_TYPE=q4_0"` 将 KV Cache 使用 q4_0 量化。
>
> - 降低上下文缓存的显存占用；
> - 可能带来少量质量损失，尤其是长上下文和复杂推理任务。
>
> `Environment="OLLAMA_NUM_PARALLEL=1"` 每个模型最多同时处理的请求数为 1。第二个请求会等待第一个请求完成；对 qwen3.8:27b 来说，目前即使设置大于 1，Ollama 也可能因该模型架构限制而强制降回 1。
>
> `Environment="OLLAMA_MAX_LOADED_MODELS=1"` 最多同时保留一个已加载模型。

然后应用设置：

```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

### 创建 128k 上下文模型

qwen3.8 支持最大256k上下文，但是由于服务器仅有24G显存，256k上下文可用性不高。下面命令配置了一个名为`qwen3.8:27b-128k`的128k上下文的qwen3.8。

```bash
cat > Modelfile.qwen128k <<'EOF'
FROM qwen3.8:27b
PARAMETER num_ctx 131072
EOF

ollama create qwen3.8:27b-128k -f Modelfile.qwen128k
```

完成后，`qwen3.8:27b-128k` 应该在Ollama的默认地址 `http://localhost:11434` 可用。可以通过

```bash
ollama run qwen3.8:27b-128k
```

快速测试。

## 在本地电脑上使用

### 配置客户端的SSH端口转发

Ollama提供的接口没有加密，直接将其暴露在公网并不安全。如果服务器配置了远程SSH访问（如果没有，可以参考[这里配置](/writings/how-to-expose-ssh-to-the-internet-with-frp/index-zh.html)），就可以使用SSH的端口转发功能，安全地接入服务器的Ollama。

在本地电脑上运行下面命令便可将服务器的11434端口上的服务转发到本地的11435端口。如果11435端口被占用可以随便换一个端口。

```bash
ssh -N \
  -L 127.0.0.1:11435:127.0.0.1:11434 \
  SSH_USER@SERVER_ADDRESS
```

> [!NOTE]
> 记得修改用户名`SSH_USER`和地址`SERVER_ADDRESS`

> [!TIP]
>
> `-N`: 登录后不打开远程 shell，只用来做端口转发/隧道。终端会看起来卡住，这是正常的。可以按`Ctrl C`终止。
>
> `-L`: 建立本地端口转发。语法是：`-L [本地绑定地址:]本地端口:远程目标地址:远程目标端口`。

#### 保存配置

可以在本地 `~/.ssh/config` 中添加独立别名：

```sshconfig
Host ollama-tunnel
    HostName SERVER_ADDRESS
    User SSH_USER
    Port 22
    LocalForward 127.0.0.1:11435 127.0.0.1:11434
    ExitOnForwardFailure yes
    ServerAliveInterval 30
    ServerAliveCountMax 3
    ControlMaster auto
    ControlPath ~/.ssh/ollama-tunnel-%C
```

> [!NOTE]
> 记得修改用户名SSH_USER，地址SERVER_ADDRESS和端口

> [!TIP]
>
> | 配置项                                         | 含义                                                                                                       |
> | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
> | `Host ollama-tunnel`                           | 定义一个 SSH 主机别名。以后执行 `ssh ollama-tunnel` 就会使用下面这些配置。                                 |
> | `HostName SERVER_ADDRESS`                      | 实际要连接的服务器地址。                                                                                   |
> | `User SSH_USER`                                | 登录远程服务器使用的用户名。                                                                               |
> | `Port 22`                                      | SSH 服务端口，默认就是 22。                                                                                |
> | `LocalForward 127.0.0.1:11435 127.0.0.1:11434` | 本地端口转发。                                                                                             |
> | `ExitOnForwardFailure yes`                     | 如果端口转发建立失败，比如本地 `11435` 已被占用，SSH 直接退出，而不是连接成功但没有隧道。                  |
> | `ServerAliveInterval 30`                       | 每 30 秒向服务器发送一次 keepalive 心跳，防止连接因长时间空闲被防火墙/NAT 断开。                           |
> | `ServerAliveCountMax 3`                        | 如果连续 3 次心跳都没有响应，就断开 SSH。结合上面，大约 90 秒无响应后断开。                                |
> | `ControlMaster auto`                           | 启用 SSH 连接复用。第一次连接会作为主连接，后续连接可以复用已有的 SSH 连接，避免重复认证和握手。           |
> | `ControlPath ~/.ssh/ollama-tunnel-%C`          | 指定连接复用使用的 Unix socket 文件路径。`%C` 是连接信息的哈希值，用来区分不同主机/端口/用户等，避免冲突。 |

使用方式大致是：

```bash
ssh ollama-tunnel
```

如果只想建立隧道、不打开远程 shell，可以用：

```bash
ssh -N ollama-tunnel
```

然后本地访问：

```text
http://127.0.0.1:11435
```

就相当于访问远程服务器上的：

```text
http://127.0.0.1:11434
```

### Agents 配置

Ollama 提供的接口与大部分agent都兼容，下面以OpenCode和DeepSeek Harness 为例。

如果运行在建立 SSH 转发的本地电脑上，API 地址为：

```text
http://127.0.0.1:11435/v1
```

如果直接运行在 Ollama 服务器上，使用：

```text
http://127.0.0.1:11434/v1
```

#### OpenCode

编辑客户端 `~/.config/opencode/opencode.json`。已有配置时合并以下字段：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": Ollama Server",
      "options": {
        "baseURL": "http://127.0.0.1:11435/v1"
      },
      "models": {
        "qwen3.8:27b-128k": {
          "name": "Qwen3.8 27B 128K",
          "limit": {
            "context": 131072,
            "output": 16384
          }
        }
      }
    }
  },
  "model": "ollama/qwen3.8:27b-128k"
}
```

然后重启 OpenCode，通过 `/models` 切换。

参考：[OpenCode Ollama 配置](https://opencode.ai/docs/providers/#ollama)、[配置文件位置](https://opencode.ai/docs/config/#global)。

#### DeepSeek Harness

详情见 [DeepSeek Harness 配置模型文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/providers.zh.md)。

- “Provider ID” 随便填，仅供自己识别。
- “显示名称” 随便填，仅供自己识别。
- “API 地址”填`http://127.0.0.1:11435/v1`（或别的自定义端口，如果修改了）
- 协议是`openai-completions`
- “API 密钥”随便填，比如`ollama`（是的，因为ollama不验证密钥）

2026/09/16
