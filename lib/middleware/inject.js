'use strict';

/**
 * 使用:
 *  res.injects.push([ /^text\/html/i, /<head>/, '<script>...</script>', 'after' ]);
 * 仅在指定了 content-type = xxx 时 生效
*/

module.exports = function() {
  return function(req, res, next) {
    res.injects = [
      // [
      //   function isHit(content, req, res) { return true; },        // 检查当前请求，是否满足要求
      //   function handle(content, req, res) { /* 处理返回内容 */ }   // 如果满足要求，应该怎么加工内容
      // ]
    ];
  
    res.inject = function(arr) {
      this.injects.push(arr);
    };
  
    // 重写 send 方法
    const send = res.send.bind(res);
    res.send = function(code, body) {
      if (arguments.length <= 1) {
        body = code;
        code = null;
      }
      if (code) {
        res.status(code);
      }
  
      const injects = res.injects;
      for (let i = 0, ilen = injects.length; i < ilen; i++) {
        let arr = injects[i];
        if (arr.length < 2) { continue; }

        let fnIsHit = arr[0], fnHandle = arr[1];
        if (fnIsHit(body, req, res)) {
          body = fnHandle(body, req, res);
        }
      } // end for
  
      return send(body);
    };
  
    next();
  };
};