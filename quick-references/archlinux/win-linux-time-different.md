# Linux + Windows 双系统时间差了八个小时

因为 Windows 和 Linux 在看待主板硬件时间（RTC）时，采用了不同的逻辑。

- **Linux**：默认认为主板上的硬件时间是 **UTC（世界标准时间）**。
- **Windows**：默认认为主板上的硬件时间就是 \*_Local Time（当地时间）_。

## 解决方案（任选其一）

### 方案一：修改 Linux

让 Linux 和 Windows 一样，直接将主板时间视为当地时间。

1. 进入 Linux 系统。
2. 打开终端（Terminal），复制并运行以下命令：

```bash
timedatectl set-local-rtc 1 --adjust-system-clock
```

3. 检查是否修改成功，运行：

```bash
timedatectl
```

看输出中的 `RTC in local TZ: yes` 是否为 **yes**。如果是，就大功告成了！

注意，这可能会警告你

```
Warning: The system is configured to read the RTC time in the local time zone.
         This mode cannot be fully supported. It will create various problems
         with time zone changes and daylight saving time adjustments. The RTC
         time is never updated, it relies on external facilities to maintain it.
         If at all possible, use RTC in UTC by calling
         'timedatectl set-local-rtc 0'.
```

### 方案二：修改 Windows

让 Windows 和 Linux 一样，将主板时间视为 UTC 时间。

下面两个方法任选一个。

#### 图形界面方法

1. 进入 Windows 系统。
2. 按下 `Win + R` 键，输入 `regedit` 回车，打开**注册表编辑器**。
3. 导航到以下路径：
   `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\TimeZoneInformation`
4. 在右侧空白处点击右键 -> **新建** -> **DWORD (32位)值**。
5. 将其命名为：`RealTimeIsUniversal`
6. 双击这个新建的值，将“数值数据”由 `0` 改为 `1`，基数选择“十六进制”，点击确定。
7. 重启电脑。

#### 命令行方法

需要管理员

```powershell
Reg add HKLM\SYSTEM\CurrentControlSet\Control\TimeZoneInformation /v RealTimeIsUniversal /t REG_DWORD /d 1 /f
```

> ⚠️ **注意**：方案二在某些 Windows 大版本更新后，可能会因为注册表被重置而偶尔失效。

2026/5/18
