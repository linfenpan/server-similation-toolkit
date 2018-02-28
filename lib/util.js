'use strict';
const Path = require('path');
const FsExtra = require('fs-extra');
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


/**
 * 根据文件名字，从目录列表中，获取到文件的真实路径
 * @param {String} filename 文件名字
 * @param {Array<String>} dirnames 目录列表
 * @return String || Boolean
 */
Util.getFilepathByName = function(filename, dirnames) {
  if (!Array.isArray(dirnames)) {
    dirnames = [dirnames];
  }

  for (let i = 0, ilen = dirnames.length; i < ilen; i++) {
    let dirname = dirnames[i];
    let filepath = Path.resolve(dirname, filename);
    if (FsExtra.existsSync(filepath)) {
      return filepath;
    }
  }

  return false;
};

/**
 * 从多个目录中，读取文件内容，如果文件不存在，就返回 null
 * @param {String} filename 文件名字
 * @param {Array<String>} dirnames 目录列表
 * @return Buffer
 */
Util.readFileFromDirs = function(filename, dirnames) {
  const filepath = Util.getFilepathByName(filename, dirnames);
  if (filepath) {
    return FsExtra.readFileSync(filepath);
  }
  return null;
};

module.exports = Util;