const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');//用来把js文件解析成AST抽象语法树,
const traverse = require('@babel/traverse').default;//分析文件之间的依赖,它能解析import
const babel = require('@babel/core');//把es6转成es5
// 步骤1.分析入口文件的依赖关系生成依赖表
//分析单个模块中的依赖并且吧es6转换成es5
function getModuleInfo(file) {
    const body = fs.readFileSync(file, 'utf-8')//同步读取文件里的内容
    const ast = parser.parse(body, {sourceType: 'module'})// 把文件里面的js代码转换成AST,第二个参数是分析里面的模块引入方式
    const deps = {}// 收集依赖
    traverse(ast, {// 遍历ast里面的内容，第二个参数是遍历里面的节点类型，这里写的是遍历Import导入文件的节点
        ImportDeclaration({node}) {
            const dirname = path.dirname(file);//获取当前文件的路径
            // 和引入的依赖包路径拼装成绝对路径
            const abspath = './' + path.join(dirname, node.source.value)
            deps[node.source.value] = abspath;//当前文件的依赖
        }
    })
    // ES6转ES5
    const {code} = babel.transformFromAst(ast, null, {
        presets: ['@babel/preset-env']
    })
    return {file, deps, code}
}

// 模块解析，并且收集依赖
function parseModules(file) {
    const entry = getModuleInfo(file)
    const temp = [entry]//依赖数组
    const depsGraph = {}
    //递归收集子模块的依赖
    getDeps(temp, entry)
    //获取到所有的模块的数组之后放到depsGraph中
    temp.forEach(info => {
        depsGraph[info.file] = {
            deps: info.deps,
            code: info.code
        }
    })
    return depsGraph
}

//递归收集模块依赖
function getDeps(temp, {deps}) {
    Object.keys(deps).forEach(key => {
        const child = getModuleInfo(deps[key])
        temp.push(child)
        //递归分析子模块
        getDeps(temp, child)
    })
}

//todo 依赖重复引用没做到去重

function bundle(file) {
    let depsGraph = JSON.stringify(parseModules(file))
    //最外层一个自运行函数,参数就是webpack分析代码后得出的依赖索引表
    return `;(function (graph) {
        //实现require
        function require(file) {
            function absRequire(relPath) {//获取真实文件路径
                return require(graph[file].deps[relPath])
            }
             var exports = {};
            (function (require,exports,code) {//自运行函数是为了防止修改到全局变量
                eval(code)
            })(absRequire,exports,graph[file].code)
            return exports 
        }
        require('${file}')//加载入口文件
    })(${depsGraph})`

}

let content=bundle('./index.js')

!fs.existsSync("./dist") && fs.mkdirSync("./dist");
fs.writeFileSync("./dist/bundle.js", content);


