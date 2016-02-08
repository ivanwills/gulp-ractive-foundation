/* global require, module, Buffer */

var through     = require('through2'),
	gulputil    = require('gulp-util'),
	util        = require('./utils.js'),
	_           = require('lodash'),
	PluginError = gulputil.PluginError;

const PLUGIN_NAME = 'gulp-ractive-foundation-documentation';

function documentation(options) {
	var stream = through.obj(function (file, enc, callback) {
		if (file.isStream()) {
			this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
			return callback();
		}

		util.getDocumentation(file.path, options)
			.then(function(contents) {
				file.contents = new Buffer(contents);

				this.push(file);

				callback();
			}.bind(this));
	});

	return stream;
}

module.exports = function(defaults) {
	return function(options) {
		options = options ? _.merge(defaults, options) : defaults;

		return documentation(options);
	};
};
