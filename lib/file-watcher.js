'use strict';
const Path = require('path');
const Chalk = require('chalk');
const FsExtra = require('fs-extra');
const Chokidar = require('chokidar');
const EventEmitter = require('events');

class FileWatcher extends EventEmitter {
  constructor(options) {
    super();

    options = Object.assign({
      cwd: process.cwd(),
      linkCopy: true,       // 硬链接复制，在目标目录，创建一个快捷方式，修改的时候，两个文件，同时修改
      release: null,        // 如果设置了此参数，那么在 watch 之后，会自动把文件复制到此目录下
    }, options || {});

    this.options = options;
  }

  watch(dirnames, opts) {
    const watcher = new FileWatcherItem(dirnames, Object.assign({
      ignored: /node_modules/,
      parent: this,
    }, this.options, opts || {}));

    return watcher;
  }
}

class FileWatcherItem extends EventEmitter {
  constructor(dirnames, opts) {
    super();

    this.cwd = opts.cwd;
    this.release = opts.release;
    this.parent = opts.parent;
    this.linkCopy = opts.linkCopy;

    this.watcher = Chokidar.watch(dirnames, {
      ignored: opts.ignored,
      cwd: this.cwd
    });

    // change 和 unlink 事件，是否在 ready 事件之后 产生
    let eventAfterReady = !!opts.linkCopy || !!opts.eventAfterReady;
    let isReady = eventAfterReady ? false : true;

    this.watcher.on('add', p => {
      this.emit('add', p);
      this.parent.emit('each:add', p);
    }).on('change', p => {
      if (isReady) {
        this.emit('change', p);
        this.parent.emit('each:change', p);
      }
    }).on('unlink', p => {
      if (isReady) {
        this.emit('unlink', p);
        this.parent.emit('each:unlink', p);
      }
    }).on('ready', () => {
      isReady = true;
      this.emit('ready');
      this.parent.emit('each:ready', dirnames);
    });
  }

  /**
   * 匹配到的文件，复制到目标目录
   * @param {String|Function} [targetDirname] 目标目录，空值，则复制到设置的 release 目录下
   */
  copyTo(targetDirname) {
    if (!targetDirname && !this.release) { return this; }

    const cwd = this.cwd;
    const release = this.release || '';
    const isLinkCopy = !!this.linkCopy;

    function getTargetDirname(p) {
      if (targetDirname) {
        let dirname = targetDirname;
        if (typeof targetDirname === 'function') {
          dirname = targetDirname(p);
        }
        if (dirname) {
          // 如果有指定后缀名称，则使用此地址
          if (Path.extname(dirname)) {
            return Path.resolve(release, dirname);
          }
          // 没有指定后缀地址的
          return Path.resolve(release, dirname, p);
        }
      }

      return Path.resolve(release, p);
    }
    
    this.on('add', p => {
      this._copyTo(Path.resolve(cwd, p), getTargetDirname(p), { linkCopy: isLinkCopy });
    });
    
    if (!isLinkCopy) {
      this.on('change', p => {
        this._copyTo(Path.resolve(cwd, p), getTargetDirname(p));
      });
    }

    this.on('unlink', p => {
      // 删除文件
      this._remove(getTargetDirname(p));
    });

    return this;
  }

  _copyTo(fromFilepath, toFilepath, opts) {
    opts = Object.assign({ linkCopy: false }, opts || {});

    if (FsExtra.existsSync(fromFilepath)) {
      if (opts.linkCopy) {
        FsExtra.ensureFileSync(toFilepath);
        FsExtra.removeSync(toFilepath);
        FsExtra.linkSync(fromFilepath, toFilepath);
      } else {
        FsExtra.copySync(fromFilepath, toFilepath);
      }
      this.emit('copy', fromFilepath, toFilepath);
      this.parent.emit('each:copy', fromFilepath, toFilepath);
    } else {
      console.log(Chalk.red(`文件不存在: ${fromFilepath}`));
    }
  }

  _remove(filepath) {
    if (FsExtra.existsSync(filepath)) {
      FsExtra.removeSync(filepath);
    }
  }
}

module.exports = FileWatcher;