# gulp-ractive-foundation

## Overview

gulp-ractive-foundation aims to provide gulp tools to help build ractive-foundation based projects

## Synopsis

	# in your gulpfile.js
	var gulp = require('gulp');
	var grf = require('gulp-ractive-foundation');

	gulp.task('component-js', function () {
		return gulp.src('src/components/*/manifest.json')
			.pipe(grf.componentJs)
			.pipe(gulp.dest('public/js'));
	});

	gulp.task('component-scss', function () {
		return gulp.src('src/components/*/manifest.json')
			.pipe(grf.componentScss)
			.pipe(gulp.dest('public/js'));
	});
