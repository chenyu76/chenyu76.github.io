"""
<h2> 文档索引 </h2>

<!--"""

# 执行此python文件以更新上面的目录
import os
from datetime import datetime
import recommend

clickable_extension = [".md", ".txt", ".tex", ".html", ".js"]  # 菜单中可点击的文件后缀
article_extension = [".md", ".js"]  # 视为文章的文件后缀


# 创建文件目录树
def folder_tree(path, depth=0, startpath=None, line_d=0):
    table = []
    items = os.listdir(path)
    items = [
        s
        for s in items
        if (os.path.isdir(os.path.join(path, s)) and (not s.startswith(".")))
        or (
            os.path.isfile(os.path.join(path, s))
            and any([s.endswith(x) for x in clickable_extension])
        )
    ]
    # 排除掉 program 等 文件夹里的 js
    items = [
        i
        for i in items
        if not (
            i.split(".")[-1] == "js"
            and ("program" in path or "img" in path or "libs" in path)
        )
    ]

    def item_to_button():
        rpath = os.path.relpath(
            (startpath if startpath else path), startpath
        )  # 相对路径
        withSharp = False
        for ex in article_extension:  # 这些视为文章
            if item.endswith(ex):
                withSharp = True
                table.append(
                    style
                    + f'<a href="#{os.path.join(rpath, item)}"> {item.rstrip(ex)} </a><br/>'
                )
                break
        if not withSharp:  # 其余仅为可点击项
            table.append(
                style + f'<a href="{os.path.join(rpath, item)}"> {item} </a><br/>'
            )

    for index, item in enumerate(items):
        is_last = index == len(items) - 1
        s = ""
        line = line_d
        for _ in range(depth):
            s += "│　　" if line & 1 else "　　　"
            line >>= 1
        style = s + "│</br>\n" + s + ("└──" if is_last else "├──")
        # 根据特定规则将文件视为文章或者直接打开，并创建不同的<a>标签
        # 这是一个目录，递归调用
        if os.path.isdir(os.path.join(path, item)):
            # item 的子项是t
            t = folder_tree(
                os.path.join(path, item),
                depth + 1,
                startpath,
                (0 if is_last else 1 << depth) + line_d,
            )
            # 有内容才显示，
            if len(t):
                table.append(style + item + "<br/>")
                # 太长且同时是根节点时就插入显示全部按钮
                if len(t) > 10 and line_d == 0:
                    # 这里的s是本次递归调用的s,但其实应该插入 下一次递归调用时的s,但目前没有什么大问题先使用临时解决方案
                    t.insert(
                        7,
                        s
                        + "│　　"
                        + s
                        + """<a href="javascript:void(0);" style="font-size: 80%;line-height:100%" onclick="toggleNextNextVis(this)">
显示全部</a></br>
<span class="hiddenContent">""",
                    )
                    t.append("</span>")
                table += t
        # 这是一个文件，判断是否显示
        else:
            item_to_button()
    return table


def generate_recommand(recommend):
    list = []
    for i in recommend:
        if i["date"] > 10000000:
            i["date"] = datetime.strptime(str(i["date"]), "%Y%m%d").strftime("%d %B %Y")
        elif i["date"] > 100000:
            i["date"] = datetime.strptime(str(i["date"]), "%Y%m").strftime("%B %Y")
        elif i["date"] > 100000:
            i["date"] = datetime.strptime(str(i["date"]), "%m%d").strftime("%d %B")
        else:
            i["date"] = "----"
        list.append(
            "<li>"
            + f'<a href="#{i["link"]}">'
            + (
                i["link"].split(".")[-2].split("/")[-1]
                if "info" not in i.keys()
                else i["info"]
            )
            + "</a> <small>("
            + i["date"]
            + ")</small> </li>"
        )

    return "<ul>\n" + "\n".join(list) + "\n</ul>"


# 生成 “随机一篇” 的可用文章
def random_article_js_g(path, dir_path):
    # 读取原始文件内容
    with open(path, "r", encoding="utf-8") as file:
        content = file.read()

    start_tag = "//begin"
    end_tag = "//end"
    current_dir = os.path.dirname(path)
    artc = []
    for root, dirs, files in os.walk(current_dir):
        # 排除隐藏目录
        dirs = [d for d in dirs if not d.startswith(".")]
        # 获取非隐藏的Markdown文件
        for file in files:
            if file.endswith(".md") and not file.startswith("."):
                artc.append('"#' + dir_path + file + '"')
    start_idx = content.find(start_tag) + len(start_tag)
    end_idx = content.find(end_tag)
    # 写回修改后的内容到文件
    with open(path, "w", encoding="utf-8") as file:
        file.write(content[:start_idx] + ",\n".join(artc) + content[end_idx:])


# r = '<p style="line-height:200%"></br>\n' + '</br>\n'.join([f'{i[1]} <a href="#{i[0]}"> {i[0]} </a>' for i in find_recent_markdown_files()]) + "</p>\n"
def rewrite_self():
    # 树
    t = (
        '\n<p style="text-indent: 0;line-height:100%">/root</br>\n'
        + "\n".join(folder_tree(os.path.dirname(os.path.abspath(__file__))))
        + "</p>\n"
    )
    # 推荐
    r = generate_recommand(recommend.recommend)
    # 读取原始文件内容
    with open(__file__, "r", encoding="utf-8") as file:
        content = file.read()

    start_tag = "\"\"\""
    end_tag = "<!--"
    start_idx = content.find(start_tag) + len(start_tag)
    end_idx = content.find(end_tag)
    # 写回修改后的内容到文件
    with open(__file__, "w", encoding="utf-8") as file:
        file.write(
            content[:start_idx]
            + "\n<h2> 文档索引 </h2>\n"
            + t
            + "\n<h2> 推荐内容 </h2>\n"
            + r
            + "\n"
            + content[end_idx:]
        )


if __name__ == "__main__":
    rewrite_self()
    jspath = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "摘抄/-随机一篇-.js"
    )
    random_article_js_g(jspath, "摘抄/")
# -->
