
var del     = require('del'),
	gulp    = require('gulp'),
	grf     = require('./index.js')(),
	plugins = require('gulp-load-plugins')(),
	seleniumServer = require('./node_modules/ractive-foundation/tasks/seleniumServer'),
	mergeStream    = require('merge-stream'),
	runSequence    = require('run-sequence');

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
		.pipe(gulp.dest('public/components/'))
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
			type: 'partials'
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
			type: 'templates'
		}))
		.pipe(plugins.concat('testTemplates.js'))
		.pipe(plugins.sourcemaps.write())
		.pipe(gulp.dest('public/compiled'));
});

gulp.task('build-manifest', function () {
	return gulp.src([
			'src/components/*/manifest.json',
			'src/plugins/*/manifest.json',
			'node_modules/ractive-foundation/src/components/*/manifest.json',
			'node_modules/ractive-foundation/src/plugins/*/manifest.json'
		])
		.pipe(plugins.sourcemaps.init())
		.pipe(grf.manifest('manifest.json'))
		.pipe(plugins.sourcemaps.write())
		.pipe(gulp.dest('public/compiled/'));
});

gulp.task('build-documentation', ['build-documentation-components', 'build-documentation-plugins']);
gulp.task('build-documentation-components', function () {
	return gulp.src([
			'src/components/*/manifest.json',
			'node_modules/ractive-foundation/src/components/*/manifest.json',
		])
		.pipe(grf.documentation({
			partials: 'src/',
			template: 'src/component.html'
		}))
		.pipe(gulp.dest('public/components'));
});
gulp.task('build-documentation-plugins', function () {
	return gulp.src([
			'src/plugins/*/manifest.json',
			'node_modules/ractive-foundation/src/plugins/*/manifest.json'
		])
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
			'node_modules/ractive-foundation/src/components/*/*.feature',
			'node_modules/ractive-foundation/src/plugins/*/*.feature'
		])
		.pipe(grf.bdd({
			selServer: selServer.init(),
			steps    : [
				'src/components/*/*.steps.js',
				'src/plugins/*/*.steps.js',
				'node_modules/ractive-foundation/src/components/*/*.steps.js',
				'node_modules/ractive-foundation/src/plugins/*/*.steps.js'
			]
		}))
		.on('end', function() {
			if (!killed) {
				killed = true;
				var done = function () {};
				selServer
					.killServer()
					.then(done)
					.catch(done);
			}
		});
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

gulp.task('copy-vendors', function () {

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
			'./node_modules/page/page.js',
			'./node_modules/foundation-sites/js/vendor/modernizr.js',
			'./node_modules/lodash-compat/index.js',
			'./node_modules/hljs-cdn-release/build/highlight.min.js'
		])
		.pipe(plugins.copy('./public/js', { prefix: 1 })),

		gulp.src([
			'./node_modules/hljs-cdn-release/build/styles/github.min.css'
		])
		.pipe(plugins.copy('./public/css', { prefix: 1 })),

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

gulp.task('build', [
	'sass',
	'copy-vendors',
	'build-components',
	'build-plugins',
	'build-partials',
	'build-manifest',
	'build-documentation'
]);

gulp.task('default', function () {
	return runSequence(
		'clean',
		'build'
	);
});
