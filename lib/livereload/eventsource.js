'use strict';
const fs = require('fs');
const path = require('path');

let FileContent = null;

class EventSourceReloader {
  constructor(opts) {
    if (!FileContent) {
      FileContent = fs.readFileSync(path.resolve(__dirname, './eventsource.txt')).toString();
    }

    Object.assign(opts, { url: '/.publish/livereload.js', api: '/.api/livereload', timeout: 20 * 1000 }, opts || {});
    this.opts = opts;

    this.isEnable = true;
    this.lastModifyTime = Date.now();

    this.clientId = 0;
    this.clients = {};
  }

  _startHeartbreak() {
    this._stopHeartbreak();
    this.timer = setInterval(() => {
      this._notify();
    }, this.opts.timeout / 2);
  }

  _stopHeartbreak() {
    clearInterval(this.timer);
  }

  connet(app) {
    const reloader = this;
    const opts = this.opts;
    this.app = app;

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

    app.get(opts.api, function(req, res) {
      req.socket.setTimeout(0);  // 删除超时策略
      res.status(200);
      res.set('Content-Type', 'text/event-stream');
      res.set('Cache-Control', 'no-cache');
      res.set('Connection', 'keep-alive');

      const clientId = reloader.clientId++;
      req.on('close', function() {
        res.end();
        delete reloader.clients[clientId];
      });
      reloader.clients[clientId] = res;

      reloader._sendModifyTime(res);
    });

    app.get(opts.url, function(req, res) {
      res.set('content-type', 'text/script');
      res.send(FileContent
        .replace('LIVE_RELOAD_URL', reloader.opts.api)
        .replace('LIVE_RELOAD_TIMEOUT', reloader.opts.timeout)
      );
    });

    this._startHeartbreak();
  }

  reload() {
    this.lastModifyTime = Date.now();
    this._notify();
  }

  enable(isEnable) {
    this.isEnable = !!isEnable;

    if (this.isEnable) {
      this._startHeartbreak();
    } else {
      this._stopHeartbreak();
    }
  }

  _notify() {
    const clients = this.clients;
    Object.keys(clients).forEach(id => {
      const client = clients[id];
      this._sendModifyTime(client);
    });
  }

  _sendModifyTime(res) {
    res.write('data: ' + JSON.stringify({
      enable: this.isEnable,
      lastModifyTime: this.lastModifyTime
    }) + '\n\n');
  }
}

module.exports = EventSourceReloader;