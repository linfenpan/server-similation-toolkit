'use strict';
const Server = require('../lib/server');

const router = new Server.Router();

router.get('/user', function(req, res, next) {
  res.set('content-type', 'text/html');
  res.send('<html><head></head><body>I am da宗熊</body></html>');
});

module.exports = router;