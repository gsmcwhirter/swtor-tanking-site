all: build static/js static/css
	cp build/build.js static/js/build.js
	cp build/build.css static/css/build.css
	cp -r fonts static/

build: components static static/index.html stylus/layout.css
	@./node_modules/component/bin/component build

static:
	-mkdir -p static

static/js:
	-mkdir -p static/js
	
static/css:
	-mkdir -p static/css

static/index.html: static jade/index.jade
	@./node_modules/jade/bin/jade jade/index.jade --out static
	
stylus/layout.css: static stylus/layout.styl
	@./node_modules/stylus/bin/stylus stylus/layout.styl

components: js/index.js component.json
	@./node_modules/component/bin/component install

clean:
	rm -fr build components static

.PHONY: clean
