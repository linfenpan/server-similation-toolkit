每个项目，都会为其编写一个前端模拟服务器端请求的工具，不知不觉间，都已经编写了好几套类似，又有些许差异的工具了。

回首一下，实际这些工具，就那么四个板块:

 1. 文件监听
 2. 服务器模拟
 3. 自动重载
 4. 静态资源转发

如果把 4 个板块，各自独立工具化，那是不是会更加灵活呢？

总得试试，对吧？


# 服务器

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
## polling
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

## inject
又名 `注入` 中间件，用于给特定内容，注入额外信息，使用如下:
```javascript
app.use((req, res) => {
  if (true /*满足某个条件*/) {
    // 翻译如下: 如果 content-type 满足 /^text\/html/i，则在 /<head>/ 后面，插入 <script>...</script>
    res.inject([
      /^text\/html/i,        //   content-type 的正则，只有匹配此正则，才会去注入，如 /^text\/html/i,
      /<head>/,              //   需要被替换内容的正则，如 /<head>/,
      '<script>..</script>', //   被注入的内容，仅限字符串
      'after'                //   被注入的位置，有 'before|after|replace' 三个选项
    ]);
  }
});
```

# 静态资源寻址
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
