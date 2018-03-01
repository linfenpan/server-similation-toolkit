'use strict';
const URL = require('url');
const GOT = require('got');
const ServerStatic = require('serve-static');
const isAbsoluteUrl = require('is-absolute-url');

class StaticResourcer {
  /**
   * 静态资源寻址
   * @param {Object} app Express的实例
   * @param {Object} [options] 参数
   */
  constructor(app, options) {
    if (!app) {
      throw new Error(`请设置 app 参数`);
    }

    this.app = app;
  }

  /**
   * 设置静态资源寻址路径
   * @param {String} url 需要匹配的前缀路径，注意，仅支持前缀匹配!
   * @param {Array<String>} dirnames 寻址目录、域名列表
   */
  setStatic(url, dirnames) {
    if (!Array.isArray(dirnames)) {
      dirnames = [dirnames];
    }

    const app = this.app;
    dirnames.forEach(dirname => {
      if (isAbsoluteUrl(dirname)) {
        app.use(url, StaticResourcer.tryToGet(dirname, { cacheOnHit: true }));
      } else {
        app.use(url, ServerStatic(dirname));
      }
    });
  }
}

/**
 * 在 preDomain 中，寻找某个资源
 * @param {String} preDomain 前缀域名
 * @param {Object} [options] 参数
 */
StaticResourcer.tryToGet = function(preDomain, options) {
  const cache = StaticResourcer._tryToGetCache;

  options = Object.assign({
    cacheOnHit: true,          // 命中后，是否记录到内存中
  }, options || {});

  if (/\/$/.test(preDomain)) {
    preDomain = preDomain.replace(/\/+$/, '');
  }

  return function(req, res, next) {
    // 如: http://xxx.xxx.xx/static/test.css?v=1
    // app.use('/static', xxxx);
    //    req.url = "/test.css?v=1"
    //    req.baseUrl = "/static"
    //    req.originalUrl = "/static/test.css?v=1";

    const urlInfo = URL.parse(req.url);
    // "/test.css" => "test.css"
    const pathname = urlInfo.pathname.replace(/^\/+/, '');
    // 新的链接地址
    const newUrl = `${preDomain}/${pathname}`;

    if (newUrl in cache) {
      if (cache[newUrl] === CACHE_EXIST) {
        GOT(newUrl, { stream: true }).pipe(res);
      } else {
        next();
      }
      return;
    }

    GOT.head(newUrl)
      .then(function() {
        if (options.cacheOnHit) {
          cache[newUrl] = CACHE_EXIST;
        }
        GOT(newUrl, { stream: true }).pipe(res);
      })
      .catch(function(e) {
        if (options.cacheOnHit) {
          cache[newUrl] = CACHE_NOT_EXIST;
        }
        next();
      });
  };
};

const CACHE_EXIST = 1;        // 内容是存在的
const CACHE_NOT_EXIST = 2;    // 内容是不存在的
StaticResourcer._tryToGetCache = {};

module.exports = StaticResourcer;