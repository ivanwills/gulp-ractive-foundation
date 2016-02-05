
var del     = require('del'),
	gulp    = require('gulp'),
	grf     = require('./index.js'),
	plugins = require('gulp-load-plugins')(),
	mergeStream = require('merge-stream'),
	runSequence = require('run-sequence');

gulp.task('clean', function (callback) {
	return del([
		'./public'
	], callback);
});

gulp.task('build-components', function () {
	return gulp.src([
			'src/components/*/manifest.json',
			'node_modules/ractive-foundation/src/components/*/manifest.json'
		])
		.pipe(plugins.sourcemaps.init())
		.pipe(grf.component())
		.pipe(plugins.concat('components.js'))
		.pipe(plugins.sourcemaps.write())
		.pipe(gulp.dest('public/compiled/'));
});

gulp.task('build-plugins', function () {
	return gulp.src([
			'src/plugins/*/manifest.json',
			'node_modules/ractive-foundation/src/plugins/*/manifest.json'
		])
		.pipe(plugins.sourcemaps.init())
		.pipe(grf.plugin())
		.pipe(plugins.concat('plugins.js'))
		.pipe(plugins.sourcemaps.write())
		.pipe(gulp.dest('public/compiled/'));
});

gulp.task('build-partials', function () {
	return gulp.src([
			'**/*.hbs'
		], { cwd: 'src/partials/' })
		.pipe(plugins.sourcemaps.init())
		.pipe(grf.template({
			prefix: 'Ractive.partials'
		}))
		.pipe(plugins.concat('partials.js'))
		.pipe(plugins.sourcemaps.write())
		.pipe(gulp.dest('public/compiled/'));
});

gulp.task('build-test-templates', function () {
	return gulp.src([
			'src/*/**/use-cases/*.hbs'
		])
		.pipe(plugins.sourcemaps.init())
		.pipe(grf.template({
			prefix: 'Ractive'
		}))
		.pipe(plugins.concat('components.js'))
		.pipe(plugins.sourcemaps.write())
		.pipe(gulp.dest('public/js'));
});

gulp.task('sass', function () {

	return mergeStream(

		gulp.src('./src/**/*.scss')
			.pipe(plugins.sass())
			.pipe(plugins.concat('components.css'))
			.pipe(gulp.dest('./public/css')),

		gulp.src('./node_modules/foundation-sites/scss/*.scss')
			.pipe(plugins.sass())
			.pipe(gulp.dest('./public/css/foundation'))
	);

});

gulp.task('default', function () {
	return runSequence(
		'clean',
		'sass',
		'build-components',
		'build-plugins',
		'build-partials'
	);
});
