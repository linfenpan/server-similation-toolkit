'use strict';
const fs = require('fs');
const path = require('path');

let FileContent = null;

class PollingReloader {
  /**
   * 轮询
   * @param {Object} opts 参数，{ url: 请求链接的地址, api: 接口地址, timeout: '' }
   */
  constructor(opts) {
    if (!FileContent) {
      FileContent = fs.readFileSync(path.resolve(__dirname, './polling.txt')).toString();
    }

    Object.assign(opts, { url: '/.publish/livereload.js', api: '/.api/livereload', timeout: 5000 }, opts || {});
    this.opts = opts;
    this.api = opts.api;
    this.isEnable = true;
    this.timeout = opts.timeout || 5000;
    this.lastModifyTime = Date.now();
    this.responseList = [];
  }

  /**
   * 与 express 的实例链接
   * @param {Object} app 
   */
  connet(app) {
    const reloader = this;
    const opts = this.opts;

    app.use(function(req, res, next) {
      res.inject && res.inject([
        function isHit(content, req, res) {
          return /^text\/html/.test(res.get('content-type') || '') && typeof content === 'string';
        },
        function handle(content, req, res) {
          return content.replace(/<head>/i, '<head>\n' + `<script src="${opts.url}"></script>`);
        }
      ]);
      next();
    });

    // 刷新脚本入口
    app.get(opts.url, function(req, res) {
      reloader.seed(req, res);
    });

    // 轮询 api 的入口
    app.get(opts.api, function(req, res) {
      reloader.handle(req, res);
    });
  }
  
  // 处理请求
  handle(req, res) {
    if (!req.query.last) {
      return this._sendModifyTime(res);
    }
    
    // 启动一个计时器，准备发送请求啦，请求内容: { enable: true, lastModifyTime: 11111 }
    this.responseList.push(res);
    this._startResponseTimer();
  }

  // 往内容，插入种子脚本
  seed(req, res) {
    res.set('content-type', 'text/script');
    res.send(FileContent.replace('LIVE_RELOAD_URL', this.api));
  }
 
  reload() {
    this.lastModifyTime = Date.now();
    this._pushAllResponse();
  }

  enable(isEnable) {
    this.isEnable = !!isEnable;
  }

  _startResponseTimer() {
    if (this._responseTimer) {
      return;
    }

    this._responseTimer = setTimeout(() => {
      this._responseTimer = null;
      this._pushAllResponse();
    }, this.timeout);
  }

  _pushAllResponse() {
    const list = this.responseList || [];
    this.responseList = [];

    list.forEach((res) => {
      this._sendModifyTime(res);
    });
  }

  _sendModifyTime(res) {
    res.send({ enable: this.isEnable, lastModifyTime: this.lastModifyTime });
  }
}

module.exports = PollingReloader;