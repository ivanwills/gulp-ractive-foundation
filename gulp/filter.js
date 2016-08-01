/* global require, module */

var through     = require('through2'),
	gulputil    = require('gulp-util'),
	util        = require('./utils'),
	_           = require('lodash'),
	path        = require('path'),
	PluginError = gulputil.PluginError;

const PLUGIN_NAME = 'gulp-ractive-foundation-filter';

function filter(options) {
	var seen = {};

	return through.obj(function (file, enc, callback) {
		if (file.isStream()) {
			this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
			return callback();
		}

		var name;
		if (options.filter instanceof RegExp) {
			name = file.path.match(options.filter)[1];
		}
		else if (options.filter instanceof Function) {
			name = options.filter(file.path);
		}

		var re = new RegExp('(^.*?' + name + ').*$');
		var newName = file.path.replace(re, '$1' + path.sep + 'manifest.json');

		if (! seen[newName]) {
			file.path = newName;
			seen[newName] = 1;
			this.push(file);
		}

		callback();

	});
}

module.exports = function(defaults) {
	return function(options) {
		if (options instanceof RegExp || options instanceof Function) {
			options = _.merge({}, defaults, { filter: options });
		}
		else {
			options = options ? _.merge({}, defaults, options) : _.clone(defaults);
		}

		return filter(options);
	};
};
