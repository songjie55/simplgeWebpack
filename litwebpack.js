//最外层一个自运行函数,参数就是webpack分析代码后得出的依赖索引表
(function (dep) {
    //实现require
    function require(file) {
        var module = {};
            //自运行函数是为了防止修改到全局变量
            (function (module, code) {
                eval(code)
            })(module, dep[file])
        return module
    }
    require('index.js')//加载入口文件
})({
    'index.js': 'var add=require("a.js").default;let x=add(1,2);console.log(x)',//入口文件的内容是通过nodeJS的file读写文件模块来获取的，这里直接写获取后的结果
    'a.js': `module.default = function sum(a, b) {return a + b}`
})
// 步骤1.分析入口文件的依赖关系生成依赖表
