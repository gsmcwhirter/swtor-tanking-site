var path = require('path')
  , config = require('./config.json')
  ;  

module.exports = function (grunt){
  grunt.initConfig({
    mkdir: {
      all: {
        options: {
          create: ['static', 'static/js', 'static/css', 'static/fonts']
        }
      }
    }
  , jade: {
      compile: {
        files: {
          "static/index.html": "jade/index.jade"
        } 
      } 
    }
  , stylus: {
      compile: {
        files: {
          "stylus/layout.css": "stylus/layout.styl"
        }
      }
    }
  , component: {
      install: {
        options: {
          action: 'install'
        }  
      }
    , build: {
        options: {
          action: 'build'
        }
      }
    }
  , copy: {
      fonts: {
        files: [
          {expand: true, flatten: true, src: "fonts/**", dest: "static/fonts", filter: 'isFile'}
        ]
      }
    , js: {
        files: [
          {src: "build/build.js", dest: "static/js/build.js"}
        ]
      }
    , css: {
        files: [
          {src: "build/build.css", dest: "static/css/build.css"}
        ]
      }
    }
  , clean: ["static", "build", "components", "stylus/layout.css"]
  , forever: {
      options: {
        index: 'server.js'
      , silent: false
      , forever: true
      , uid: config.uid || null
      , max: 10
      , env: {
          NODE_ENV: process.env.environment || config.environment || 'development'
        , host: process.env.host || config.host || 'INADDR_ANY'
        , port: process.env.port || config.port || 3000
        , procs: process.env.procs || config.procs || 1  
        }
      , rawLogDir: true
      , logDir: config.logDir || path.join(process.cwd(), "log")
      , logFile: "tortank_forever.log"
      , outFile: "tortank_out.log"
      , errFile: "tortank_error.log"
      , appendLog: true
      }
    }
  });
  
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-contrib-stylus");
  grunt.loadNpmTasks("grunt-contrib-jade");
  grunt.loadNpmTasks("grunt-component");
  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-mkdir");
  grunt.loadNpmTasks("grunt-forever");
  
  grunt.registerTask("default", ["mkdir", "jade", "stylus", "component:install", "component:build", "copy:fonts", "copy:css", "copy:js"]);
}
