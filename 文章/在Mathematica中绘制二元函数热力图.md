# 在Mathematica中绘制二元函数热力图

> 给wxf写的

## 将Mathematica 程序导出到Mathlab

你可以用很多种方法导出，我写了个简陋的脚本，粘到程序里就行：
```Mathematica
SetDirectory[NotebookDirectory[]];
ToMATLAB[f_, name_] := 
  Export[name <> ".m", 
   "function u = " <> name <> "(x,t)\n u=abs(" <> 
    StringReplace[
     ToString[InputForm[f]], {
      "Im" -> "imag", "Abs" -> "abs", "Sin" -> "sin", "Cos" -> "cos", 
      "Conjugate" -> "conjugate", "Sqrt" -> "sqrt", "E" -> "exp(1)", 
      "I" -> "(1i)", "*" -> ".*", "^" -> ".^", "/" -> "./", 
      "[" -> "(", "]" -> ")"}] <> ");", "Text"];
ToMATLAB[ <Function Symbol> , <MATLAB function name string> ]
```
例如你的函数叫`v1[x,t]`,想导出成`v1.m`：
```
ToMATLAB[ v1[x,t] , "v1" ]
```
记得给参数赋值！

## 在 Matlab 里面画图

在与你导出的函数文件的同一目录下，创建matlab脚本,包含以下内容，根据自己需求修改
```matlab
draw_wave(-3,3,-0.4,0.4,500,'plot title',{'u1', 'u2', 'v'});

function draw_wave(lrx, urx, lrt, urt, stps, titleName, funcNames)
% draw_wave 函数
% 输入参数：
% lrx, urx - x 的下界和上界
% lrt, urt - t 的下界和上界
% stps - 精度 总范围除精度即是步长（精度），由于我很懒，变量名没有修改
% titleName 图像的标题名称，同时也会用这个名称保存图片
% funcNames 需要绘制的函数名称列表，需要当前目录下对应的.m文件存在

% 如果你要用高精度包,添加这个
%addpath('C:\Users\soliton\Documents\Multiprecision Computing Toolbox\')
%mp.Digits(50);
% 然后将下面的 x, t, 等号右边的内容用 mp(  ) 括起来

% 视角参数设置
az = 55; % 方位角
el = 8; % 仰角

% 完全俯视的参数
% az = 0;
% el = 90;

% 生成 x 和 t 的值
x = lrx:((urx - lrx)/stps):urx;
t = lrt:((urt - lrt)/stps):urt;

% 创建 x 和 t 的网格
[X, T] = meshgrid(x, t);

% 处理每个输入的函数名
for i = 1:length(funcNames)
    funcName = funcNames{i};
    disp(strcat("drawing ", funcName))
    tic
    
    % 调用指定的函数
    absu = abs(feval(funcName, X, T));
    
    % 创建图形窗口
    fig = figure;
    
    % 绘制三维曲面图
    surf(X, T, absu);
    %axis square;
    shading interp;
    % 设置大小
    set(gca, 'PlotBoxAspectRatio', [1 1 0.7]);

    % 设置范围
    xlim([lrx urx]);
    ylim([lrt urt]);
    
    % 设置坐标轴标签和标题（使用 LaTeX 解释器）
    xlabel('$x$', 'Interpreter', 'latex');
    ylabel('$t$', 'Rotation', 0, 'Interpreter', 'latex');
    title(strcat('$|', funcName, '|$'), 'Interpreter', 'latex');

    % 使用 jet 颜色图
    colormap(jet);
       
    % 保存图片
    picname = [titleName, funcName, '.png'];
    print(fig, picname, '-dpng', '-r600');

    toc
end
end
```

2025/03/03
