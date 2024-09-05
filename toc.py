'''
<h1> 文档索引 </h1>

<!--'''
# 执行此python文件以更新上面的目录
import os
from datetime import datetime

clickable_extension = [".md", ".txt", ".tex", ".html", ".js"] # 菜单中可点击的文件后缀
article_extension = [".md", ".js"] # 视为文章的文件后缀

# 创建文件目录树
def folder_tree(path, depth = 0, startpath = None, line_d = 0): 
    table = []
    items = os.listdir(path)
    items = [
        s for s in items if (os.path.isdir(os.path.join(path, s)) and (not s.startswith('.'))) or (os.path.isfile(os.path.join(path, s)) and any([s.endswith(x) for x in clickable_extension ])) 
    ]
    def item_to_button():
            rpath = os.path.relpath((startpath if startpath else path), startpath) # 相对路径
            withSharp = False
            for ex in article_extension:  # 这些视为文章
                if item.endswith(ex):
                    withSharp = True
                    if ex == '.js' and ("program" in rpath): # js 文章需要排除指定地方的
                        break
                    table.append(style + f'<a href="#{os.path.join(rpath, item)}"> {item.rstrip(ex)} </a><br/>')
                    break
            if not withSharp: # 其余仅为可点击项
                table.append(style + f'<a href="{os.path.join(rpath, item)}"> {item} </a><br/>')

    for index, item in enumerate(items):
        is_last = index == len(items)-1
        s = ""
        line = line_d
        for _ in range(depth):
            s+="│　　" if line & 1 else "　　　" 
            line>>=1
        style = s + "│</br>\n" + s + ("└──" if is_last else "├──")
        # 根据特定规则将文件视为文章或者直接打开，并创建不同的<a>标签
        # 这是一个目录，递归调用
        if os.path.isdir(os.path.join(path, item)):
            # item 的子项是t
            t = folder_tree(os.path.join(path, item), depth+1, startpath, (0 if is_last else 1<<depth) + line_d)
            # 有内容才显示，
            # 如果只有一个内容，简略显示; 未实现
            # if len(t) == 1:
            #     print(item)
            #     items = os.listdir(path)
            #     print(style + item + "/" + item_to_button(t[0]) if os.path.isfile(t[0]) else t[0])
            #     table.append(style + item + "/" + item_to_button(t[0]) if os.path.isfile(t[0]) else t[0])
            if len(t):
                table.append(style + item + "<br/>")
                # 太长了就插入显示全部按钮
                if len(t) > 10:
                    t.insert(7, s + "│　　" + s + '''<a href="javascript:void(0);" style="font-size: 70%;line-height:100%" onclick="toggleNextNextVis(this)">显示全部</a></br><span class="hiddenContent">''')
                    t.append("</span>")
                table+=t
        # 这是一个文件，判断是否显示
        else:
            item_to_button()
    return table

# 未使用，修改时间是否准确？
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
        # 诶这里为什么有个 .rstrip 应该可以删掉？
        relative_path = os.path.relpath(file, current_dir).rstrip(".md")
        recent_files_with_dates.append((relative_path, mod_date))
    
    return recent_files_with_dates


def random_article_js_g(path, dir_path):
    # 读取原始文件内容
    with open(path, 'r', encoding='utf-8') as file:
        content = file.read()

    start_tag = "//begin"
    end_tag = "//end"
    current_dir = os.path.dirname(path)
    artc = []
    for root, dirs, files in os.walk(current_dir):
        # 排除隐藏目录
        dirs = [d for d in dirs if not d.startswith('.')]
        # 获取非隐藏的Markdown文件
        for file in files:
            if file.endswith('.md') and not file.startswith('.'):
                artc.append('"#' + dir_path + file + '"')
    start_idx = content.find(start_tag) + len(start_tag)
    end_idx = content.find(end_tag)
    # 写回修改后的内容到文件
    with open(path, 'w', encoding='utf-8') as file:
        file.write(content[:start_idx] + ',\n'.join(artc) + content[end_idx:])



#r = '<p style="line-height:200%"></br>\n' + '</br>\n'.join([f'{i[1]} <a href="#{i[0]}"> {i[0]} </a>' for i in find_recent_markdown_files()]) + "</p>\n"
def rewrite_self():
    # 树
    t = '\n<p style="line-height:100%"></br>│</br>\n' + "\n".join(folder_tree(os.path.dirname(os.path.abspath(__file__)))) + "</p>\n"
    # 读取原始文件内容
    with open(__file__, 'r', encoding='utf-8') as file:
        content = file.read()

    start_tag = "'''"
    end_tag = "<!--"
    start_idx = content.find(start_tag) + len(start_tag)
    end_idx = content.find(end_tag)
    # 写回修改后的内容到文件
    with open(__file__, 'w', encoding='utf-8') as file:
        file.write(content[:start_idx] + "\n<h1> 文档索引 </h1>\n" + t + content[end_idx:])


if __name__ == "__main__":
    rewrite_self()
    jspath = os.path.join(os.path.dirname(os.path.abspath(__file__)), "摘抄/-随机一篇-.js")
    random_article_js_g(jspath, "摘抄/")
# -->