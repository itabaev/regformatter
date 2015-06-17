var RegFormatter = (function () {
    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function (searchElement, fromIndex) {
            for (var i = (fromIndex || 0) ; i < this.length; i++)
                if (this[i] === searchElement)
                    return i;
            return -1;
        };
    }

    function RegFormatter(obj) {
        var _this = this;
        var element = obj.element;
        if (element && element.tagName.toUpperCase() !== "INPUT" && element.tagName.toUpperCase() !== "TEXTAREA")
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
            if (p === "" || (isExp && (brackets.length > 1 || (i + 1 < format.length && format.charAt(i + 1) === "{"))))
                return;
            pattern += p;
            patterns.push(p);
            exps.push(isExp);
            p = "";
        };

        for (i = 0; i < format.length; i++) {
            if (backslash) {
                p += format.charAt(i);
                backslash = false;
                addPattern(exp);
                continue;
            }
            if (format.charAt(i) === "\\") {
                p += format.charAt(i);
                backslash = true;
                continue;
            }

            if (format.charAt(i) === "%") {
                if (!exp) {
                    brackets.push(format.charAt(i));
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
                        throw "Invalid pattern '" + format + "' at position " + i + " '" + format.charAt(i) + "'";
                }
            }

            if (!exp) {
                if (expSymbols.indexOf(format.charAt(i)) >= 0)
                    p += "\\" + format.charAt(i);
                else
                    p += format.charAt(i);
                addPattern(false);
                continue;
            }

            if (expBegBrackets.indexOf(format.charAt(i)) >= 0) {
                brackets.push(format.charAt(i));
                p += format.charAt(i);
                addPattern(true);
                continue;
            }

            if (expEndBrackets.indexOf(format.charAt(i)) >= 0) {
                if (brackets.length && brackets[brackets.length - 1] === expBegBrackets[expEndBrackets.indexOf(format.charAt(i))]) {
                    brackets.pop();
                    p += format.charAt(i);
                    addPattern(true);
                    continue;
                } else
                    throw "Invalid pattern '" + format + "' at position " + i + " '" + format.charAt(i) + "'";
            }

            p += format.charAt(i);
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
            var keydownEventHandler = function (e) {
                e = e || window.event;
                var code = e.keyCode || e.charCode;
                if (code === 8 || code === 46) {
                    if (!_this.element.value)
                        return false;
                    var sel = RegFormatter.getCaretPosition(_this.element);
                    var positionStart = sel.selectionStart;
                    var positionEnd = sel.selectionEnd;
                    if (positionStart === positionEnd) {
                        if (code === 8)
                            positionStart--;
                        else
                            positionEnd = positionStart + 1;
                    }
                    var val = _this.write("", _this.element.value, positionStart, positionEnd);
                    if (val) {
                        _this.element.value = val.value;
                        _this.oldValue = val.value;
                        if (positionStart > val.value.length)
                            positionStart = val.value.length;
                        RegFormatter.setCaretPosition(_this.element, positionStart);
                        RegFormatter.preventEvent(e);
                        return false;
                    }
                }
                return true;
            };

            var keypressEventHandler = function (e) {
                e = e || window.event;
                var str = String.fromCharCode(e.keyCode || e.charCode);
                var sel = RegFormatter.getCaretPosition(_this.element);
                var positionStart = sel.selectionStart;
                var positionEnd = sel.selectionEnd;
                var val = _this.write(str, _this.element.value, positionStart, positionEnd === positionStart ? null : positionEnd);
                if (val) {
                    _this.element.value = val.value;
                    _this.oldValue = val.value;
                    RegFormatter.setCaretPosition(_this.element, val.position + 1);
                }
                RegFormatter.preventEvent(e);
                return false;
            };

            var pasteEventHandler = function (e) {
                e = e || window.event;
                var text = e.clipboardData.getData("text/plain");
                if (text) {
                    var sel = RegFormatter.getCaretPosition(_this.element);
                    var positionStart = sel.selectionStart;
                    var positionEnd = sel.selectionEnd;
                    var val = _this.write(text, _this.element.value, positionStart, positionEnd === positionStart ? null : positionEnd);
                    if (val) {
                        _this.element.value = val.value;
                        _this.oldValue = val.value;
                        RegFormatter.setCaretPosition(_this.element, val.position + 1);
                    }
                }
                RegFormatter.preventEvent(e);
                return false;
            };

            var inputEventHandler = function() {
                var val = _this.write(_this.element.value, "", 0);
                if (val) {
                    _this.element.value = val.value;
                    _this.oldValue = val.value;
                    RegFormatter.setCaretPosition(_this.element, val.value.length);
                } else
                    _this.element.value = _this.oldValue;
            }

            RegFormatter.addEvent(element, "keydown", keydownEventHandler);
            RegFormatter.addEvent(element, "keypress", keypressEventHandler);
            RegFormatter.addEvent(element, "paste", pasteEventHandler);
            RegFormatter.addEvent(element, "input", inputEventHandler);

            var value = this.element.value;
            if (value) {
                var newval = this.write(value, "", 0, 0);
                if (newval)
                    this.element.value = newval.value;
                else
                    this.element.value = "";
                this.oldValue = this.element.value;
            }
        }
    }

    RegFormatter.addEvent = function (elem, type, func) {
        if (elem.addEventListener)
            elem.addEventListener(type, func);
        else
            elem.attachEvent("on" + type, func);
    }

    RegFormatter.preventEvent = function (e) {
        if (e.preventDefault)
            e.preventDefault();
        else
            e.returnValue = false;
    }

    RegFormatter.getCaretPosition = function (elem) {
        if (document.selection) {
            elem.focus();
            var sel = document.selection.createRange();
            var selLen = sel.text.length;
            sel.moveStart('character', -elem.value.length);
            return {
                selectionStart: sel.text.length - selLen,
                selectionEnd: sel.text.length
            }
        }
        return {
            selectionStart: elem.selectionStart,
            selectionEnd: elem.selectionEnd
        }
    }

    RegFormatter.setCaretPosition = function (elem, pos) {
        if (elem.setSelectionRange) {
            elem.focus();
            elem.setSelectionRange(pos, pos);
        }
        else if (elem.createTextRange) {
            var range = elem.createTextRange();
            range.collapse(true);
            range.moveEnd('character', pos);
            range.moveStart('character', pos);
            range.select();
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

        var getPatterns = function (val) {
            var patterns = _this.patternsOriginal.concat();
            patterns.pop();
            var ps = _this.patterns.concat();
            for (var i = 0; i < _this.patterns.length; i++) {
                patterns.push(ps.pop());
                if (new RegExp("^" + patterns.join("") + "$").test(val)) {
                    break;
                } else {
                    patterns.pop();
                    patterns.pop();
                }
            }
            return patterns;
        };

        var pso = getPatterns(value);

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
        if (currentValue === "" && str === "")
            return { value: value, position: value.length };
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
