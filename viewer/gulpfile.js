var gulp = require("gulp");
var flatten = require('gulp-flatten');
var ts = require("gulp-typescript");

gulp.task('build-tsc', function() {
  var tsProject = ts.createProject('./tsconfig.json');
  return tsProject.src()
      .pipe(tsProject())
      .pipe(flatten())
      .pipe(gulp.dest('./dist/js'));
});


gulp.task('copy-src', function() {
  return gulp.src(['./view/*.*', '!**/*.ts'])
      .pipe(gulp.dest('./dist'));
});


gulp.task('copy-assets', function() {
  return gulp.src('../assets/**/*.*')
      .pipe(gulp.dest('./dist/assets'));
});


gulp.task('default', gulp.series(gulp.parallel(
  'build-tsc',
  'copy-src',
  'copy-assets'
)));


gulp.task('watch', function() {
  gulp.watch('./src/*.ts', gulp.task('default'));
});
