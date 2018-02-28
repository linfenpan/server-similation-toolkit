'use strict';
const Path = require('path');
const Iconv = require('iconv-lite');
const isAbsoluteUrl = require('is-absolute-url');

const Util = {};

// 是否绝对路径网址
Util.isAbsoluteUrl = isAbsoluteUrl;

// generator 运行环境
Util.co = require('co');

/**
 * 把字符串或者字节，以正确的编码读取出来
 * @param {Buffer|String} bytes 需要转码的内容
 * @param {Array|String} charsets 当前的编码
 * @return {String} 转码后的字符串
*/
Util.decode = function(bytes, charsets) {
  if (!Array.isArray(charsets)) {
    charsets = [charsets];
  }

  for (let i = 0, max = charsets.length; i < max; i++) {
    let result = Iconv.decode(bytes, charsets[i]);
    if (result.indexOf('�') < 0) {
      return result;
    }
  }

  return bytes.toString();
}

/**
 * require 的没缓存版本
 * @param {String} filename 文件名
 * @param {String} dirname 寻址的目录地址
*/
Util.require1 = function(filename, dirname) {
  if (!dirname) {
    throw new Error('请传入寻址目录地址');
  }
  filename = Path.isAbsolute(filename) ? filename : Path.resolve(dirname, filename);
  try {
    delete require.cache[require.resolve(filename)];
  } catch (e) {
    // nothing..
  }
  return require(filename);
};

module.exports = Util;