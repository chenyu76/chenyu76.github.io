'''
<h1> 文档索引 </h1>
<p>│</br>
├──　<a href="./index.html"> index.html </a><br/>
├──　<a href="#./README.md"> README </a><br/>
├──　skipping-classes-for-introduction-to-entrepreneurship-for-the-future<br/>
│　　　└──　<a href="skipping-classes-for-introduction-to-entrepreneurship-for-the-future/index.html"> index.html </a><br/>
├──　<a href="#./about.md"> about </a><br/>
├──　<a href="./toc.py"> toc.py </a><br/>
└──　目录测试<br/>
　　　　├──　<a href="#目录测试/测试页.md"> 测试页 </a><br/>
　　　　├──　<a href="#目录测试/测试页2.md"> 测试页2 </a><br/>
　　　　├──　doc<br/>
　　　　│　　　├──　<a href="#目录测试/doc/a.md"> a </a><br/>
　　　　│　　　└──　<a href="#目录测试/doc/b.md"> b </a><br/>
　　　　├──　doc2<br/>
　　　　│　　　└──　<a href="#目录测试/doc2/文本文件.md"> 文本文件 </a><br/>
　　　　└──　<a href="目录测试/make_tree.py"> make_tree.py </a><br/></p>
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
            s+="│　　　" if line & 1 else "　　　　" 
            line>>=1
        style = s + ("└──　" if is_last else "├──　")
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
        
t = "\n<p>│</br>\n" + "\n".join(folder_tree(os.path.dirname(os.path.abspath(__file__)))) + "</p>\n"

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