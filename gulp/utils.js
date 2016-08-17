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
var addObjectName = (name) => {
	return name.match(/^[$_a-zA-Z]\w+$/) ? `.${name}` : `['${name}']`;
};

// returns the full object name
//  eg Ractive.components['ux-thing']
var objectName = (options, name) => {
	return options.prefix.parent + '.' + options.prefix[options.type] + addObjectName(name);
};

// return JS code to add the "contents" to "name" of object "prefix"
var addName = (options, name, contents) => {
	return objectName(options, name) + ' = ' + contents;
};

var saftyPrefix = (options, type) => {
	var prefixParts = options.prefix[type].split(/[.]/);
	var currPrefix  = prefixParts.shift();
	var out         = `if (!${options.prefix.parent}.${currPrefix}) {\n` +
		`\t${options.prefix.parent}.${currPrefix} = {};\n` +
		'}\n';

	for (var i in prefixParts) {
		currPrefix += `.${prefixParts[i]}`;
		out += `if (!${options.prefix.parent}.${currPrefix}) {\n` +
			`\t${options.prefix.parent}.${currPrefix} = {};\n` +
			'}\n';
	}
	return out;
};

// function to combine all good promises (ignoring bad ones)
var allGood = (all) => {
	var contents = '';
	_.map(all, (arg) => {
		if (arg.state === 'fulfilled') {
			contents = contents + arg.value;
		}
	});

	return contents;
};

// function to return only good promises (ignoring bad ones)
var onlyGood = (all) => {
	var good = [];
	_.map(all, (arg) => {
		if (arg.state === 'fulfilled') {
			good.push(arg.value);
		}
		else {
			//console.error('bad stuff', arg);
		}
	});

	return good;
};

var parseTemplate = (contents, options) => {
	var ractive = ( options && options.ractive ) || Ractive;
	return ractive.parse(contents);
};

var files = (dir, template, data) => {
	var fileGlob = (dir + path.sep + template).replace(/[{][{](.*)[}][}]/, (match, key) => data[key]);
	return glob(fileGlob);
};

// get all partials from the partials directory and compile them
var getPartials = (partialsDir, objectName, options) => {
	return readDir(partialsDir)
		.then((files) => {
			var list = [];
			_.map(files, (file) => {
				var template = file.match(/([\w-]+)?[.]hbs$/)[1];
				if (template) {
					list.push(
						readFile(partialsDir + path.sep + file, 'utf-8')
							.then((contents) => {
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
var getComponents = (componentsDir, objectName, options) => {
	return readDir(componentsDir)
		.then((files) => {
			var list = [];
			_.map(files, (file) => {
				var component = componentsDir + path.sep + file;
				if (fs.statSync(component).isDirectory()) {
					var subOptions = _.clone(options, 1);
					subOptions.inner = true;
					list.push(getComponent(`${component}${path.sep}manifest.json`, subOptions)
						.then((js) => js[0])
					);
				}
			});

			return q.allSettled(list)
				.then(allGood);
		});
};

// Build the component from "file"
getComponent = (file, options) => {
	var nameRE     = new RegExp(`${path.sep}([^${path.sep}]+)$`);
	var dir        = file.replace(nameRE, '');
	var name       = dir.match(nameRE)[1];
	var fullName   = objectName(options, name);
	var subOptions = _.clone(options, 1);
	subOptions.prefix.parent = fullName;

	var js = readFile(files(dir, options.files.components, {name: name})[0], 'utf-8')
		.then((contents) => {
			contents = contents.replace(/^\s*\/[*]\s*global[^*]*[*]\/(\r?\n)+/, '');
			return addName(
				options,
				name,
				contents
			) + (options.suffix || '');
		});

	var hbs = readFile(files(dir, options.files.templates, {name: name})[0], 'utf-8')
		.then((contents) => {
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
		.then((js) => {
			return [js, name];
		});
};

var getTemplate = (file, options) => {
	var objectName = file.replace(options.base, '')
		.replace(/\//g, '-')
		.replace(/^-/, '')
		.replace(/[.]hbs$/, '');

	return readFile(file, 'utf-8')
		.then((contents) => {
			return addName(
				options,
				objectName,
				JSON.stringify(parseTemplate(contents, options))
			) + ';\n';
		});
};

var getTemplates = (templates, options) => {
	var files = glob(templates);
	var list = [];
	files.map((file) => {
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
			.then((contents) => [base, parseTemplate(contents.toString(), options)])
		);
	});

	return q.allSettled(list)
		.then(onlyGood)
		.then((all) => {
			var templates = {};
			_.map(all, (template) => {
				templates[template[0]] = template[1];
			});

			return templates;
		});
};

var getManifest;
var getDocumentation = (file, options) => {

	return getManifest(file, options)
		.then((manifest) => {
			return options.ractive.then((Ractive) => {
				// now have the object who's documentation we want to generate's manifest can start building.
				manifest.componentName = options.file2object(file, options);
				Ractive.set('component', manifest);

				return Ractive.toHTML();
			})
			.catch((e) => {
				console.log(e);
			});
		});
};

getManifest = (file, options) => {
	var objectDir  = path.dirname(file),
		objectName = path.basename(objectDir),
		usecases   = objectDir + path.sep + 'use-cases';

	return readFile(file)
		.then((contents) => {
			var json = JSON.parse(contents);
			json.name = objectName;
			json.dir  = objectDir;
			json.useCases = {};

			try {
				if (! fs.statSync(usecases).isDirectory()) {
					return json;
				}

				return readDir(usecases)
					.then((all) => {
						var list = [];
						_.map(all, (file) => {
							if (file.match(/[.]json$/)) {
								list.push(readFile(usecases + path.sep + file)
									.then((contents) => {
										var json = JSON.parse(contents);
										json.name = file.replace(/[.]json$/, '');
										return json;
									})
								);
							}
						});

						return q.allSettled(list)
							.then(onlyGood)
							.then((all) => {
								_.map(all, (usecase) => json.useCases[usecase.name] = usecase);

								json.useCasesNames = _.map(json.useCases, (v, k) => k).sort();
								return json;
							});
					});
			}
			catch (e) {
				return json;
			}
		});
};

var runBdd = (file, options) => {
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
	var cli = Cucumber.Cli(args).run((succeeded) => {
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
