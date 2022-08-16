const opn = require('opn');

module.exports = (path) => {
  opn(path, {app: 'google chrome'});
};