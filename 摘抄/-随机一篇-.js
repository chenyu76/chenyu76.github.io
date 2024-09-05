function 随机一篇() {
    // 定义一个包含URL的数组
    var urls = [ //begin"#摘抄/琐事.md",
"#摘抄/最伟大的科幻小说.md",
"#摘抄/日暮.md",
"#摘抄/四千三百年.md",
"#摘抄/Had I not seen the Sun.md",
"#摘抄/《热风》随感录四十一.md",
"#摘抄/C99 doesn't need function bodies, or 'VLAs are Turing complete’.md",
"#摘抄/软件幻灭.md",
"#摘抄/不要抛弃学问.md",
"#摘抄/雄辩症.md",
"#摘抄/一百岁感言.md",
"#摘抄/给不安的你.md",
"#摘抄/想象.md",
"#摘抄/脸与法治.md",
"#摘抄/我的戒烟.md"//end
    ];

    // 生成一个随机索引
    var randomIndex = Math.floor(Math.random() * urls.length);

    // 跳转到随机选择的URL
    window.location.href = urls[randomIndex];

    return "跳转中";
}