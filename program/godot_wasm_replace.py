#!/bin/python
import sys
import os

'''
修改 godot 导出的 web 程序 js，
让不同的 godot web 程序可以
使用相同的wasm文件，减小空间占用

通过命令行执行:
传递文件路径作为参数，
文件路径为导出项目名.js

参考：
https://www.reddit.com/r/godot/comments/pjuqsr/html5_could_godots_wasm_file_be_hosted_in_a/?sort=confidence
'''
# 使用的wasm路径会被替换为此路径
newpath = "/program/godot_4.3stable.wasm"

# 目前固定的一些需要修改的 js 文件路径， 省去参数调用
jspath = [
    "./7-piece-puzzle/puzzle.js",
    "./TractorBattle3D/tb.js", 
    "./WheelOfFortune/WheelOfFortune.js", 
    "./15s-Jan-ken/jan-ken.js",
    "./colliding_balls/cb.js"
]

def replace_load_promise(file_path):
    try:
        # 读取文件内容
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.readlines()

        # 替换目标行
        new_content = []
        for line in content:
            new_content.append(line.replace(
                'loadPromise = preloader.loadPromise(`${loadPath}.wasm`, size, true);',
                f'loadPromise = preloader.loadPromise(`{newpath}`, size, true);'
                )
            )

        # 将替换后的内容写回文件
        with open(file_path, 'w', encoding='utf-8') as file:
            file.writelines(new_content)

        print(f"Replaced wasm in file: {file_path}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    os.chdir(os.path.dirname(__file__))
    if len(sys.argv) == 2:
        replace_load_promise(sys.argv[1])
    elif len(sys.argv) == 1:
        for i in jspath:
            replace_load_promise(i)
    else:
        print("Usage: godot_wasm_replace.py <file_path>")
