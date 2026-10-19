# 在 Arch Linux 上使用 CanoKey 登录 GDM 和认证 sudo

通过 `pam-u2f`，可以用触摸 CanoKey 的方式代替 GDM 登录和 sudo 认证时的账户密码，同时保留密码作为备用。

## USB 权限

见[CanoKey 官方 Linux 系统配置](https://docs.canokeys.org/zh-hans/userguide/setup/#_3_1_udev)。摘录如下

文件：`/etc/udev/rules.d/69-canokeys.rules`

```udev
# GnuPG/pcsclite
SUBSYSTEM!="usb", GOTO="canokeys_rules_end"
ACTION!="add|change", GOTO="canokeys_rules_end"
ATTRS{idVendor}=="20a0", ATTRS{idProduct}=="42d4", ENV{ID_SMARTCARD_READER}="1"
LABEL="canokeys_rules_end"

# FIDO2
# note that if you find this line in 70-fido.rules, you can ignore it
KERNEL=="hidraw*", SUBSYSTEM=="hidraw", ATTRS{idVendor}=="20a0", ATTRS{idProduct}=="42d4", TAG+="uaccess", GROUP="plugdev", MODE="0660"

# make this usb device accessible for users, used in WebUSB
# change the mode so unprivileged users can access it, insecure rule, though
SUBSYSTEMS=="usb", ATTR{idVendor}=="20a0", ATTR{idProduct}=="42d4", MODE:="0666"
# if the above works for WebUSB (web console), you may change into a more secure way
# choose one of the following rules
# note if you use "plugdev", make sure you have this group and the wanted user is in that group
#SUBSYSTEMS=="usb", ATTR{idVendor}=="20a0", ATTR{idProduct}=="42d4", GROUP="plugdev", MODE="0660"
#SUBSYSTEMS=="usb", ATTR{idVendor}=="20a0", ATTR{idProduct}=="42d4", TAG+="uaccess"
```

```bash
sudoedit /etc/udev/rules.d/69-canokeys.rules # 然后在文件中加入上面内容
sudo udevadm control --reload-rules && sudo udevadm trigger
```

## 安装 PAM 模块

见 [ArchWiki：Installing the PAM module](https://wiki.archlinux.org/title/Universal_2nd_Factor#Installing_the_PAM_module)。

```bash
sudo pacman -Syu pam-u2f
```

`pam-u2f` 也支持 CanoKey 等兼容 U2F/FIDO2 的密钥，不限于 YubiKey。

## 修改前备份

见 [ArchWiki：Passwordless sudo](https://wiki.archlinux.org/title/Universal_2nd_Factor#Passwordless_sudo)。修改认证配置前，打开一个独立终端并保留 root shell，方便配置出错时恢复：

```bash
sudo -i
```

建议在这个 root shell 中备份配置，直到全部测试完成再关闭。

## 登记密钥

见 [ArchWiki：Adding a key](https://wiki.archlinux.org/title/Universal_2nd_Factor#Adding_a_key) 和 [pamu2fcfg 手册](https://developers.yubico.com/pam-u2f/Manuals/pamu2fcfg.1.html)。

插入 CanoKey，在需要使用密钥认证的普通用户账户下执行：

```bash
mkdir -p ~/.config/Yubico
pamu2fcfg -u "$(id -un)" \
  -o pam://canokey-local \
  -i pam://canokey-local \
  > ~/.config/Yubico/canokey-pam
```

如果提示输入 PIN，输入密钥的 FIDO2 PIN，按回车后按设备提示触摸。

完成后可以检查输出文件：

```bash
cat ~/.config/Yubico/canokey-pam
```

文件应包含以当前用户名和冒号开头的一行登记信息。

### 系统登记文件

见 [pam_u2f 手册的 authfile 和 Caveats](https://developers.yubico.com/pam-u2f/Manuals/pam_u2f.8.html)。

本文选择 `/etc/u2f_mappings`，让登录前即可读取登记信息，不依赖家目录解密。

```bash
chmod 600 ~/.config/Yubico/canokey-pam
sudo install -o root -g root -m 600 \
  ~/.config/Yubico/canokey-pam /etc/u2f_mappings
```

注意这条命令会覆盖已有的 `/etc/u2f_mappings`。后续配置 PAM 读取 `/etc/u2f_mappings`，不再读取用户目录中的中间副本。

## sudo：触摸认证，密码备用

见 [ArchWiki：Passwordless sudo](https://wiki.archlinux.org/title/Universal_2nd_Factor#Passwordless_sudo)，参数定义见 [pam_u2f 手册](https://developers.yubico.com/pam-u2f/Manuals/pam_u2f.8.html)。

```bash
sudoedit /etc/pam.d/sudo
```

在原有第一条 `auth` 规则前加入下面一整行，保留原有其他配置：

```pam
auth sufficient pam_u2f.so authfile=/etc/u2f_mappings origin=pam://canokey-local appid=pam://canokey-local cue userpresence=1 pinverification=0 userverification=0
```

例如：

```pam
#%PAM-1.0
auth sufficient pam_u2f.so authfile=/etc/u2f_mappings origin=pam://canokey-local appid=pam://canokey-local cue userpresence=1 pinverification=0 userverification=0
auth        include     system-auth
account     include     system-auth
session     include     system-auth
session     optional    pam_systemd.so class=none
```

`sufficient` 使密钥认证成功时可以提前通过 auth 阶段，前提是此前没有未满足的 `required` 失败；失败时继续后面的密码认证。保留 `auth include system-auth` 才能继续使用原有密码路径。

| 参数 | 作用 |
| --- | --- |
| `authfile` | 指定系统登记文件 |
| `origin`、`appid` | 与登记时使用的标识一致 |
| `cue` | 显示触摸提示 |
| `userpresence=1` | 要求触摸确认 |
| `pinverification=0`、`userverification=0` | 不主动要求 PIN 或生物识别 |

## GDM：触摸登录，密码备用

GDM 是 [Gnome](https://www.gnome.org/) 附带的登录管理器。

[ArchWiki：GDM login](https://wiki.archlinux.org/title/Universal_2nd_Factor#GDM_login) 提供的是使用 `required` 的双因素示例。下面将其调整为 `sufficient`，用于触摸替代密码，并保留原有密码路径。

### 建立本地配置

见 [pam.d(5)](https://man.archlinux.org/man/pam.d.5)。

先复制默认配置：

```bash
sudo cp -a /usr/lib/pam.d/gdm-password /etc/pam.d/gdm-password
```

如果已经存在，直接编辑，不要再次复制覆盖：

```bash
sudoedit /etc/pam.d/gdm-password
```

`/etc/pam.d/` 中的同名文件会完整覆盖 `/usr/lib/pam.d/` 中的软件包默认文件。
使用 `/etc` 保存本机调整，可以保留软件包提供的默认文件，方便以后比较和恢复。

### 添加认证规则

将下面三行放在原有第一条 `auth` 规则前：

```pam
auth required pam_shells.so
auth requisite pam_nologin.so
auth sufficient pam_u2f.so authfile=/etc/u2f_mappings origin=pam://canokey-local appid=pam://canokey-local cue userpresence=1 pinverification=0 userverification=0
```

前两行保留 Arch  `system-login` 认证栈中的 shell 与禁止登录状态检查。
以常见的 GDM 默认配置为例，修改后为：

```pam
#%PAM-1.0

auth       required                    pam_shells.so
auth       requisite                   pam_nologin.so
auth       sufficient                  pam_u2f.so authfile=/etc/u2f_mappings origin=pam://canokey-local appid=pam://canokey-local cue userpresence=1 pinverification=0 userverification=0

auth       include                     system-local-login
auth       optional                    pam_gnome_keyring.so

account    include                     system-local-login

password   include                     system-local-login
password   optional                    pam_gnome_keyring.so use_authtok

session    include                     system-local-login
session    optional                    pam_gnome_keyring.so auto_start
```

注意：不要把 Wiki 双因素示例中的 `nouserok` 加进这条 `sufficient` 规则。[模块手册](https://developers.yubico.com/pam-u2f/Manuals/pam_u2f.8.html)指出，`nouserok` 会使未登记用户或登记文件缺失等情况返回成功，在这里可能导致跳过密码认证。

## 其它

### 登记提示 FIDO_ERR_USER_ACTION_TIMEOUT

例如：

```text
Enter PIN for /dev/hidraw14:
error: fido_dev_make_cred (47) FIDO_ERR_USER_ACTION_TIMEOUT
```

因为输入密钥后要摸一下canokey的按钮，不要傻等着。

### 更换或增加密钥

先按“修改前备份”保存配置，再将新登记写到新文件，检查成功后合并或替换 `/etc/u2f_mappings`。如果更换 `pam://canokey-local`，需要重新登记，并同步修改 sudo、GDM 两处的标识。

多把密钥的格式见 [ArchWiki：Adding a key](https://wiki.archlinux.org/title/Universal_2nd_Factor#Adding_a_key) 和 [pamu2fcfg 的 `-n` 参数](https://developers.yubico.com/pam-u2f/Manuals/pamu2fcfg.1.html)。同一账户的多把密钥放在同一行，后续密钥用 `-n` 省略用户名。

密钥丢失时，用密码登录后删除系统登记文件中的旧凭据，或替换为新的有效登记。

### 升级后比较 GDM 配置

```bash
diff -u /usr/lib/pam.d/gdm-password /etc/pam.d/gdm-password
```

参见[pacman/Pacnew and Pacsave](https://wiki.archlinux.org/title/Pacman/Pacnew_and_Pacsave)

### 撤销密钥认证

删除相应pam文件中的对应内容即可。

2026-10-19
