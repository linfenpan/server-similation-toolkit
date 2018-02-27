'use strict';
const Path = require('path');
const FileWatcher = require('../lib/file-watcher');

const fileWatcher = new FileWatcher({
  cwd: Path.resolve(__dirname, './files'),
  release: Path.resolve(__dirname, './dist'),
  // linkCopy: false
});
fileWatcher.on('each:change', function(p) {
  console.log('each:change -> ' + p);
});
fileWatcher.on('each:ready', function(matches) {
  console.log('each:ready', matches);
});
// fileWatcher.on('each:add', function() {
//   console.log('each:add');
// });

fileWatcher.watch('**/index.js').copyTo('./files');
fileWatcher.watch('**/*.css').copyTo(function(p) {
  if (/base\.css/.test(p)) {
    return p.replace(/base/, 'base-rename');
  }
  return './';
});
fileWatcher.watch(Path.resolve(__dirname, './files/in/in.js')).copyTo('./in/in.js');