/* global require, module, Buffer */

var through     = require('through2'),
	gulputil    = require('gulp-util'),
	util        = require('./utils'),
	_           = require('lodash'),
	PluginError = gulputil.PluginError;

const PLUGIN_NAME = 'gulp-ractive-foundation-component';

function component(options) {
	var stream = through.obj(function (file, enc, callback) {
		if (file.isStream()) {
			this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
			return callback();
		}

		util.getComponent(file.path, options)
			.then(function(contents) {
				file.contents = new Buffer(contents[0]);

				this.push(file);

				callback();
			}.bind(this));
	});

	return stream;
}

module.exports = function(defaults) {
	return function(options) {
		options = options ? _.merge(_.clone(defaults), options) : _.clone(defaults);

		return component(options);
	};
};
