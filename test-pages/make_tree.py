import os
def folder_tree(path, depth = 0, startpath = None, line_d = 0): 
    table = []
    items = os.listdir(path)
    for index, item in enumerate(items):
        is_last = index == len(items)-1
        s = ""
        line = line_d
        for i in range(depth):
            s+="│   " if line & 1 else "    " 
            line>>=1
        style = s + ("└── " if is_last else "├── ")
        if os.path.isdir(os.path.join(path, item)):
            table.append(style + item + "<br/>")
            table+=folder_tree(os.path.join(path, item), depth+1, startpath, (0 if is_last else 2**depth) + line_d)
        else:
            rpath = os.path.relpath((startpath if startpath else path), startpath)
            table.append(style + f'<a href=#{os.path.join(rpath, item)}"> {item.rstrip(".md")} </a><br/>')

    return table
        
t = "<p>" + "\n".join(folder_tree(os.path.dirname(os.path.abspath(__file__)))) + "</p>"