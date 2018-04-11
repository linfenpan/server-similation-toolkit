'use strict';

Object.assign(exports, require('./lib/util'));

exports.Server = require('./lib/server');
exports.FileWatcher = require('./lib/file-watcher');
exports.StaticResourcer = require('./lib/static-resourcer');
exports.PollingReloader = require('./lib/livereload/polling');
exports.EventsourceReloader = require('./lib/livereload/eventsource');
exports.InjectMiddleware = require('./lib/middleware/inject');
exports.ReloadRouter = require('./lib/express-reload-router');

exports.chokidar = require('chokidar');
exports.cheerio = require('cheerio');
exports.chalk = require('chalk');
exports.got = require('got');
exports.co = require('co');

// @test
exports.DataSpider = require('./lib/data-spider');
exports.Jinja2Template = require('./lib/template/jinja2');