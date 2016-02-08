# gulp-ractive-foundation

## Overview

gulp-ractive-foundation aims to provide gulp tools to help build ractive-foundation based projects

## Synopsis

	# in your gulpfile.js
	var gulp = require('gulp');
	var grf = require('gulp-ractive-foundation')({
		// global defaults
		prefix: 'Ractive.components',
	});

	// Build components
	gulp.task('component', function () {
		return gulp.src('src/components/*/manifest.json')
			.pipe(grf.component())
			.pipe(gulp.dest('public/compiled'));
	});

	// Plugins (transitions/decorators/events etc)
	gulp.task('plugin', function () {
		return gulp.src('src/plugin/*/manifest.json')
			.pipe(grf.plugin())
			.pipe(gulp.dest('public/compiled'));
	});

	// Templates eg partials
	gulp.task('partials', function () {
		return gulp.src('src/partials/**/*.hbs')
			.pipe(grf.template())
			.pipe(gulp.dest('public/compiled'));
	});

	// Manifests (can be used for building menus for documentation)
	gulp.task('manifests', function () {
		return gulp.src([
				'src/plugins/*/manifest.json',
				'src/components/*/manifest.json'
			])
			.pipe(grf.manifest('manifests.json'))
			.pipe(gulp.dest('public/compiled'));
	});

	// Documentation for plugins and components
	gulp.task('manifests', function () {
		return gulp.src([
				'src/plugins/*/manifest.json'
			])
			.pipe(grf.documentation({
			}))
			.pipe(gulp.dest('public/plugins'));
	});
	gulp.task('manifests', function () {
		return gulp.src([
				'src/components/*/manifest.json'
			])
			.pipe(grf.documentation())
			.pipe(gulp.dest('public/components'));
	});
