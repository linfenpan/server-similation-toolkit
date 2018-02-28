'use strict';
const Got = require('got');
const Util = require('./util');
const Cheerio = require('cheerio');

const Spider = Object.assign({}, Got);

Spider.get = Got;

Spider.parseDom = function(content, charsets) {
  if (charsets) {
    if (typeof content === 'string') {
      throw new Error('设置 charsets 后，content 必须是 Buffer 类型，试试请求时，添加参数 encoding: null 吧');
    }
    content = Util.decode(content, charsets);
  }
  return Cheerio.load(content, { decodeEntities: false });
}

module.exports = Spider;