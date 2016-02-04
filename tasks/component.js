/* global require, module, Buffer */

var through  = require('through2'),
	gulputil = require('gulp-util'),
	Ractive  = require('ractive'),
	fs       = require('fs'),
	q        = require('q'),
	path     = require('path'),
	_        = require('lodash'),
	//applySourceMap = require('vinyl-sourcemaps-apply'),
	PluginError    = gulputil.PluginError,
	readFile = q.nfbind(fs.readFile),
	readDir = q.nfbind(fs.readdir);

const PLUGIN_NAME = 'gulp-ractive-parse';

var addObjectName = function(name) {
	return name.match(/^[$_a-zA-Z]\w+$/) ? '.' + name : '["' + name + '"]';
};

var addName = function(prefix, name, contents) {
	return prefix + addObjectName(name) + ' = ' + contents;
};

var allGood = function(all) {
	var contents = '';
	_.map(all, function(arg) {
		if (arg.state === 'fulfilled') {
			contents = contents + arg.value;
		}
	});

	return contents;
};

var getPartials = function(partialsDir, objectName, options) {
	return readDir(partialsDir)
		.then(function(files) {
			var list = [];
			_.map(files, function(file) {
				var template = file.match(/([\w-]+)?[.]hbs$/)[1];
				if (template) {
					list.push(
						readFile(partialsDir + path.sep + file, 'utf-8')
							.then(function(contents) {
								contents = Ractive.parse(contents, options);
								contents = JSON.stringify(contents);

								var text = addName(
									options.prefix +addObjectName(objectName) + '.partials',
									template,
									contents
								) + ';\n';

								return text;
							})
					);
				}
			});

			return q.all(list);
		});
};

var getComponent;
var getComponents = function(componentsDir, objectName, options) {
	return readDir(componentsDir)
		.then(function(files) {
			var list = [];
			_.map(files, function(file) {
				var component = componentsDir + path.sep + file;
				if (fs.statSync(component).isDirectory()) {
					var subOptions = _.clone(options);
					subOptions.prefix = options.prefix + addObjectName(objectName) + '.components';
					subOptions.inner = true;
					list.push(getComponent(component + path.sep + 'manifest.json', subOptions));
				}
			});

			return q.allSettled(list)
				.then(allGood);
		});
};

getComponent = function(file, options) {
	var nameRE     = new RegExp(path.sep + '([^' + path.sep + ']+)$');
	var dir        = file.replace(nameRE, '');
	var objectName = dir.match(nameRE)[1];
	console.log(options.prefix + ' - ' + objectName);

	var js = readFile(dir + path.sep + objectName + '.js', 'utf-8')
		.then(function(contents) {
			contents = contents.replace(/^\s*\/[*]\s*global[^*]*[*]\/(\r?\n)+/, '');
			return addName(options.prefix, objectName, contents);
		});

	var hbs = readFile(dir + path.sep + objectName + '.hbs', 'utf-8')
		.then(function(contents) {
			contents = Ractive.parse(contents, options);
			contents = JSON.stringify(contents);

			return addName(
				options.prefix + addObjectName(objectName) + '.defaults.templates',
				objectName,
				contents
			) + ';\n';
		});

	var partialsDir = dir + path.sep + 'partials';
	var partials = getPartials(partialsDir, objectName, options);

	var componentsDir = dir + path.sep + 'components';
	var components = getComponents(componentsDir, objectName, options);

	return q.allSettled([js, hbs, partials, components])
		.then(allGood);
};

function componentJs(options) {
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

		getComponent(file.history[0], options)
			.then(function(contents) {
				file.contents = new Buffer(contents);

				this.push(file);

				callback();
			}.bind(this));
	});

	return stream;
}

module.exports = componentJs;
