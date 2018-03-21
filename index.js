'use strict';

Object.assign(exports, require('./lib/util'));

exports.Server = require('./lib/server');
exports.FileWatcher = require('./lib/file-watcher');
exports.StaticResourcer = require('./lib/static-resourcer');
exports.PollingReloader = require('./lib/livereload/polling');
exports.InjectMiddleware = require('./lib/middleware/inject');
exports.ReloadRouter = require('./lib/express-reload-router');

// @test
exports.DataSpider = require('./lib/data-spider');
exports.Jinja2Template = require('./lib/template/jinja2');