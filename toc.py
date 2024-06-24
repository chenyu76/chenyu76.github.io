'''

<!--'''
# 执行此python文件以更新上面的目录
import os
from datetime import datetime

def folder_tree(path, depth = 0, startpath = None, line_d = 0): 
    table = []
    items = os.listdir(path)
    items = [
        s for s in items if (os.path.isdir(os.path.join(path, s)) and (not s.startswith('.'))) or (os.path.isfile(os.path.join(path, s)) and any([s.endswith(x) for x in [".md", ".txt", ".tex", ".html"] ])) 
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
            t = folder_tree(os.path.join(path, item), depth+1, startpath, (0 if is_last else 1<<depth) + line_d)
            if len(t):
                table.append(style + item + "<br/>")
                table+=t
        else:
            rpath = os.path.relpath((startpath if startpath else path), startpath)
            if item.endswith(".md"):
                table.append(style + f'<a href="#{os.path.join(rpath, item)}"> {item.rstrip(".md")} </a><br/>')
            else:
                table.append(style + f'<a href="{os.path.join(rpath, item)}"> {item} </a><br/>')
    return table
        
t = '\n<p style="line-height:100%"></br>│</br>\n' + "\n".join(folder_tree(os.path.dirname(os.path.abspath(__file__)))) + "</p>\n"

def find_recent_markdown_files(num_files = 5, current_dir = os.path.dirname(os.path.abspath(__file__))):
    
    # 搜索所有的Markdown文件（非隐藏文件，非隐藏目录）
    markdown_files = []
    for root, dirs, files in os.walk(current_dir):
        # 排除隐藏目录
        dirs = [d for d in dirs if not d.startswith('.')]
        # 获取非隐藏的Markdown文件
        for file in files:
            if file.endswith('.md') and not file.startswith('.'):
                markdown_files.append(os.path.join(root, file))
    
    # 获取文件的修改时间并排序
    markdown_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
    
    recent_files_with_dates = []
    for file in markdown_files[:num_files]:
        mod_time = os.path.getmtime(file)
        mod_date = datetime.fromtimestamp(mod_time).strftime('%Y-%m-%d')
        relative_path = os.path.relpath(file, current_dir).rstrip(".md")
        recent_files_with_dates.append((relative_path, mod_date))
    
    return recent_files_with_dates


r = '<p style="line-height:200%"></br>\n' + '</br>\n'.join([f'{i[1]} <a href="#{i[0]}"> {i[0]} </a>' for i in find_recent_markdown_files()]) + "</p>\n"

# 读取原始文件内容
with open(__file__, 'r', encoding='utf-8') as file:
    content = file.read()

start_tag = "'''"
end_tag = "<!--"
start_idx = content.find(start_tag) + len(start_tag)
end_idx = content.find(end_tag)
# 写回修改后的内容到文件
with open(__file__, 'w', encoding='utf-8') as file:
    file.write(content[:start_idx] + "\n<h1> 最近修改 </h1>\n" + r + "</br></br>\n<h1> 文档索引 </h1>\n" + t + content[end_idx:])
# -->