/* global require */

var Ractive  = require('ractive'),
	fs       = require('fs'),
	q        = require('q'),
	path     = require('path'),
	_        = require('lodash'),
	Ractive  = require('ractive'),
	Cucumber = require('cucumber'),
	glob     = require('simple-glob'),
	//applySourceMap = require('vinyl-sourcemaps-apply'),
	readFile = q.nfbind(fs.readFile),
	readDir = q.nfbind(fs.readdir);

Ractive.DEBUG = false;

// returns the simples way to add "name" to an object syntactically
// eg test  => .test
// or ux-test => ['ux-test']
var addObjectName = function(name) {
	return name.match(/^[$_a-zA-Z]\w+$/) ? '.' + name : '["' + name + '"]';
};

// returns the full object name
//  eg Ractive.components['ux-thing']
var objectName = function(options, name) {
	return options.prefix.parent + '.' + options.prefix[options.type] + addObjectName(name);
};

// return JS code to add the "contents" to "name" of object "prefix"
var addName = function(options, name, contents) {
	return objectName(options, name) + ' = ' + contents;
};

var saftyPrefix = function(options, type) {
	var prefixParts = options.prefix[type].split(/[.]/);
	var currPrefix  = prefixParts.shift();
	var out         = 'if (!' + options.prefix.parent + '.' + currPrefix + ') {\n' +
		'\t' + options.prefix.parent + '.' + currPrefix + ' = {};\n' +
		'}\n';

	for (var i in prefixParts) {
		currPrefix += '.' + prefixParts[i];
		out += 'if (!' + options.prefix.parent + '.' + currPrefix + ') {\n' +
			'\t' + options.prefix.parent + '.' + currPrefix + ' = {};\n' +
			'}\n';
	}
	return out;
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
			//console.error('bad stuff', arg);
		}
	});

	return good;
};

var parseTemplate = function(contents, options) {
	var ractive = ( options && options.ractive ) || Ractive;
	return ractive.parse(contents);
};

var files = function(dir, template, data) {
	var fileGlob = (dir + path.sep + template).replace(/[{][{](.*)[}][}]/, function(match, key) {
		return data[key];
	});
	return glob(fileGlob);
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
									options,
									template,
									JSON.stringify(parseTemplate(contents, options))
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
					var subOptions = _.clone(options, 1);
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
	var name       = dir.match(nameRE)[1];
	var fullName   = objectName(options, name);
	var subOptions = _.clone(options, 1);
	subOptions.prefix.parent = fullName;

	var js = readFile(files(dir, options.files.components, {name: name})[0], 'utf-8')
		.then(function(contents) {
			contents = contents.replace(/^\s*\/[*]\s*global[^*]*[*]\/(\r?\n)+/, '');
			return addName(
				options,
				name,
				contents
			) + (options.suffix || '');
		});

	var hbs = readFile(files(dir, options.files.templates, {name: name})[0], 'utf-8')
		.then(function(contents) {
			var templateOptions = _.clone(options, 1);
			templateOptions.type = 'templates';
			return saftyPrefix(options, 'templates') +
				addName(
				templateOptions,
				name,
				JSON.stringify(parseTemplate(contents, options))
			) + ';\n';
		});

	var partialOptions = _.clone(subOptions, 1);
	partialOptions.type = 'partials';
	var partialsDir = dir + path.sep + 'partials';
	var partials = getPartials(partialsDir, name, partialOptions);

	var componentsDir = dir + path.sep + 'components';
	var components = getComponents(componentsDir, name, subOptions);

	return q.allSettled([hbs, js, partials, components])
		.then(allGood)
		.then(function(js) {
			return [js, name];
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
				options,
				objectName,
				JSON.stringify(parseTemplate(contents, options))
			) + ';\n';
		});
};

var getTemplates = function(templates, options) {
	var files = glob(templates);
	var list = [];
	files.map(function(file) {
		var isFile;
		try {
			isFile = fs.statSync(file).isFile();
		}
		catch (e) {}

		if (!isFile) {
			return;
		}

		var base = file;
		if (options.relative) {
			base = base.replace(options.relative, '');
		}
		base = base.replace(/[.]\w+$/, '');

		list.push(readFile(file)
			.then(function (contents) {
				return [base, parseTemplate(contents.toString(), options)];
			})
		);
	});

	return q.allSettled(list)
		.then(onlyGood)
		.then(function(all) {
			var templates = {};
			_.map(all, function (template) {
				templates[template[0]] = template[1];
			});

			return templates;
		});
};

var getManifest;
var getDocumentation = function(file, options) {

	return getManifest(file, options)
		.then(function(manifest) {
			return options.ractive.then(function(Ractive) {
				// now have the object who's documentation we want to generate's manifest can start building.
				manifest.componentName = options.file2object(file, options);
				Ractive.set('component', manifest);

				return Ractive.toHTML();
			})
			.catch(function(e) {
				console.log(e);
			});
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

								json.useCasesNames = json.useCases.keys.sort;
								return json;
							});
					});
			}
			catch (e) {
				return json;
			}
		});
};

var runBdd = function(file, options) {
	var step = file.replace(/[.]feature$/, '.steps.js'),
		args = [
		'node',
		'cucumber-js',
		'-f', options.format,
		'-r', step,
		file
	];
	if (options.tags) {
		args.push('--tags', options.tags.join(','));
	}
	var cli = Cucumber.Cli(args).run(function(succeeded) {
		console.log('ran ', args, arguments);
		if (!succeeded) {
			throw new Error('Cucumber tests failed!');
		}
		return;
	});
	return cli;
};

module.exports = {
	getComponent    : getComponent,
	getComponents   : getComponents,
	getDocumentation: getDocumentation,
	getManifest     : getManifest,
	getPartials     : getPartials,
	getTemplates    : getTemplates,
	getTemplate     : getTemplate,
	runBdd          : runBdd
};
