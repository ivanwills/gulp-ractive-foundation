/* global require, module, Buffer */

var through  = require('through2'),
	gulputil = require('gulp-util'),
	util     = require('./utils.js'),
	path     = require('path'),
	PluginError    = gulputil.PluginError;

const PLUGIN_NAME = 'gulp-ractive-foundation-manifest';

function manifest(file, options) {
	if (!options) {
		options = {};
	}

	var manifest;
	var latestFile;
	var latestMod;
	var fileName;

	if (typeof file === 'string') {
		fileName = file;
	}
	else if (typeof file.path === 'string') {
		fileName = path.basename(file.path);
	}
	else {
		throw new PluginError('gulp-concat', 'Missing path in file options for gulp-concat');
	}

	var bufferManifests = function (file, enc, callback) {
		if (file.isNull()) {
			callback();
			return;
		}

		if (file.isStream()) {
			this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
			return callback();
		}

		if (!latestMod || file.stat && file.stat.mtime > latestMod) {
			latestFile = file;
			latestMod = file.stat && file.stat.mtime;
		}

		// construct concat instance
		if (!manifest) {
			manifest = {};
		}

		util.getManifest(file.history[0], options)
			.then(function(contents) {
				manifest[contents.name] = contents;

				callback();
			}.bind(this));
	};

	var endStream = function (callback) {
		// no files passed in, no file goes out
		if (!latestFile || !manifest) {
			callback();
			return;
		}

		var joinedFile;

		// if file opt was a file path
		// clone everything from the latest file
		if (typeof file === 'string') {
			joinedFile = latestFile.clone({
				contents: false
			});
			joinedFile.path = path.join(latestFile.base, file);
		} else {
			joinedFile = new gulputil.File(file);
		}

		joinedFile.contents = new Buffer(JSON.stringify(manifest));

		this.push(joinedFile);

		callback();
	};

	return through.obj(bufferManifests, endStream);
}

module.exports = manifest;
