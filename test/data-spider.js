'use strict';
const Util = require('../lib/util');
const Spider = require('../lib/data-spider');

const url = 'http://xyq.cbg.163.com/equip?s=72&eid=201802081500113-72-AQ6THYPFG5RIS&equip_refer=26';
const ua = 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.186 Safari/537.36';

Spider.get(url, {
  headers: {
    'User-Agent': ua,
  }
}).then(function(data) {
  // 先获取 cookie，不然只能拿到中间地址
  const cookies = data.headers['set-cookie'];
  let map = {};
  cookies.forEach((c) => {
    c = c.trim();
    if (c) {
      let str = c.split(';')[0];
      let arr = str.split('=');
      arr[1] && (map[arr[0]] = arr[1]);
    }
  });
  let str = Object.keys(map).map(function(k) { return `${k}=${map[k]}`; }).join('; ');
  return str;
}).then(function(cookie) {
  requestRealContent(cookie);
});

function requestRealContent(cookie) {
  Spider.get(url, {
    headers: {
      'User-Agent': ua,
      'cookie': cookie
    },
    // 将 encoding 设置为 null，将在 data.body 中，返回 Buffer 类型
    encoding: null
  }).then(function(data) {
    const $ = Spider.parseDom(data.body, ['gb2312', 'gbk', 'utf-8']);
    console.log($('#equip_desc_value').val());
  }).catch(e => console.log(e));
}