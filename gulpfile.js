const ts = require("gulp-typescript");
const tsProject = ts.createProject("tsconfig.json");
const gulp = require("gulp");
const browserify = require("browserify");
const source = require("vinyl-source-stream");
const tsify = require("tsify");
const watchify = require("watchify");
const gutil = require("gulp-util");
const uglify = require("gulp-uglify");
const sourcemaps = require("gulp-sourcemaps");
const buffer = require("vinyl-buffer");
const clean = require("gulp-clean"); //清理文件或文件夹
const standalonify = require("standalonify");
var merge = require("merge2");
gulp.task("clean", function () {
  return gulp.src("lib/*", { read: false }).pipe(clean());
});

gulp.task("tsc", function () {
  var tsResult = tsProject.src().pipe(tsProject());
  return merge([
    tsResult.dts.pipe(gulp.dest("lib")),
    tsResult.js.pipe(gulp.dest("lib")),
  ]);
});
gulp.task("copy_file", function () {
  return gulp
    .src(["./src/**/*.js", "./src/**/*.json"], { base: "./src" })
    .pipe(gulp.dest("lib"));
});

gulp.task("default", gulp.series("clean", "tsc", "copy_file"));
