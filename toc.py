'''
<h1> 文档目录 </h1>
<p><a href="?f=README.md"> README </a></p>
<p><a href="?f=about.md"> about </a></p>
<!--'''
# 执行此python文件以更新目录
import os

def list_md_files():
    directory = os.path.dirname(os.path.abspath(__file__))
    md_files = []
    # 遍历指定目录及其子目录
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.md'):
                md_files.append(os.path.join(file))
    return md_files

md_files = list_md_files()
md_files = [f'<p><a href="?f={file}"> {file.rstrip(".md")} </a></p>' for file in md_files]

print(md_files)
# 读取原始文件内容
with open(__file__, 'r', encoding='utf-8') as file:
    content = file.read()

start_tag = "</h1>"
end_tag = "<!--"
start_idx = content.find(start_tag) + len(start_tag)
end_idx = content.find(end_tag)
# 写回修改后的内容到文件
with open(__file__, 'w', encoding='utf-8') as file:
    file.write(content[:start_idx] + '\n' + '\n'.join(md_files) + '\n' + content[end_idx:])
# -->