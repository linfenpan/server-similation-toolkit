'use strict';
const Server = require('../lib/server');

const app = Server.create({ 
  static: { '/static': './static' }, 
  livereload: '/server/livereload', 
  port: 3000,
  // 跳过一些非 200 的日志
  morganSkip: function(req, res) {
    return res.statusCode != 200;
  }
});

// 测试多个 static 路径，是否正常
app.setStatic('/static', ['./static2']);
app.setStatic('/', 'http://res.xyq.cbg.163.com');

app.get('/', (req, res, next) => {
  res.inject([
    /^text\/html/i,
    /<body>/i,
    '测试:' + Date.now()
  ]);

  res.set('content-type', 'text/html');
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>测试</title>
      </head>
      <body>
        <pre>Hi</pre>
        <img src="http://10.255.208.81:3000/images/role_icon/small/11.gif" />
      </body>
    </html>
  `);
});



// setTimeout(function() {
//   console.log('reloading...');
//   app.reloadPage();
// }, 5000);

// console.log('hahaha');

// 等价于:
// app.setStatic('/static', Server.static('./static'));
// app.livereload('/server/livereload'); // -> app.disableLivereload();
// app.listen(3000);