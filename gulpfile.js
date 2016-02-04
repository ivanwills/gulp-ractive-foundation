
var del     = require('del'),
	gulp    = require('gulp'),
	grf     = require('./index.js'),
	plugins = require('gulp-load-plugins')(),
	runSequence = require('run-sequence');

gulp.task('clean', function (callback) {
	return del([
		'./public'
	], callback);
});

gulp.task('component-js', function () {
	return gulp.src([
			'src/components/*/manifest.json',
			'node_modules/ractive-foundation/src/components/*/manifest.json'
		])
		.pipe(grf.componentJs())
		.pipe(plugins.concat('components.js'))
		.pipe(gulp.dest('public/js'));
});

//gulp.task('component-scss', function () {
//	return gulp.src('src/components/*/manifest.json')
//		.pipe(grf.componentScss)
//		.pipe(gulp.dest('public/js'));
//});

gulp.task('default', function () {
	return runSequence('clean', 'component-js', function (err) {
		this.emit('end');
	}.bind(this));
});
