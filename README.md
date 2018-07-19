每个项目，都会为其编写一个前端模拟服务器端请求的工具，不觉间，已经写了几套类似的工具。

回首一下，实际上就几个板块:

 1. 文件监听
 2. 服务器模拟
 3. 自动重载
 4. 静态资源转发
 5. 动态路由

于是有了此项目，把上传的 上述 板块，各自工具化。


# Server

此部分，继承 `express`，然后拓展出几个常用方法:

```javascript
const path = require('path');
const Server = require('server-similation-toolkit').Server;

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
app.livereload(true || { type: '"polling" or "eventsource"', url: .., api: .., timeout: .. });

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

在 `new Server()` 中，强制使用了 `InjectMiddleware` 中间件，给所有 `res` 对象，添加了 `res.inject([])` 方法，具体见 `InjectMiddleware` 的介绍。


# 自动重载
## PollingReloader
轮询形式的自动刷新，有以下几个方法:
```javascript
const PollingReloader = require('server-similation-toolkit').PollingReloader;
const reloader = new PollingReloader({ timeout: 3000 });

reloader.connect(app);  // 传入 Server 或 Express 的实例
reloader.reload();      // 刷新页面
```
须配合 `InjectMiddleware` 使用，同时，需要把 `response` 的 `Content-Type` 设置为 `text/html`，才会对 html 的内容，进行注入

## EventsourceReloader
参考上述 `PollingReloader` 的使用，客户端层使用 `EventSource`，进行数据接收。


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
const StaticResourcer = require('server-similation-toolkit').StaticResourcer;
const staticResourcer = new StaticResourcer(app:Express Instance);

staticResourcer.setStatic('/static', [...]);
```

在 `server.js` 中的 `setStatic` 方法，已经集成了 `static-resourcer.js`。


# FileWatcher
业务中，常有监控某些文件，如果特定文件有更变，则需要执行相应的任务，`file-watcher.js`应运而生，内置了 `chokidar` 监控库，对日常的监控文件更变、复制文件到某一目录，进行了封装，使用如下:

```javascript
const Path = require('path');
const FileWatcher = require('server-similation-toolkit').FileWatcher;

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


# ReloadRouter
日常开发中，如果不依赖 `supervisor` 等外部工具，在更改 `Express` 的路由配置后，需要手动关闭应用，再次重启，才能使新的配置生效。
在关闭、重启之间，耗费了大量的时间，这不是我们所预期的。

这里提供一个折中的方案，我们的配置，都放在路由文件中，当路由文件更改时，我们仅仅重新载入此路由的内容，不再重启应用。

例如:
```javascript
// router.js

// express 的写法
// const express = require('express');
// const router = new express.Router();

// Server 是 express 的二次封装，拥有 express 的所有方法、实例
const Server = require('server-similation-toolkit').Server;
const router = new Server.Router();

router.get('/user', function(req, res) {
  res.send('hello!');
});

module.exports = router;
```
在入口文件中，如下配置:
```javascript
// app.js
const express = require('express');
const app = express();
const path = require('path');
const ReloadRouter = require('server-similation-toolkit').ReloadRouter;

// 中间件之类的配置....

app.use('/', new ReloadRouter(
  path.resolve(__dirname, './router.js'), // 需要重载 的 路由文件 的 绝对路径
  {
    watchFile: true,     // 是否监控文件的变化，此开关方便在生成和开发环境之间切换
    onUpdate: function() {
      // 路由文件每次更新后 的 回调函数
    }
  }
));

app.listen(3000);
```
在 `router.js` 上的所有更改，都将在毫秒级别内生效。
甚至 `router.js` 产生了异常，也会即时抛出，并且访问时动态跳过异常的路由。
直至 `router.js` 没有异常，才会重新加入队列。


# 其它常用方法
```javascript
const Toolkit = require('server-similation-toolkit');

/**
 * require 的没缓存版本
 * @param {String} filename 文件名
 * @param {String} dirname 寻址的目录地址
 * @return Object
*/
Toolkit.require1(filename, dirname);

/**
 * 根据文件名字，从目录列表中，获取到文件的真实路径，找不到返回 false
 * @param {String} filename 文件名字
 * @param {Array<String>} dirnames 目录列表
 * @return String || Boolean
 */
Toolkit.getFilepathByName(filename, dirnames);

/**
 * 从多个目录中，读取文件内容，如果文件不存在，就返回 null
 * @param {String} filename 文件名字
 * @param {Array<String>} dirnames 目录列表
 * @return Buffer
 */
Toolkit.readFileFromDirs(filename, dirnames);

/**
 * 把字符串或者字节，以正确的编码读取出来
 * @param {Buffer|String} bytes 需要转码的内容
 * @param {Array|String} charsets bytes可能的编码列表
 * @return {String} 转码后的字符串
*/
Toolkit.decode(bytes, charsets);
```


# (测试，下版本可能删除)DataSpider
简单的源数据爬取，不做太复杂的功能，如要复杂的数据爬取，可配合 `puppeteer` 或者 `testcafe` 进行。

看例子:
```javascript
const Util = require('server-similation-toolkit');
const Spider = Util.DataSpider;

Util.co(function* () {
  const url = 'http://www.baidu.com/';
  const ua = 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.186 Safari/537.36';

  const response = yield Spider.get(url, {
    headers: {
      // 设置 ua，以免被当作简单的爬虫了
      'User-Agent': ua
    }
  });

  // response.body 将拿到页面的源码
  // parseDom 封装了 cheerio.load 方法
  const $ = Spider.parseDom(response.body);
  // 获取到标题内容
  console.log($('title').html());
});
```

方法介绍:
```javascript
// 把内容，转为 cheerio 对象，方便之后的查询
Spider.parseDom(content: String || Buffer, charsets?: Array);
// Spider 集成 got 库，能使用 got 库的所有方法，包括 get/post/head/patch/put/delete 等
Spider.get(url, options);
```

# (测试，下版本可能删除)Jinja2Template
暂时仅提供 `jinja2` 运行模板，具体见 npm 上的 `node-jinja2-template`。
