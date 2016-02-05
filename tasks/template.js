/* global require, module, Buffer */

var through  = require('through2'),
	gulputil = require('gulp-util'),
	util     = require('./utils.js'),
	PluginError    = gulputil.PluginError;

const PLUGIN_NAME = 'gulp-ractive-foundation-template';

function template(options) {
	if (!options) {
		options = {};
	}
	if (!options.prefix) {
		options.prefix = 'Ractive.components';
	}

	var stream = through.obj(function (file, enc, callback) {
		if (file.isStream()) {
			this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
			return callback();
		}

		console.log(file.history[0]);
		util.getTemplate(file.history[0], options)
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

module.exports = template;
