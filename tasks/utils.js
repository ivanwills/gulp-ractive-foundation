/* global require */

var Ractive  = require('ractive'),
	fs       = require('fs'),
	q        = require('q'),
	path     = require('path'),
	_        = require('lodash'),
	//applySourceMap = require('vinyl-sourcemaps-apply'),
	readFile = q.nfbind(fs.readFile),
	readDir = q.nfbind(fs.readdir);

// returns the simples way to add "name" to an object syntactically
// eg test  => .test
// or ux-test => ['ux-test']
var addObjectName = function(name) {
	return name.match(/^[$_a-zA-Z]\w+$/) ? '.' + name : '["' + name + '"]';
};

// return JS code to add the "contents" to "name" of object "prefix"
var addName = function(prefix, name, contents) {
	return prefix + addObjectName(name) + ' = ' + contents;
};

// function to combine all good promises (ignoring bad ones)
var allGood = function(all) {
	var contents = '';
	_.map(all, function(arg) {
		if (arg.state === 'fulfilled') {
			contents = contents + arg.value;
		}
	});

	return contents;
};

// function to return only good promises (ignoring bad ones)
var onlyGood = function(all) {
	var good = [];
	_.map(all, function(arg) {
		if (arg.state === 'fulfilled') {
			good.push(arg.value);
		}
		else {
			//console.error(arg);
		}
	});

	return good;
};

var parseTemplate = function(contents, options) {
	contents = Ractive.parse(contents, options);
	return JSON.stringify(contents);
};

// get all partials from the partials directory and compile them
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
								var text = addName(
									options.prefix + addObjectName(objectName) + '.partials',
									template,
									parseTemplate(contents, options)
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
// Find all sub components and build them
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
					list.push(getComponent(component + path.sep + 'manifest.json', subOptions)
						.then(function(js) {
							return js[0];
						})
					);
				}
			});

			return q.allSettled(list)
				.then(allGood);
		});
};

// Build the component from "file"
getComponent = function(file, options) {
	var nameRE     = new RegExp(path.sep + '([^' + path.sep + ']+)$');
	var dir        = file.replace(nameRE, '');
	var objectName = dir.match(nameRE)[1];

	var js = readFile(dir + path.sep + objectName + '.js', 'utf-8')
		.then(function(contents) {
			contents = contents.replace(/^\s*\/[*]\s*global[^*]*[*]\/(\r?\n)+/, '');
			return addName(options.prefix, objectName, contents);
		});

	var hbs = readFile(dir + path.sep + objectName + '.hbs', 'utf-8')
		.then(function(contents) {
			return addName(
				'Ractive.defaults.templates',
				objectName,
				parseTemplate(contents, options)
			) + ';\n';
		});

	var partialsDir = dir + path.sep + 'partials';
	var partials = getPartials(partialsDir, objectName, options);

	var componentsDir = dir + path.sep + 'components';
	var components = getComponents(componentsDir, objectName, options);

	return q.allSettled([hbs, js, partials, components])
		.then(allGood)
		.then(function(js) {
			return [js, objectName];
		});
};

var getTemplate = function(file, options) {
	var objectName = file.replace(options.base, '')
		.replace(/\//g, '-')
		.replace(/^-/, '')
		.replace(/[.]hbs$/, '');

	return readFile(file, 'utf-8')
		.then(function(contents) {
			return addName(
				options.prefix,
				objectName,
				parseTemplate(contents, options)
			) + ';\n';
		});
};

var getManifest;
var getDocumentation = function(file, options) {

	return getManifest(file, options)
	.then(function(manifest) {
		return JSON.stringify(manifest) + '\n';
	});
};

getManifest = function(file, options) {
	var objectDir  = path.dirname(file),
		objectName = path.basename(objectDir),
		usecases   = objectDir + path.sep + 'use-cases';

	return readFile(file)
		.then(function(contents) {
			var json = JSON.parse(contents);
			json.name = objectName;
			json.dir  = objectDir;
			json.useCases = {};

			try {
				if (! fs.statSync(usecases).isDirectory()) {
					return json;
				}

				return readDir(usecases)
					.then(function(all) {
						var list = [];
						_.map(all, function (file) {
							if (file.match(/[.]json$/)) {
								list.push(readFile(usecases + path.sep + file)
									.then(function (contents) {
										var json = JSON.parse(contents);
										json.name = file.replace(/[.]json$/, '');
										return json;
									})
								);
							}
						});

						return q.allSettled(list)
							.then(onlyGood)
							.then(function(all) {
								_.map(all, function (usecase) {
									json.useCases[usecase.name] = usecase;
								});

								return json;
							});
					});
			}
			catch (e) {
				return json;
			}
		});
};

module.exports = {
	getComponent    : getComponent,
	getComponents   : getComponents,
	getDocumentation: getDocumentation,
	getManifest     : getManifest,
	getPartials     : getPartials,
	getTemplate     : getTemplate
};
