每个项目，都会为其编写一个前端模拟服务器端请求的工具，不知不觉间，都已经编写了好几套类似，又有些许差异的工具了。

回首一下，实际这些工具，就那么四个板块:

 1. 文件监听
 2. 服务器模拟
 3. 自动重载
 4. 静态资源转发

如果把 4 个板块，各自独立工具化，那是不是会更加灵活呢？

总得试试，对吧？


# Server

此部分，继承 `express`，然后拓展出几个常用方法:

```javascript
const path = require('path');
const Server = require('./lib/server');

// 建立服务的快捷方式，封装了以下几个参数
// 在 process.nextTick 后，将自动调用 listen 方法
const app = Server.create({
  port: 3015,
  // 启动 livereload 功能
  livereload: true,
  // 静态资源访问设置
  static: {
    '/static': path.join(__dirname, '../static')
  }
});
```

在 `app` 实例中，除了 `express` 现有的 `use`，`get`、`post` 等方法外，还拓展了以下几个方法:
```javascript
// 配置，并且启用 livereload 功能
app.livereload(true || { url: .., api: .., timeout: .. });

// 切换 livereload 的可用状态，仅在 livereload 启动时，生效
app.enableLivereload(true || false);

// 刷新所有打开的页面，仅在 livereload 启动时，生效
app.reloadPage();

// 配置静态资源访问路径
app.setStatic('/static', 'E://test/static');
```

在 `Server` 类上，除了 Express 可用的方法外，还额外添加了几个方法:
```javascript
// new Server() 的快捷方式，封装了 listen, livereload, setStatic 等方法
// 同时，添加了 morgan/bodyparser/cookieparser 等中间件
Server.create({ port: xx, livereload: true, static: {} });

// 在默认浏览器中，打开某个链接
Server.openBrowser('链接', Function:回调);

// 获取当前电脑的 Ip 列表
Server.getIpList();

// 一些常用中间件的访问快捷方式
Server.Morgan = require('morgan');
Server.BodyParser = require('body-parser');
Server.CookieParser = require('cookie-parser');
```

在 `new Server()` 中，强制使用了 `./lib/middleware/inject` 中间件，给所有 `res` 对象，添加了 `res.inject([])` 方法，具体见 `./lib/middleware/inject` 的介绍。


# 自动重载
## PollingReloader
轮询形式的自动刷新，有以下几个方法:
```javascript
const PollingReloader = require('./lib/livereload/polling');
const reloader = new PollingReloader({ timeout: 3000 });

reloader.connect(app);  // 传入 Server 或 Express 的实例
reloader.reload();      // 刷新页面
```
须配合 `./lib/middleware/inject` 使用

## websocket
`websocket`形式的自动刷新，带实现...


# middleware

## InjectMiddleware
又名 `注入` 中间件，用于给特定内容，注入额外信息，使用如下:
```javascript
app.use((req, res) => {
  if (true /*满足某个条件*/) {
    // 翻译如下: 如果 content-type 满足 /^text\/html/i，则在 /<head>/ 后面，插入 <script>...</script>
    res.inject([
      function isHit(content, req, res) { return true; },        // 检查当前请求，是否满足要求
      function handle(content, req, res) { return content; }     // 如果满足要求，应该怎么加工内容
    ]);
  }
});
```

# StaticResourcer
同一个访问目录的资源，可能放置在不同的目录，甚至，并不存在于本地的目录，我们迫切需要一个快捷工具、或方法，来满足我们这类的需求:

```javascript
// 考虑一下，如果我们调用一个方法，就能到本地的几个目录、线上服务器上，去寻找资源，是不是超赞呢？
app.setStatic('/static', [
  'E://test/static',
  'D://test/static',
  'http://res1.test.com',
  'http://res2.test.com'
]);
```

此工具类，应运而生:
```javascript
// static-resourcer.js
const StaticResourcer = require('./static-resourcer');
const staticResourcer = new StaticResourcer(app:Express Instance);

staticResourcer.setStatic('/static', [...]);
```

在 `server.js` 中的 `setStatic` 方法，已经集成了 `static-resourcer.js`。


# FileWatcher
业务中，常有监控某些文件，如果特定文件有更变，则需要执行相应的任务，`file-watcher.js`应运而生，内置了 `chokidar` 监控库，对日常的监控文件更变、复制文件到某一目录，进行了封装，使用如下:

```javascript
const Path = require('path');
const FileWatcher = require('../lib/file-watcher');

const fileWatcher = new FileWatcher({
  cwd: Path.resolve(__dirname, './files'),    // 此目录作为根目录，下面的 watch 操作，从此目录去寻找文件
  release: Path.resolve(__dirname, './dist'), // 设置复制的目标目录，如果为 null，而且没有调用 copyTo 方法，则不执行复制操作
  // linkCopy: false                          // 复制的时候，是否使用 “硬链接” 形式，进行复制，默认是 true
});

fileWatcher.on('each:change', function(p) {
  // 每次有文件更新时
});
fileWatcher.on('each:add', function(p) {
  // 每次有文件，进入监听列表时
});
fileWatcher.on('each:ready', function() {
  // 每个 .watch() 准备完成时
});

// 监控根目录下，所有 index.js
fileWatcher.watch('**/index.js');
// 监控根目录下，所有 样式 文件，并且复制到 目标目录下 
fileWatcher.watch('**/*.css').copyTo('./');
```

方法介绍:
```javascript
const watcher = fileWatcher.watch('file, dir, glob, or array', { ignored: 被忽略目录的正则，默认是 /node_modules/ });

watcher.on('ready, add, change, unlink 4个事件', callback);

watcher.copyTo(String || Function);
```
注:
`watcher.copyTo()` 如果传入的字符串，带后缀名称，则默认是一个文件。如果传入的是一个函数，那么函数的第一个参数，则是当前监控文件的相对路径，例如:
```javascript
// 把所有样式，复制到 目标目录下
// 但是，如果是 base.css，那么把 base.css 改名为 base-rename.css
fileWatcher.watch('**/*.css').copyTo(function(p) {
  if (/base\.css/.test(p)) {
    return p.replace(/base/, 'base-rename');
  }
  return './';
});
```


# 数据爬虫
TODO 简单的源数据爬取，不做太复杂的功能


# 数据模拟器
TODO 读取模拟数据，mock 数据


# Jinja2Tempate
暂时仅提供 `jinja2` 运行模板，看 `./lib/template/jinja2`，具体见 npm 上的 `node-jinja2-template`。
