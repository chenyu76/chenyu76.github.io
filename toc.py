'''
<h1> 文档索引 </h1>
<p style="line-height:100%">│</br>
│</br>
├──<a href="./index.html"> index.html </a><br/>
│</br>
├──<a href="#./README.md"> README </a><br/>
│</br>
├──skipping-classes-for-introduction-to-entrepreneurship-for-the-future<br/>
│　　│</br>
│　　└──<a href="skipping-classes-for-introduction-to-entrepreneurship-for-the-future/index.html"> index.html </a><br/>
│</br>
├──<a href="#./about.md"> about </a><br/>
│</br>
├──<a href="./toc.py"> toc.py </a><br/>
│</br>
├──文章<br/>
│　　│</br>
│　　├──<a href="#文章/琐事.md"> 琐事 </a><br/>
│　　│</br>
│　　├──<a href="#文章/最伟大的科幻小说.md"> 最伟大的科幻小说 </a><br/>
│　　│</br>
│　　├──<a href="#文章/日暮.md"> 日暮 </a><br/>
│　　│</br>
│　　└──<a href="#文章/四千三百年.md"> 四千三百年 </a><br/>
│</br>
└──测试页<br/>
　　　│</br>
　　　├──<a href="#测试页/equationtest.md"> equationtest </a><br/>
　　　│</br>
　　　└──<a href="测试页/make_tree.py"> make_tree.py </a><br/></p>
<!--'''
# 执行此python文件以更新上面的目录
import os

def folder_tree(path, depth = 0, startpath = None, line_d = 0): 
    table = []
    items = os.listdir(path)
    items = [
        s for s in items if (os.path.isdir(os.path.join(path, s)) and (not s.startswith('.'))) or (os.path.isfile(os.path.join(path, s)) and any([s.endswith(x) for x in [".md", ".py", ".txt", ".tex", ".html"] ])) 
    ]

    for index, item in enumerate(items):
        is_last = index == len(items)-1
        s = ""
        line = line_d
        for i in range(depth):
            s+="│　　" if line & 1 else "　　　" 
            line>>=1
        style = s + "│</br>\n" + s + ("└──" if is_last else "├──")
        if os.path.isdir(os.path.join(path, item)):
            table.append(style + item + "<br/>")
            table+=folder_tree(os.path.join(path, item), depth+1, startpath, (0 if is_last else 2**depth) + line_d)
        else:
            rpath = os.path.relpath((startpath if startpath else path), startpath)
            if item.endswith(".md"):
                table.append(style + f'<a href="#{os.path.join(rpath, item)}"> {item.rstrip(".md")} </a><br/>')
            else:
                table.append(style + f'<a href="{os.path.join(rpath, item)}"> {item} </a><br/>')
    return table
        
t = '\n<p style="line-height:100%">│</br>\n' + "\n".join(folder_tree(os.path.dirname(os.path.abspath(__file__)))) + "</p>\n"

# 读取原始文件内容
with open(__file__, 'r', encoding='utf-8') as file:
    content = file.read()

start_tag = "</h1>"
end_tag = "<!--"
start_idx = content.find(start_tag) + len(start_tag)
end_idx = content.find(end_tag)
# 写回修改后的内容到文件
with open(__file__, 'w', encoding='utf-8') as file:
    file.write(content[:start_idx] + t + content[end_idx:])
# -->