var gulp = require('gulp');
var rename = require('gulp-rename');
var xmi2angular = require('./');

gulp.task('default', function() {
	/*gulp.src('/Users/fabian/Desktop/Projects/xmi2angular/xmi.xml')
    .pipe(xmi2angular())
    .pipe(gulp.dest('build/'));*/
    gulp.src('xml/*.xml')
		.pipe(xmi2angular())
		.pipe(rename({extname: '.ts'}))
		.pipe(gulp.dest('dist'));
});