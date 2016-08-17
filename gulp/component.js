/* global require, module, Buffer */

var through     = require('through2'),
	gulputil    = require('gulp-util'),
	util        = require('./utils'),
	_           = require('lodash'),
	PluginError = gulputil.PluginError;

const PLUGIN_NAME = 'gulp-ractive-foundation-component';

function component(options) {
	return through.obj((file, enc, callback) => {
		if (file.isStream()) {
			this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
			return callback();
		}

		util.getComponent(file.path, options)
			.then(function (contents) {
				file.path = file.base + options.file2object(file, options) + '.js';
				file.contents = new Buffer(contents[0]);

				this.push(file);

				callback();
			}.bind(this));
	});
}


module.exports = function(defaults) {
	return (options) => component(_.assign({}, defaults, options));
};
