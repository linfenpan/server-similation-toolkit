'use strict';

/**
 * 使用:
 *  res.injects.push([ /^text\/html/i, /<head>/, '<script>...</script>', 'after' ]);
 * 仅在指定了 content-type = xxx 时 生效
*/

module.exports = function(req, res, next) {
  res.injects = [
    // [ 
    //   content-type 的正则，只有匹配此正则，才会去注入，如 /^text\/html/i,
    //   需要被替换内容的正则，如 /<head>/,
    //   被注入的内容，仅限字符串，如 '<script>..</script>',
    //   被注入的位置，有 'before|after|replace' 三个选项
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

    const contentType = res.get('content-type');
    const injects = res.injects;

    if (!contentType) {
      return send(body);
    }

    let content = body;
    if (Buffer.isBuffer(content)) {
      content = content.toString('utf8');
    }

    for (let i = 0, ilen = injects.length; i < ilen; i++) {
      let arr = injects[i];
      if (arr.length < 3) { continue; }
      let regType = arr[0], regContent = arr[1];
      let newContent = arr[2], place = arr[3] || 'after';

      if (regType.test(contentType)) {
        content = content.replace(regContent, function(str) {
          switch (place) {
            case 'after':
              return str + newContent;
            case 'before':
              return newContent + str;
            case 'replace':
              return newContent;
            default:
              return str;
          }
        });// end replace
      }
    } // end for

    return send(content);
  };

  next();
}