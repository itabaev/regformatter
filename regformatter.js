var RegFormatter = (function () {
    function RegFormatter(obj) {
        var _this = this;
        var element = obj.element;
        if (element && element.tagName.toUpperCase() !== "INPUT")
            throw "Element should be <input />";
        this.element = element;
        var format = obj.format;
        this.format = format;

        var pattern = "";
        var patterns = [];
        var exps = [];
        var p = "";
        var expSymbols = [".", "[", "]", "(", ")", "+", "-", "*", "?", "{", "}", "|", "/", "^", "$"];
        var expBegBrackets = ["%", "[", "(", "{"];
        var expEndBrackets = ["%", "]", ")", "}"];
        var exp = false;
        var backslash = false;
        var brackets = [];
        var i;

        var addPattern = function (isExp) {
            if (p === "" || (isExp && (brackets.length > 1 || (i + 1 < format.length && format[i + 1] === "{"))))
                return;
            pattern += p;
            patterns.push(p);
            exps.push(isExp);
            p = "";
        };

        for (i = 0; i < format.length; i++) {
            if (backslash) {
                p += format[i];
                backslash = false;
                addPattern(exp);
                continue;
            }
            if (format[i] === "\\") {
                p += format[i];
                backslash = true;
                continue;
            }

            if (format[i] === "%") {
                if (!exp) {
                    brackets.push(format[i]);
                    addPattern(false);
                    exp = true;
                    continue;
                } else {
                    if (brackets.length && brackets[brackets.length - 1] === "%") {
                        brackets.pop();
                        addPattern(true);
                        exp = false;
                        continue;
                    } else
                        throw "Invalid pattern '" + format + "' at position " + i + " '" + format[i] + "'";
                }
            }

            if (!exp) {
                if (expSymbols.indexOf(format[i]) >= 0)
                    p += "\\" + format[i];
                else
                    p += format[i];
                addPattern(false);
                continue;
            }

            if (expBegBrackets.indexOf(format[i]) >= 0) {
                brackets.push(format[i]);
                p += format[i];
                addPattern(true);
                continue;
            }

            if (expEndBrackets.indexOf(format[i]) >= 0) {
                if (brackets.length && brackets[brackets.length - 1] === expBegBrackets[expEndBrackets.indexOf(format[i])]) {
                    brackets.pop();
                    p += format[i];
                    addPattern(true);
                    continue;
                } else
                    throw "Invalid pattern '" + format + "' at position " + i + " '" + format[i] + "'";
            }

            p += format[i];
            addPattern(true);
        }
        if (brackets.length)
            throw "Invalid pattern '" + format + "' at position " + (format.length - 1) + " '" + format[format.length - 1] + "'";

        i = 0;
        while (i < patterns.length) {
            if (exps[i]) {
                var regex = /\{(\d)\}$/;
                p = patterns[i];
                var ra = regex.exec(p);
                if (ra) {
                    var n = parseInt(ra[1]);
                    p = p.replace(regex, "");
                    patterns[i] = p;
                    for (var j = 1; j < n; j++) {
                        patterns.splice(i, 0, p);
                        exps.splice(i, 0, true);
                    }
                    i += n - 1;
                }
            }
            i++;
        }

        this.patternsOriginal = patterns.concat();

        var pushPatterns = function (ps, start) {
            var isFinal = true;
            for (var j = start; j < ps.length; j++) {
                if (exps[j]) {
                    var reg = /\{(\d),(\d)\}$/.exec(ps[j]);
                    if (reg) {
                        isFinal = false;
                        var n1 = parseInt(reg[1]);
                        var n2 = parseInt(reg[2]);
                        for (var k = n1; k <= n2; k++) {
                            var pat = ps.concat();
                            pat[j] = pat[j].replace(/\{(\d),(\d)\}$/, "{" + k + "}");
                            pushPatterns(pat, j + 1);
                        }
                        break;
                    }
                }
            }
            if (isFinal)
                _this.patternsArr.push(ps);
        };

        this.patternsArr = [];
        pushPatterns(patterns, 0);

        for (i = 0; i < patterns.length; i++) {
            if (/\{\d,\d\}/.test(patterns[i])) {
                patterns[i] = patterns[i].replace(/\{\d,(\d)\}/, "{1,$1}");
            }
        }

        this.pattern = pattern;
        this.patterns = patterns;
        this.exps = exps;

        if (element) {
            element.addEventListener("keydown", function (e) {
                var code = e.keyCode || e.charCode;
                if (code === 8 || code === 46) {
                    var value = _this.element.value;
                    if (!value)
                        return false;
                    var positionStart = _this.element.selectionStart;
                    var positionEnd = _this.element.selectionEnd;
                    if (positionStart === positionEnd) {
                        if (code === 8)
                            positionStart--;
                        else
                            positionEnd = positionStart + 1;
                    }
                    var val = _this.write("", value, positionStart, positionEnd);
                    if (val) {
                        _this.element.value = val.value;
                        _this.element.selectionStart = _this.element.selectionEnd = positionStart;
                        e.preventDefault();
                        return false;
                    }
                }
                return true;
            });

            element.addEventListener("keypress", function (e) {
                var char = String.fromCharCode(e.keyCode || e.charCode);
                var value = _this.element.value;
                var positionStart = _this.element.selectionStart;
                var positionEnd = _this.element.selectionEnd;
                var val = _this.write(char, value, positionStart, positionEnd === positionStart ? null : positionEnd);
                if (val) {
                    _this.element.value = val.value;
                    _this.element.selectionStart = _this.element.selectionEnd = val.position + 1;
                }
                e.preventDefault();
                return false;
            });

            element.addEventListener("paste", function (e) {
                var text = e.clipboardData.getData("text/plain");
                if (text) {
                    var value = _this.element.value;
                    var positionStart = _this.element.selectionStart;
                    var positionEnd = _this.element.selectionEnd;
                    var val = _this.write(text, value, positionStart, positionEnd === positionStart ? null : positionEnd);
                    if (val) {
                        _this.element.value = val.value;
                        _this.element.selectionStart = _this.element.selectionEnd = positionStart + val.value.length;
                    }
                }
                e.preventDefault();
                return false;
            });

            var value = this.element.value;
            if (value) {
                var val = this.write(value, "", 0, 0);
                if (val)
                    this.element.value = val.value;
                else
                    this.element.value = "";
            }
        }
    }
    RegFormatter.prototype.checkValue = function (value) {
        var pso = this.patternsOriginal.concat();
        pso.pop();
        var ps = this.patterns.concat();
        var length = this.patterns.length;
        for (var i = length; i > 0; i--) {
            var pat = pso.join("") + ps.pop();
            if (new RegExp("^" + pat + "$").test(value)) {
                return i;
            } else {
                pso.pop();
            }
        }
        return 0;
    };

    RegFormatter.prototype.value = function (value) {
        var _this = this;
        var result = "";
        value = value != undefined ? value : (!this.element ? "" : this.element.value);

        var getPattern = function (value) {
            var pso = _this.patternsOriginal.concat();
            pso.pop();
            var ps = _this.patterns.concat();
            for (var i = 0; i < _this.patterns.length; i++) {
                pso.push(ps.pop());
                if (new RegExp("^" + pso.join("") + "$").test(value)) {
                    break;
                } else {
                    pso.pop();
                    pso.pop();
                }
            }
            return pso;
        };

        var pso = getPattern(value);

        for (var i = 0; i < pso.length; i++) {
            if (this.exps[i]) {
                var match = value.match(new RegExp("^" + pso.slice(0, i + 1).join("")));
                result += match[0].replace(new RegExp("^" + pso.slice(0, i).join("")), "");
            }
        }

        return result;
    };

    RegFormatter.prototype.write = function (str, value, positionStart, positionEnd) {
        var currentValue = this.value(value);
        var newvalue;
        var position;
        if (!positionEnd) {
            var subvalue1 = this.value(value.substring(0, positionStart));
            var subvalue2 = currentValue.substring(subvalue1.length);
            newvalue = subvalue1 + str + subvalue2;
            position = subvalue1.length;
        } else {
            var value1 = this.value(value.substring(0, positionStart));
            var value2 = this.value(value.substring(0, positionEnd));
            var value3 = currentValue.substring(value2.length);
            newvalue = value1 + str + value3;
            position = value1.length;
        }

        for (var k = 0; k < this.patternsArr.length; k++) {
            var val = newvalue;
            var pos = position;
            var j = 1;
            var ps = this.patternsArr[k].concat();
            for (var i = 0; i < ps.length; i++) {
                var p = ps.slice(0, i + 1);
                var reg = null;
                while (j <= val.length) {
                    var subvalue = val.substring(0, j);
                    reg = new RegExp("^" + p.join("") + "$").exec(subvalue);
                    if (!reg) {
                        if (!this.exps[i]) {
                            var s = ps[i].replace(/^\\/, "");
                            val = val.substring(0, j - 1) + s + val.substring(j - 1);
                            if (j < pos + 2)
                                pos++;
                            continue;
                        } else {
                            j++;
                            continue;
                        }
                    } else {
                        j++;
                        break;
                    }
                }
                if (j > val.length) {
                    if (reg) {
                        return { value: val, position: pos + (str.length > 0 ? str.length - 1 : 0) };
                    } else
                        break;
                }
            }
        }
        return null;
    };
    return RegFormatter;
})();
//# sourceMappingURL=regformatter.js.map
