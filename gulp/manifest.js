/* global require, module, Buffer */

var through     = require('through2'),
	gulputil    = require('gulp-util'),
	util        = require('./utils'),
	_           = require('lodash'),
	path        = require('path'),
	PluginError = gulputil.PluginError;

const PLUGIN_NAME = 'gulp-ractive-foundation-manifest';

function manifest(file, options) {
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
		throw new PluginError(PLUGIN_NAME, `Missing path in file options for ${PLUGIN_NAME}`);
	}

	var bufferManifests = (file, enc, callback) => {
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

		util.getManifest(file.path, options)
			.then((contents) => {
				manifest[contents.name] = contents;

				callback();
			});
	};

	var endStream = (callback) => {
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

		callback(null, joinedFile);
	};

	return through.obj(bufferManifests, endStream);
}

module.exports = (defaults) => {
	return (file, options) => manifest(file, _.assign({}, defaults, options));
};
