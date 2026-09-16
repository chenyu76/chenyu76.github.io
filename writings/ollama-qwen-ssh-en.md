# Ollama Qwen 3.8 27B: Deploying on a 24GB GPU and Connecting Clients via SSH Forwarding

Running Qwen 27B on a Linux server with a 24GB NVIDIA GPU, accessed by local agents through an SSH tunnel.

All commands in this post are run on Ubuntu 24.

**This post is translated from Chinese by Qwen 3.8 27B. **

## Setting Up the Server and Model

### Check the NVIDIA Driver

```bash
nvidia-smi
```

Make sure you can see the GPU model, VRAM capacity, and driver version. Otherwise, install the NVIDIA driver for your distribution first. For hardware support requirements, see the [Ollama GPU documentation](https://docs.ollama.com/gpu).

### Install Ollama

Ollama is a tool for running large language models on your own computer or server. It handles model downloading, loading, and inference, and provides an API so other applications can call the models.

You can install it on the server using the [official script](https://docs.ollama.com/linux):

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

After installation, the systemd service should be enabled automatically. You can check the Ollama service with:

```bash
systemctl status ollama
```

### Download the Model

Run this in the server terminal:

```bash
ollama pull qwen3.8:27b
```

to [download qwen3.8](https://ollama.com/library/qwen3.8).
It downloads about 17GB of data, so please be patient.

### Configuring the Ollama Service

On the server terminal, edit Ollama's service settings via:

```bash
sudo systemctl edit ollama
```

Add the following to the editing area and save:

```ini
[Service]
Environment="OLLAMA_FLASH_ATTENTION=1"
Environment="OLLAMA_KV_CACHE_TYPE=q4_0"
Environment="OLLAMA_NUM_PARALLEL=1"
Environment="OLLAMA_MAX_LOADED_MODELS=1"
```

> [!TIP]
> Here is what these settings mean:
>
> `Environment="OLLAMA_FLASH_ATTENTION=1"` enables Flash Attention.
>
> - Reduces VRAM usage with long contexts;
> - Usually improves the efficiency of attention computation;
>
> `Environment="OLLAMA_KV_CACHE_TYPE=q4_0"` quantizes the KV cache to q4_0.
>
> - Reduces VRAM usage of the context cache;
> - May cause a slight quality loss, especially with long contexts and complex reasoning tasks.
>
> `Environment="OLLAMA_NUM_PARALLEL=1"` limits the number of concurrent requests per model to 1. A second request waits until the first one finishes; for qwen3.8:27b, even if you set it above 1, Ollama may still force it back to 1 due to the model's architecture limitations.
>
> `Environment="OLLAMA_MAX_LOADED_MODELS=1"` keeps at most one loaded model in memory at a time.

Then apply the settings:

```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

### Creating a 128k Context Model

qwen3.8 supports a maximum 256k context, but since the server only has 24GB of VRAM, a 256k context is not very feasible. The following command configures a qwen3.8 with a 128k context named `qwen3.8:27b-128k`.

```bash
cat > Modelfile.qwen128k <<'EOF'
FROM qwen3.8:27b
PARAMETER num_ctx 131072
EOF

ollama create qwen3.8:27b-128k -f Modelfile.qwen128k
```

When done, `qwen3.8:27b-128k` should be available at Ollama's default address, port `http://localhost:11434`. You can do a quick test with:

```bash
ollama run qwen3.8:27b-128k
```

## Using It from Your Local Machine

### Setting Up the Client's SSH Port Forwarding

Ollama's API is unencrypted, so exposing it directly to the public internet is not safe. If the server has remote SSH access configured (if not, you can [set that up first](/writings/how-to-expose-ssh-to-the-internet-with-frp/index-zh.html)), you can use SSH port forwarding to securely access the server's Ollama.

Run the following command on your local machine to forward the service on the server's port 11434 to local port 11435. If port 11435 is in use, you can pick any other port.

```bash
ssh -N \
  -L 127.0.0.1:11435:127.0.0.1:11434 \
  SSH_USER@SERVER_ADDRESS
```

> [!NOTE]
> Remember to replace the username `SSH_USER` and address `SERVER_ADDRESS`.

> [!TIP]
>
> `-N`: Does not start a remote shell after logging in; it's used only for port forwarding/tunneling. The terminal will appear to hang — this is normal. Press `Ctrl C` to terminate it.
>
> `-L`: Sets up local port forwarding. The syntax is: `-L [local-bind-address:]local-port:remote-target-address:remote-target-port`.

#### Saving the Configuration

You can add a dedicated alias to your local `~/.ssh/config`:

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
> Remember to replace the username SSH_USER, the address SERVER_ADDRESS, and the ports.

> [!TIP]
>
> | Option                                      | Meaning                                                                                                      |
> | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
> | `Host ollama-tunnel`                        | Defines an SSH host alias. Running `ssh ollama-tunnel` afterwards will use the settings below.               |
> | `HostName SERVER_ADDRESS`                   | The actual server address to connect to.                                                                     |
> | `User SSH_USER`                             | The username used to log in to the remote server.                                                            |
> | `Port 22`                                   | The SSH service port; the default is 22.                                                                     |
> | `LocalForward 127.0.0.1:11435 127.0.0.1:11434` | Local port forwarding.                                                                                       |
> | `ExitOnForwardFailure yes`                  | If setting up the port forwarding fails, e.g. local `11435` is already in use, SSH exits immediately instead of connecting successfully without a tunnel. |
> | `ServerAliveInterval 30`                    | Sends a keepalive heartbeat to the server every 30 seconds, preventing the connection from being dropped by a firewall/NAT after long periods of inactivity. |
> | `ServerAliveCountMax 3`                     | Disconnects the SSH session if 3 consecutive heartbeats get no response. Combined with the setting above, the connection drops after about 90 seconds of unresponsiveness. |
> | `ControlMaster auto`                        | Enables SSH connection multiplexing. The first connection becomes the master connection; subsequent connections reuse the existing SSH connection, avoiding repeated authentication and handshakes. |
> | `ControlPath ~/.ssh/ollama-tunnel-%C`       | Specifies the path of the Unix socket file used for connection multiplexing. `%C` is a hash of the connection info, used to distinguish different host/port/user combinations and avoid conflicts. |

The general workflow is:

```bash
ssh ollama-tunnel
```

If you only want to establish the tunnel without opening a remote shell, you can use:

```bash
ssh -N ollama-tunnel
```

Then access locally at:

```text
http://127.0.0.1:11435
```

which is equivalent to accessing on the remote server:

```text
http://127.0.0.1:11434
```

### Agent Configuration

Ollama's API is compatible with most agents; below are examples using OpenCode and DeepSeek Harness.

If the agent runs on the local machine with the SSH forwarding set up, the API endpoint is:

```text
http://127.0.0.1:11435/v1
```

If it runs directly on the Ollama server, use:

```text
http://127.0.0.1:11434/v1
```

#### OpenCode

Edit the client's `~/.config/opencode/opencode.json`. If a configuration already exists, merge in the following fields:

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

Then restart OpenCode and switch using `/models`.

References: [OpenCode Ollama configuration](https://opencode.ai/docs/providers/#ollama), [config file location](https://opencode.ai/docs/config/#global).

#### DeepSeek Harness

See the [DeepSeek Harness model configuration documentation](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/providers.zh.md) for details.

- "Provider ID" can be anything; it's just for your own identification.
- "Display name" can be anything; it's just for your own identification.
- Set the "API endpoint" to `http://127.0.0.1:11435/v1` (or another custom port if you changed it).
- The protocol is `openai-completions`.
- The "API key" can be anything, e.g. `ollama` (yes, because Ollama doesn't validate the key).

2026/09/16
