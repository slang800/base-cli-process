'use strict';

var debug = require('debug')('base:cli:process');
var fields = require('./lib/fields/');
var utils = require('./lib/utils');

/**
 * Custom mappings for the base-cli plugin.
 */

module.exports = function(config) {
  config = config || {};

  return function(app, base) {
    if (!this.isApp) return;
    if (this.isRegistered('base-cli-process')) return;
    debug('initializing <%s>, called from <%s>', __filename, module.parent.id);

    var options = createOpts(app, config);
    var schema;

    if (typeof this.cli === 'undefined') {
      this.use(utils.cli(options));
    }

    if (typeof this.option === 'undefined') {
      this.use(utils.option(options));
    }

    if (typeof this.config === 'undefined') {
      this.use(utils.config(options));
    }

    Object.defineProperty(this.cli, 'schema', {
      cliurable: true,
      enumerable: true,
      set: function(val) {
        schema = val;
      },
      get: function() {
        return schema || utils.schema(app, createOpts(app, config));
      }
    });

    // add commands
    for (var key in fields) {
      debug('mapping field "%s"', key);
      app.cli.map(key, fields[key](app, base, options));
    }

    var fn = this.cli.process;

    this.cli.process = function(val, cb) {
      debug('normalizing argv object', val);

      var defaults = {
        sortArrays: false,
        omitEmpty: true,
        keys: ['run', 'toc', 'layout', 'tasks', 'options', 'data', 'plugins', 'related', 'reflinks']
      };

      var opts = createOpts(app, config, defaults);
      var obj = this.schema.normalize(val, opts);

      debug('processing normalized argv', obj);
      fn.call(this, obj, function(err) {
        if (err) return cb(err);
        cb(null, obj);
      });
    };
  };
};

function createOpts(app, config, defaults) {
  if (typeof defaults !== 'undefined') {
    config = utils.merge({}, defaults, config);
  }
  var options = utils.merge({}, config, app.options);
  if (options.schema) {
    return utils.merge({}, options, options.schema);
  }
  return options;
}
