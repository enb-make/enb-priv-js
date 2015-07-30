/**
 * priv-js
 * =======
 *
 * Собирает `?.priv.js` по deps'ам, обрабатывая Борщиком, добавляет BEMHTML в начало.
 *
 * Имя результирующего файла в данный момент не настраивается (нет запросов на эту функцию).
 *
 * **Опции**
 *
 * * *String* **bemhtmlTarget** — Имя `bemhtml.js`-таргета. По умолчанию — `?.bemhtml.js`.
 * * *String* **filesTarget** — files-таргет, на основе которого получается список исходных файлов
 *   (его предоставляет технология `files`). По умолчанию — `?.files`.
 * * *Array* **sourceSuffixes** — суффиксы файлов, по которым строится `files`-таргет. По умолчанию — ['priv.js'].
 *
 * **Пример**
 *
 * ```js
 * nodeConfig.addTech(require('enb-priv-js/techs/priv-js'));
 * ```
 */
var vow = require('vow');
var vowFs = require('enb/lib/fs/async-fs');
var borschik = require('borschik');

module.exports = require('enb/lib/build-flow').create()
    .name('priv-js')
    .target('target', '?.priv.js')
    .useFileList(['priv.js'])
    .useSourceText('bemhtmlTarget', '?.bemhtml.js')
    .builder(function (sourceFiles, bemhtml) {
        var _this = this;
        var target = this._target;
        var node = this.node;
        return vow.all(sourceFiles.map(function (file) {
            return _this.node.createTmpFileForTarget(target).then(function (tmpfile) {
                var opts = {
                    input: file.fullname,
                    output: tmpfile,
                    freeze: false,
                    minimize: false
                };
                return vow.when(borschik.api(opts)).then(function () {
                    return vowFs.read(tmpfile, 'utf8').then(function (data) {
                        var filename = node.relativePath(file.fullname);
                        vowFs.remove(tmpfile);
                        var pre = '/* ' + filename + ': begin */\n';
                        var post = '\n/* ' + filename + ': end */';
                        return pre + data + post;
                    });
                });
            });
        })).then(function (res) {
            res.push(
                '\nif (typeof exports !== "undefined" && typeof blocks !== "undefined") { exports.blocks = blocks; }\n'
            );
            return bemhtml + '\n' + res.join('\n');
        });
    })
    .createTech();
