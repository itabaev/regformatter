﻿var RegFormatter = (function () {
    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function (searchElement, fromIndex) {
            for (var i = (fromIndex || 0) ; i < this.length; i++)
                if (this[i] === searchElement)
                    return i;
            return -1;
        };
    }

    var addEvent = function (elem, type, func) {
        if (elem.addEventListener)
            elem.addEventListener(type, func);
        else
            elem.attachEvent("on" + type, func);
    }

    var preventEvent = function (e) {
        if (e.preventDefault)
            e.preventDefault();
        else
            e.returnValue = false;
    }

    var getCaretPosition = function (elem) {
        if (document.selection) {
            elem.focus();
            var sel = document.selection.createRange();
            var selLen = sel.text.length;
            sel.moveStart("character", -elem.value.length);
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

    function RegFormatter(obj) {
        var _this = this;
        var element = obj.element;
        if (element && element.tagName.toUpperCase() !== "INPUT" && element.tagName.toUpperCase() !== "TEXTAREA")
            throw "Element should be <input />";
        if (!obj.format && !obj.formats)
            throw "Format is not specified";
        this.element = element;
        var formats = obj.formats || [];
        if (obj.format)
            formats.unshift(obj.format);
        this.reset(formats);

        if (element) {
            var keydownEventHandler = function (e) {
                e = e || window.event;
                var code = e.keyCode || e.charCode;
                if (code === 8 || code === 46) {
                    if (!_this.element.value)
                        return;
                    var sel = getCaretPosition(_this.element);
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
                        preventEvent(e);
                    }
                }
            };

            var keypressEventHandler = function (e) {
                e = e || window.event;
                var str = String.fromCharCode(e.keyCode || e.charCode);
                var sel = getCaretPosition(_this.element);
                var positionStart = sel.selectionStart;
                var positionEnd = sel.selectionEnd;
                var val = _this.write(str, _this.element.value, positionStart, positionEnd === positionStart ? null : positionEnd);
                if (val) {
                    _this.element.value = val.value;
                    _this.oldValue = val.value;
                    RegFormatter.setCaretPosition(_this.element, val.position + 1);
                }
                preventEvent(e);
            };

            var inputEventHandler = function () {
                var val = _this.write(_this.element.value, "", 0);
                if (val) {
                    _this.element.value = val.value;
                    _this.oldValue = val.value;
                    RegFormatter.setCaretPosition(_this.element, val.value.length);
                } else
                    _this.element.value = _this.oldValue;
            }

            var pasteEventHandler = function (e) {
                e = e || window.event;
                var text = e.clipboardData.getData("text/plain");
                if (text) {
                    var sel = getCaretPosition(_this.element);
                    var positionStart = sel.selectionStart;
                    var positionEnd = sel.selectionEnd;
                    var val = _this.write(text, _this.element.value, positionStart, positionEnd === positionStart ? null : positionEnd);
                    if (val) {
                        _this.element.value = val.value;
                        _this.oldValue = val.value;
                        RegFormatter.setCaretPosition(_this.element, val.position + 1);
                    }
                }
                preventEvent(e);
            };

            var cutEventHandler = function () {
                var sel = getCaretPosition(_this.element);
                var positionStart = sel.selectionStart;
                var positionEnd = sel.selectionEnd;
                var val = _this.write("", _this.element.value, positionStart, positionEnd === positionStart ? null : positionEnd);
                if (val) {
                    setTimeout(function () {
                        _this.element.value = val.value;
                        _this.oldValue = val.value;
                        RegFormatter.setCaretPosition(_this.element, val.position);
                    }, 10);
                }
            }

            addEvent(element, "keydown", keydownEventHandler);
            addEvent(element, "keypress", keypressEventHandler);
            addEvent(element, "input", inputEventHandler);
            addEvent(element, "paste", pasteEventHandler);
            addEvent(element, "cut", cutEventHandler);
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
            range.moveEnd("character", pos);
            range.moveStart("character", pos);
            range.select();
        }
    }

    var joinArray = function (array) {
        var result = "";
        for (var i = 0; i < array.length; i++) {
            result += array[i].value;
        }
        return result;
    }

    RegFormatter.prototype.reset = function (format) {
        var formats = [];
        if (typeof format === "string")
            formats.push(format);
        else if (Array.isArray(format))
            formats = format.concat();
        else
            throw "Invalid argument 'format'";

        var expSymbols = [".", "[", "]", "(", ")", "+", "-", "*", "?", "{", "}", "|", "/", "^", "$"];
        var expBegBrackets = ["%", "[", "(", "{"];
        var expEndBrackets = ["%", "]", ")", "}"];
        var expEscapeds = ["+", "*", "|", "^", "$"];
        var expCounters = ["{", "?"];

        var patternsArr = [];
        var patterns = [];
        var p = "";
        var exp = false;
        var backslash = false;
        var brackets = [];
        var testpattern = "";
        var i;

        var addPattern = function (isExp) {
            if (p === "" || (isExp && (brackets.length > 1 || (i + 1 < format.length && expCounters.indexOf(format.charAt(i + 1)) >= 0))))
                return;
            patterns.push({ value: p, isExp: isExp });
            testpattern += p;
            p = "";
        };

        var push = function (ps, ind, con) {
            var pp;
            for (pp = ind; pp >= 0; pp--) {
                var pat = ps[pp];
                if (pat.isExp && Array.isArray(pat.value)) {
                    for (var ppp = 0; ppp < pat.value.length; ppp++) {
                        var patt;
                        if (Array.isArray(pat.value[ppp]))
                            patt = pat.value[ppp];
                        else patt = [pat.value[ppp]];
                        for (var l = 0; l < patt.length; l++) {
                            if (patt[l].value === "") {
                                patt.splice(l, 1);
                                l--;
                            }
                        }
                        push(ps, pp - 1, patt.concat(con));
                    }
                    break;
                } else {
                    con.unshift(pat);
                }
            }
            if (pp <= 0) {
                var exists = false;
                for (var m = 0; m < patternsArr.length; m++) {
                    if (patternsArr[m].length === con.length) {
                        var eq = true;
                        for (var o = 0; o < patternsArr[m].length; o++) {
                            var p1 = patternsArr[m][o];
                            var p2 = con[o];
                            if (!(p1.isExp === p2.isExp && p1.value.length === p2.value.length && p1.value === p2.value)) {
                                eq = false;
                            }
                        }
                        if (eq) {
                            exists = true;
                            break;
                        }
                    }
                }
                if (!exists)
                    patternsArr.push(con);
            }
        }

        for (var k = 0; k < formats.length; k++) {
            format = formats[k];
            patterns = [];
            p = "";
            exp = false;
            backslash = false;
            brackets = [];
            testpattern = "";

            for (i = 0; i < format.length; i++) {
                var charAt = format.charAt(i);

                if (backslash) {
                    p += charAt;
                    backslash = false;
                    addPattern(exp);
                    continue;
                }
                if (charAt === "\\") {
                    p += charAt;
                    backslash = true;
                    continue;
                }

                if (charAt === "%") {
                    if (!exp) {
                        brackets.push(charAt);
                        addPattern(exp);
                        exp = true;
                        continue;
                    } else {
                        if (brackets.length && brackets[brackets.length - 1] === "%") {
                            brackets.pop();
                            addPattern(exp);
                            exp = false;
                            continue;
                        } else
                            throw "Invalid pattern '" + format + "' at position " + i + " '" + charAt + "'";
                    }
                }

                if (!exp) {
                    if (expSymbols.indexOf(charAt) >= 0)
                        p += "\\" + charAt;
                    else
                        p += charAt;
                    addPattern(exp);
                    continue;
                }

                if (expBegBrackets.indexOf(charAt) >= 0) {
                    brackets.push(charAt);
                    p += charAt;
                    addPattern(exp);
                    continue;
                }

                if (expEndBrackets.indexOf(charAt) >= 0) {
                    if (brackets.length && brackets[brackets.length - 1] === expBegBrackets[expEndBrackets.indexOf(charAt)]) {
                        brackets.pop();
                        p += charAt;
                        addPattern(exp);
                        continue;
                    } else
                        throw "Invalid pattern '" + format + "' at position " + i + " '" + charAt + "'";
                }

                if (expEscapeds.indexOf(charAt) >= 0) {
                    p += "\\" + charAt;
                    addPattern(exp);
                }

                p += charAt;
                addPattern(exp);
            }

            if (brackets.length)
                throw "Invalid pattern '" + format + "' at position " + (format.length - 1) + " '" + format[format.length - 1] + "'";
            var testRegex = new RegExp(testpattern);
            testRegex = null;

            var reg;
            var exec;
            var n;
            for (i = 0; i < patterns.length; i++) {
                p = patterns[i];
                if (p.isExp) {
                    reg = /\{(\d)\}$/;
                    exec = reg.exec(p.value);
                    if (exec) {
                        n = parseInt(exec[1]);
                        p.value = p.value.replace(reg, "");
                        patterns.splice(i, 1);
                        for (var j = 0; j < n; j++) {
                            patterns.splice(i, 0, p);
                        }
                        i += n - 1;
                    } else if (/(^|[^\\])\{(\d)\}/.test(p.value))
                        throw "Invalid pattern '" + format + "' in '" + p.value + "'";
                }
            }

            for (i = 0; i < patterns.length; i++) {
                p = patterns[i];
                if (p.isExp) {
                    if (/[^\\]\{(\d),(\d)\}$/.test(p.value)) {
                        reg = /\{(\d),(\d)\}$/;
                        exec = reg.exec(p.value);
                        var n1 = parseInt(exec[1]);
                        var n2 = parseInt(exec[2]);
                        if (!n1 || !n2 || n1 < 1 || n1 > n2)
                            throw "Invalid pattern '" + format + "' in '" + p.value + "'";
                        p.value = p.value.replace(reg, "");
                        if (!p.value)
                            throw "Invalid pattern '" + format + "' in '" + p.value + "'";

                        var branches = [];
                        var a = [];
                        for (n = 0; n < n1 - 1; n++)
                            a.push(p);
                        for (n = n1; n <= n2; n++) {
                            a.push(p);
                            branches.push(a.concat());
                        }
                        patterns.splice(i, 1, { value: branches, isExp: p.isExp });
                    } else if (/[^\\]\?$/.test(p.value)) {
                        p.value = p.value.replace(/\?$/, "");
                        patterns.splice(i, 1, { value: [{ value: "", isExp: p.isExp }, p], isExp: p.isExp });
                    } else if (/(^|[^\\])(\{(\d),(\d)\})|\?/.test(p.value))
                        throw "Invalid pattern '" + format + "' in '" + p.value + "'";
                }
            }

            push(patterns, patterns.length - 1, []);
        }

        this.formats = formats;
        this.patterns = patternsArr;

        if (this.element) {
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

    RegFormatter.prototype.value = function (value) {
        var _this = this;
        var result = "";
        value = value != undefined ? value : (!this.element ? "" : this.element.value);

        var i;
        var ps = null;
        for (i = 0; i < _this.patterns.length; i++) {
            ps = _this.patterns[i].slice(0, value.length);
            if (new RegExp("^" + joinArray(ps) + "$").test(value))
                break;
            else
                ps = null;
        }

        if (!ps)
            return null;

        for (i = 0; i < ps.length; i++) {
            if (ps[i].isExp) {
                var match = value.match(new RegExp("^" + joinArray(ps.slice(0, i + 1))));
                result += match[0].replace(new RegExp("^" + joinArray(ps.slice(0, i))), "");
            }
        }

        return result;
    };

    RegFormatter.prototype.write = function (str, value, positionStart, positionEnd) {
        var currentValue = this.value(value);
        if (currentValue === "" && str === "")
            return { value: "", position: 0 };
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

        for (var k = 0; k < this.patterns.length; k++) {
            var ps = this.patterns[k];
            var val = newvalue;
            var pos = position;
            var j = 1;
            for (var i = 0; i < ps.length; i++) {
                var p = ps.slice(0, i + 1);
                var reg = null;
                while (j <= val.length) {
                    var subvalue = val.substring(0, j);
                    reg = new RegExp("^" + joinArray(p) + "$").exec(subvalue);
                    if (!reg) {
                        if (!ps[i].isExp) {
                            var s = ps[i].value.replace(/^\\/, "");
                            val = val.substring(0, j - 1) + s + val.substring(j - 1);
                            if (j < pos + str.length + 1)
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
                    if (reg)
                        return { value: val, position: pos + (str.length > 0 ? str.length - 1 : 0) };
                    else
                        break;
                }
            }
        }
        return null;
    };
    return RegFormatter;
})();
//# sourceMappingURL=regformatter.js.map
