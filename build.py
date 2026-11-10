#!/usr/bin/env python3
"""build.py -- concatenate src/*.js into one closure and inline three.js: writes index.html (single self-contained file)."""
import io, os, glob
here = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: io.open(os.path.join(here, p), encoding='utf-8').read()
shell = rd('src/shell.html')
three = rd('src/three.min.js')
k = three.index('/**')            # drop the deprecation console.warn that precedes the licence banner
three = '0,' + three[k:]
parts = [rd(os.path.relpath(p, here)) for p in sorted(glob.glob(os.path.join(here, 'src', '[a-z]_*.js')))]
game = '(() => {\n' + '\n'.join(parts) + '\n})();'
html = shell.replace('/*__THREE__*/', three).replace('/*__GAME__*/', game)
io.open(os.path.join(here, 'index.html'), 'w', encoding='utf-8', newline='\n').write(html)
print('index.html', len(html), 'bytes')
