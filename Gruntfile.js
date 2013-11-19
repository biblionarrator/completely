module.exports = function(grunt) {
    grunt.initConfig({
        uglify: {
            dist: {
                files: {
                    'complete.ly.2.0.0.min.js': [ 'complete.ly.2.0.0.js' ],
                }
            }
        },
        cssmin: {
            minify: {
                files: {
                    'complete.ly.2.0.0.min.css': [ 'complete.ly.2.0.0.css' ],
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');

    grunt.registerTask('default', [ 'uglify', 'cssmin' ]);
};
