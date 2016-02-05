/* global require, module, Buffer */

var through  = require('through2'),
	gulputil = require('gulp-util'),
	fs       = require('fs'),
	util     = require('./utils.js'),
	PluginError    = gulputil.PluginError;

const PLUGIN_NAME = 'gulp-ractive-foundation-plugin';

function plugin(options) {
	if (!options) {
		options = {};
	}

	var stream = through.obj(function (file, enc, callback) {
		if (file.isStream()) {
			this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
			return callback();
		}

		if (fs.statSync(file.history[0]).isFile()) {
			var pluginType = JSON.parse(fs.readFileSync(file.history[0])).plugin;
			if (pluginType) {
				options.prefix = 'Ractive.' + pluginType;
			}
		}

		util.getComponent(file.history[0], options)
			.then(function(contents) {
				file.contents = new Buffer(contents);

				this.push(file);

				callback();
			}.bind(this));
	});

	return stream;
}

module.exports = plugin;
