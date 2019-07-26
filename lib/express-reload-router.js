'use strict';
const Path = require('path');
const Chokidar = require('chokidar');
const require1 = require('./util').require1;

class ExpressReloadRouter {
  /**
   * 允许内容动态更变的路由器
   * @param {String} routerAbsFilename router文件的绝对路径
   * @param {Object} [opts] 参数，{ watchFile: true, onUpdate: 路由更新后的回调 }
   */
  constructor(routerAbsFilename, opts) {
    this.routerAbsFilename = Path.isAbsolute(routerAbsFilename) ? routerAbsFilename : Path.resolve(routerAbsFilename);
    this.opts = Object.assign({
      watchFile: true,
      onUpdate: function() {}
    }, opts || {});
    
    if (this.opts.watchFile) {
      this._watch(routerAbsFilename);
    }
    
    this.router = require1(this.routerAbsFilename, process.cwd());
    const fnMiddle = (req, res, next) => {
      if (typeof this.router === 'function') {
        this.router(req, res, next);
      } else {
        next();
      }
    };
    fnMiddle.update = this.update.bind(this);
    
    return fnMiddle;
  }

  // 更新 router 内容
  update() {
    try {
      this.router = require1(this.routerAbsFilename, process.cwd());
      this.opts.onUpdate();
    } catch (e) {
      this.router = null;
      console.log(`router文件出现问题: ${this.routerAbsFilename}`);
      console.error(e);
      this.opts.onUpdate(e);
    }
  }

  // 监控文件变化
  // 文件变化后，刷新页面吗？
  _watch() {
    this.watcher = Chokidar.watch(this.routerAbsFilename, {
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });
    this.watcher.on('change', () => this.update());
  }
}

module.exports = ExpressReloadRouter;