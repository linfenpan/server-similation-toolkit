'use strict';
const Server = require('../lib/server');

const app = Server.create({ static: { '/static': './static' }, livereload: '/server/livereload', port: 3000 });

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