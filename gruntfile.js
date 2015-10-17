module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      dist: {
        src: ['bower_components/three.js/three.js',
              'bower_components/threex.rendererstats/threex.rendererstats.js',
              'bower_components/requirejs/require.js',
              'src/libs/three-ext/*',
              'src/main.js'],
        dest: 'dist/js/<%= pkg.name %>.min.js'
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      },
      dist: {
        files: {
          'dist/js/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      }
    },
    less: {
      all: {
        src: 'src/assets/less/*.less',
        dest: 'dist/css/<%= pkg.name %>.css',
        options: {
          compress: true
        }
      }
    },
    cssmin: {
      options: {
        report: "gzip"
      },
      minify: {
        expand: true,
        cwd: 'dist/css/',
        src: ['*.css'],
        dest: 'dist/css/',
        ext: '.css'
      }
    },
    htmlmin: {
      dist: {
        options: {
          removeComments: true,
          collapseWhitespace: true
        },
        files: {
          'dist/index.html': 'src/assets/html/index.html'
        }
      }
    },
    copy: {
      main: {
        files: [
          // includes files within path and its sub-directories
          {expand: true, cwd: 'src/assets', src: ['video/**'], dest: 'dist/'},
          {expand: true, cwd: 'src/assets', src: ['objects/**'], dest: 'dist/'},
          {expand: true, cwd: 'src/assets', src: ['music/**'], dest: 'dist/'}
        ]
      }
    },
    watch: {
      files: ["src/assets/less/*.less", "src/assets/objects/**/*","src/libs/three-ext/*" ,"src/main.js","src/assets/html/*.html"],
      tasks: ['less','cssmin','concat','htmlmin','copy']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-htmlmin');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.registerTask('default', ['less','cssmin','concat','htmlmin','copy']);
};