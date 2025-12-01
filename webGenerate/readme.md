# 网站编译流程

通过Github action, 每次push上去时会通过npm调用`webGenerate/main.js`，将目录下的`.md`文件都转成`.html`,然后遍历文件夹，将这些html加入到网站目录中

## Github仓库

配置在`webConfig.js`中的仓库会被下载到对应位置。可以访问

## 主页推荐

配置在`webConfig.js`中的推荐会被显示在主页上
