'use strict';
const Chalk = require('chalk');
const Morgan = require('morgan');
const Express = require('express');
const BodyParser = require('body-parser');
const CookieParser = require('cookie-parser');

const StaticResourcer = require('./static-resourcer');

class Server extends Express {
  constructor() {
    super();
    Object.assign(this.__proto__, ServerPrototype);

    // "注入"中间件
    this.use(require('./middleware/inject')());
  }
}

const ServerPrototype = {
  _reloader: null,

  /**
   * 设置静态资源访问规则
   * @param {String} prefix 静态资源的前缀地址 
   * @param {Array<String>} dirname 资源所处目录 或 域名
   */
  setStatic(prefix, dirname) {
    if (!this.staticResourcer) {
      this.staticResourcer = new StaticResourcer(this);
    }
    this.staticResourcer.setStatic(prefix, dirname);
  },

  /**
   * 启动 livereload，必须在其它请求前，调用次方法，否则，之后的请求，是不能享受到 livereload 的
   * @param {String || Object} [opts] 参数，eg: { url: 自动刷新脚本的路径地址, type: 'polling || websocket' }
   */
  livereload(opts) {
    if (typeof opts === 'string') {
      opts = { url: opts };
    } else if (opts === true) {
      opts = {};
    } else {
      return;
    }
    opts = Object.assign({ url: '/.publish/liverealod.js', api: '/.api/reload', type: 'polling' }, opts || {});
    
    // if (opts.type === 'websocket') {
      // TODO websocket 暂时不可用，等下次再拓展哈~
      // this._reloader = new require('./livereload/websocket')({ api: opts.api, timeout: 5000 });
    // } else {
      let Reloader = require('./livereload/polling');
      this._reloader = new Reloader({ url: opts.url, api: opts.api, timeout: 5000 });
    // }
    this._reloader.connet(this);
  },

  /**
   * 切换 livereload 的可用状态
   * @param {Boolean} enable 
   */
  enableLivereload(enable) {
    this._reloader && reloader.enable(!!enable);
  },

  /** 
   * 刷新当前页面，仅在启动了 livereload 时，生效
  */
  reloadPage() {
    this._reloader && this._reloader.reload();
  }
};


Object.assign(Server, Express);

Server.Morgan = Morgan;
Server.BodyParser = BodyParser;
Server.CookieParser = CookieParser;

/**
 * 创建服务器，自动绑定 bodyParser, cookieParser, morgan 中间件，如有其它中间件要求，请自己设置
 * @param {Object} [opts] 参数，eg: 
 *  { 
 *    limit: 'bodyParser 的大小限制，默认是 50mb',
 *    static: { [path]: [realPath] },
 *    livereload: 'livereload.js 的请求路径，默认是 /server/livereload.js',
 *    port: 端口号，默认是 null，如果有设置端口号，则在 process.nextTick 中，自动执行 listen 方法
 *    morganSkip: Function(req, res) {  } 是否跳过满足条件的日志
 *  }
 */
Server.create = function(opts) {
  opts = Object.assign({ limit: '50mb', static: {}, livereload: false, port: null, morganSkip: null }, opts || {});

  const app = new Server();
  app.use(Morgan('dev', {
    // 跳过 /.xxx/ 这样的请求
    skip(req, res) {
      if (opts.morganSkip && opts.morganSkip(req, res)) {
        return true;
      }
      return /\/\.[^/]+\//.test(req.url);
    }
  }));
  app.use(BodyParser.json({ limit: opts.limit }));
  app.use(BodyParser.urlencoded({ extended: false, limit: opts.limit }));
  app.use(CookieParser());

  if (opts.static) {
    let map = opts.static;
    Object.keys(map).forEach(function(key) {
      app.setStatic(key, map[key]);
    });
  }

  if (opts.livereload) {
    app.livereload(opts.livereload);
  }

  if (opts.port) {
    process.nextTick(function() {
      app.listen(opts.port, function() {
        const port = this.address().port;
        console.log(Chalk.green(`监听端口: ${port}，可用地址:`));
        (Server.getIpList() || []).forEach(function(ip) {
          console.log(Chalk.green(`  http://${ip}:${port}`));
        });
      });
    });
  }

  return app;
};


/**
 * 在浏览器中，打开某个地址
 * @param {String} target 被打开的地址
 * @param {Function} [callback] 打开后的回调
 */
Server.openBrowser = function (target, callback) {
  var map, opener;
  map = {
    'darwin': 'open',
    'win32': 'start '
  };
  opener = map[process.platform] || 'xdg-open';
  return require("child_process").exec(opener + ' ' + target, callback || function() {});
};


/** 
 * 获取当前的所有可用 ip 地址
 * @return {Array<String>}
*/
Server.getIpList = function () {
  const os = require('os');
  const ifaces = os.networkInterfaces();
  const ips = [];
  Object.keys(ifaces).forEach(key => {
    ifaces[key].forEach(details => {
      if (details.family === 'IPv4') {
        ips.push(details.address);
      }
    });
  });
  return ips;
};

module.exports = Server;
