/* global require, module, Buffer */

var through     = require('through2'),
	gulputil    = require('gulp-util'),
	util        = require('./utils'),
	_           = require('lodash'),
	PluginError = gulputil.PluginError;

const PLUGIN_NAME = 'gulp-ractive-foundation-template';

function template(options) {
	var stream = through.obj(function (file, enc, callback) {
		if (file.isStream()) {
			this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
			return callback();
		}
		var subOptions = _.cloneDeep(options);
		if (! subOptions.base) {
			subOptions.base = file.base;
		}

		util.getTemplate(file.path, subOptions)
			.then(function(contents) {
				file.contents = new Buffer(contents);

				this.push(file);

				callback();
			}.bind(this))
			.catch(function() {
				console.log(arguments);
				callback();
			});
	});

	return stream;
}

module.exports = function(defaults) {
	return function(options) {
		options = options ? _.merge(defaults, options) : defaults;

		return template(options);
	};
};
