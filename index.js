/* global require, module */

var component     = require('./tasks/component'),
	template      = require('./tasks/template'),
	plugin        = require('./tasks/plugin'),
	manifest      = require('./tasks/manifest'),
	documentation = require('./tasks/documentation'),
	fs            = require('fs'),
	path          = require('path');

module.exports = function(options) {
	// set up defaults
	if (! options) {
		options = {};
	}
	if (! options.useCases) {
		options.useCases = 'use-cases';
	}
	if (!options.prefix) {
		options.prefix = {
			components:  'Ractive.components',
			decorators:  'Ractive.decorators',
			partials:    'Ractive.partials',
			templates:   'Ractive.defaults.templates',
			transitions: 'Ractive.transitions',
		};
	}
	if (!options.type) {
		options.type = 'components';
	}
	if (typeof options.file2object !== 'function') {
		options.file2object = function (file) {
			file = typeof file === 'string' ? file : file.path;
			var parts = file.split(path.sep);

			// remove the file name form parts
			try {
				if (fs.statSync(file).isFile()) {
					parts.pop();
				}
			}
			catch (e) {
			}

			// get the direcory name
			var dir  = parts.pop();

			// if the directory is a use cases directory
			// pop that off as well
			if (dir === options.useCases) {
				dir = parts.pop();
			}

			// return the directory as the object name
			return dir;
		};
	}

	// initialise the components
	var object = {};
	object.component     = component(options);
	object.template      = template(options);
	object.plugin        = plugin(options);
	object.manifest      = manifest(options);
	object.documentation = documentation(options);

	return object;
};
