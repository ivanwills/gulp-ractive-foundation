
var del            = require('del'),
	gulp           = require('gulp'),
	grf            = require('./index.js')(),
	seleniumServer = require('./gulp/seleniumServer'),
	mergeStream    = require('merge-stream'),
	runSequence    = require('run-sequence'),
	sass           = require('gulp-sass'),
	copy           = require('gulp-copy'),
	sourcemaps     = require('gulp-sourcemaps'),
	concat         = require('gulp-concat');

gulp.task('clean', function (callback) {
	return del([
		'./public'
	], callback);
});

gulp.task('build-components', () => {
	return gulp.src([
			'src/components/**/*',
		])
		.pipe(grf.filter(/src\/components\/([^\/]+)/))
		.pipe(sourcemaps.init())
		.pipe(grf.component())
		.pipe(gulp.dest('public/components/'))
		.pipe(concat('components.js'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('public/compiled/'));
});

gulp.task('build-plugins', () => {
	return gulp.src([
			'src/plugins/**/*',
		])
		.pipe(grf.filter(/src\/plugins\/([^\/]+)/))
		.pipe(sourcemaps.init())
		.pipe(grf.plugin())
		.pipe(concat('js'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('public/compiled/'));
});

gulp.task('build-partials', () => {
	return gulp.src([
			'**/*.hbs'
		], { cwd: 'src/partials/' })
		.pipe(sourcemaps.init())
		.pipe(grf.template({
			type: 'partials'
		}))
		.pipe(concat('partials.js'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('public/compiled/'));
});

gulp.task('build-test-templates', () => {
	return gulp.src([
			'src/*/**/use-cases/*.hbs'
		])
		.pipe(sourcemaps.init())
		.pipe(grf.template({
			type: 'templates'
		}))
		.pipe(concat('testTemplates.js'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('public/compiled'));
});

gulp.task('build-manifest', () => {
	return gulp.src([
			'src/components/*/manifest.json',
			'src/plugins/*/manifest.json',
		])
		.pipe(sourcemaps.init())
		.pipe(grf.manifest('manifest.json'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('public/compiled/'));
});

gulp.task('build-documentation', ['build-documentation-components', 'build-documentation-plugins']);
gulp.task('build-documentation-components', () => {
	return gulp.src([
			'src/components/**/*',
		])
		.pipe(grf.filter(/src\/components\/([^\/]+)/))
		.pipe(grf.documentation({
			partials: 'src/docs/c*.html',
			relative: 'src/docs/',
			template: 'src/docs/component.html'
		}))
		.pipe(gulp.dest('public/components'));
});
gulp.task('build-documentation-plugins', () => {
	return gulp.src([
			'src/plugins/**/*',
		])
		.pipe(grf.filter(/src\/plugins\/([^\/]+)/))
		.pipe(grf.documentation({
			partials: 'src',
			template: 'src/component.html'
		}))
		.pipe(gulp.dest('public/plugins'));
});

gulp.task('bdd', function (callback) {
	var selServer = seleniumServer(),
		killed    = false;
	return gulp.src([
			'src/components/*/*.feature',
			'src/plugins/*/*.feature',
		])
		.pipe(grf.bdd({
			selServer: selServer.init(),
			steps    : [
				'src/components/*/*.steps.js',
				'src/plugins/*/*.steps.js',
			]
		}))
		.on('end', function() {
			if (!killed) {
				killed = true;
				var done = () => {};
				selServer
					.killServer()
					.then(done)
					.catch(done);
			}
		});
});

gulp.task('sass', () => {

	return mergeStream(

		gulp.src('./src/**/*.scss')
			.pipe(sass())
			.pipe(concat('components.css'))
			.pipe(gulp.dest('./public/css')),

		gulp.src('./node_modules/foundation-sites/scss/*.scss')
			.pipe(sass())
			.pipe(gulp.dest('./public/css/foundation'))
	);

});

gulp.task('copy-vendors', () => {

	return mergeStream(

		gulp.src([
			'./node_modules/ractive/ractive.js',
			'./node_modules/ractive/ractive.min.js',
			'./node_modules/ractive/ractive.min.js.map',
			'./node_modules/hammerjs/hammer.min.js',
			'./node_modules/ractive-touch/index.js',
			'./node_modules/ractive-events-tap/dist/ractive-events-tap.js',
			'./node_modules/jquery/dist/jquery.min.js',
			'./node_modules/jquery/dist/jquery.min.map',
			'./node_modules/lodash/lodash.min.js',
			'./node_modules/superagent/superagent.js',
			'./node_modules/foundation-sites/js/vendor/modernizr.js',
			'./node_modules/lodash/index.js',
			'./node_modules/hljs-cdn-release/build/highlight.min.js'
		])
		.pipe(copy('./public/js', { prefix: 1 })),

		gulp.src([
			'./node_modules/hljs-cdn-release/build/styles/github.min.css'
		])
		.pipe(copy('./public/css', { prefix: 1 })),

		// Our own project files.
		gulp.src('./src/route.js')
		.pipe(gulp.dest('./public/js')),

		// Some reference images, taken from Zurb for demo'ing, but not part of the real source.
		gulp.src([
			'./src/assets/images/**/*'
		])
		.pipe(gulp.dest('public/images/'))

	);

});

gulp.task('copy-docs', () => {
	return gulp.src(['src/docs/index.html'])
		.pipe(copy('./public', { prefix: 2 }));
});

gulp.task('build', [
	'sass',
	'copy-docs',
	'copy-vendors',
	'build-components',
	'build-plugins',
	'build-partials',
	'build-manifest',
	'build-documentation'
]);

gulp.task('default', () => {
	return runSequence(
		'clean',
		'build'
	);
});
