/**
 * priv-client
 * ===========
 *
 * Склеивает *priv*-файлы по deps'ам с помощью набора `require` в виде `?.priv.client.js`.
 * Предназначен для сборки клиентского priv-кода.
 *
 * **Опции**
 *
 * * *String* **target** — Результирующий таргет. По умолчанию — `?.priv.client.js`.
 * * *String* **filesTarget** — files-таргет, на основе которого получается список исходных файлов 
 *   (его предоставляет технология `files`). По умолчанию — `?.files`.
 * * *Array* **sourceSuffixes** — суффиксы файлов, по которым строится `files`-таргет. По умолчанию — ['priv.js'].
 * * *Boolean* **keepRequires** — отключает вырезание require, позволяет ускорить сборку. По умолчанию — `false`.
 *
 * **Пример**
 *
 * ```javascript
 * nodeConfig.addTech(require('enb-priv-js/techs/priv-client'));
 * ```
 */
var path  = require('path');
var Vow   = require('vow');
var vowFs = require('enb/lib/fs/async-fs');
var privClientProcessor = require('../lib/priv-client-processor');

module.exports = require('enb/lib/build-flow').create()
    .name('priv-client')
    .target('target', '?.priv.client.js')
    .defineOption('privFile', '')
    .defineOption('dependencies', {})
    .defineOption('keepRequires', false)
    .useFileList(['priv.js'])
    .needRebuild(function (cache) {
        this._privFile = this._privFile ?
            path.join(this.node._root, this._privFile) :
            require.resolve('priv-js/lib/priv.js');
        return cache.needRebuildFile('bh-file', this._privFile);
    })
    .saveCache(function (cache) {
        cache.cacheFileInfo('priv-file', this._privFile);
    })
    .builder(function (privFiles) {
        var node = this.node;
        var dependencies = this._dependencies;
        var keepRequires = this._keepRequires;

        return Vow.all([
            vowFs.read(this._privFile, 'utf8').then(function (data) {
                return data;
            }),
            Vow.all(privFiles.map(function (file) {
                return vowFs.read(file.fullname, 'utf8').then(function (data) {
                    var relPath = node.relativePath(file.fullname);
                    /**
                     * Выставляем комментарии о склеенных файлах.
                     */
                    return [
                        '// begin: ' + relPath,
                        privClientProcessor.process(data, keepRequires),
                        '// end: ' + relPath
                    ].join('\n');
                });
            })).then(function (sr) {
                return sr.join('\n');
            })
        ]).spread(function (privEngineSource, inputSources) {
            return privClientProcessor.build(privEngineSource, inputSources, dependencies);
        });
    })
    .createTech();
