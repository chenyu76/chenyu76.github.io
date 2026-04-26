# MATLAB Engine for Python cannot enable executable stack as shared object requires: Invalid argument

首先要确定使用的python的版本正确，比如我的2023b只支持到Python
3.11，所以我先通过

```bash
yay -S python311
```

安装。

然后在要运行脚本的路径运行：

```bash
python3.11 -m venv ./venv
./venv/bin/pip install '~/Application/MATLAB/R2023b/extern/engines/python'
```

这里的路径是MATLAB的安装路径，可以在MATLAB中执行

```matlab
fullfile(matlabroot,"extern","engines","python")
```

获得。

但是此时运行脚本报错了：

```text
Traceback (most recent call last):
  File "<string>", line 1, in <module>
  File "/venv/lib/python3.11/site-packages/matlab/engine/__init__.py", line 76, in <module>
    raise EnvironmentError(secondExceptionMessage)
OSError: Please reinstall MATLAB Engine for Python or contact MathWorks Technical Support for assistance:
First issue: libCppMicroServices.so.3.7.6: cannot enable executable stack as shared object requires: Invalid argument
Second issue: libCppMicroServices.so.3.7.6: cannot enable executable stack as shared object requires: Invalid argument
```

这是因为，libCppMicroServices库需要可执行堆栈但被禁止了。需要在终端中设置这个python二进制的可执行堆栈：

```bash
rm ./venv/bin/python3.11 # remove the soft link
cp /usr/bin/python3.11 ./venv/bin/python3.11 # replace with a copy
patchelf --set-execstack ./venv/bin/python3.11
```
