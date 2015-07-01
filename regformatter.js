var RegFormatter = (function () {
    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function (searchElement, fromIndex) {
            for (var i = (fromIndex || 0) ; i < this.length; i++)
                if (this[i] === searchElement)
                    return i;
            return -1;
        };
    }

    if (!Array.isArray) {
        Array.isArray = function (arg) {
            return Object.prototype.toString.call(arg) === "[object Array]";
        };
    }

    var joinArray = function (array) {
        var result = "";
        for (var i = 0; i < array.length; i++) {
            result += array[i].value;
        }
        return result;
    }

    function RegFormatter(element, obj) {
        var self = this;
        if (element && element.tagName.toUpperCase() !== "INPUT" && element.tagName.toUpperCase() !== "TEXTAREA")
            throw "Element should be <input />";
        if (!obj.format && !obj.formats)
            throw "Format is not specified";
        this.element = element;
        var formats = obj.formats || [];
        if (obj.format)
            formats.unshift(obj.format);
        this.reset(formats);

        var keydownEventHandler = function (e) {
            if (!self.element)
                return;
            e = e || window.event;
            var code = e.keyCode || e.charCode;
            if (code === 8 || code === 46) {
                if (!self.element.value)
                    return;
                var sel = RegFormatter.getCaretPosition(self.element);
                var positionStart = sel.selectionStart;
                var positionEnd = sel.selectionEnd;
                if (positionStart === positionEnd) {
                    if (code === 8)
                        positionStart--;
                    else
                        positionEnd = positionStart + 1;
                }
                var val = self.write("", self.element.value, positionStart, positionEnd);
                if (val) {
                    self.element.value = val.value;
                    self.oldValue = val.value;
                    RegFormatter.setCaretPosition(self.element, val.position);
                    RegFormatter.preventEvent(e);
                }
            }
        };

        var keypressEventHandler = function (e) {
            if (!self.element)
                return;
            e = e || window.event;
            if (e.ctrlKey || (e.key && e.key.length > 1) || (e.keyCode || e.charCode) === 13)
                return;
            var str = String.fromCharCode(e.keyCode || e.charCode);
            if (!str)
                return;
            var sel = RegFormatter.getCaretPosition(self.element);
            var positionStart = sel.selectionStart;
            var positionEnd = sel.selectionEnd;
            var val = self.write(str, self.element.value, positionStart, positionEnd === positionStart ? null : positionEnd);
            if (val) {
                self.element.value = val.value;
                self.oldValue = val.value;
                RegFormatter.setCaretPosition(self.element, val.position);
            }
            RegFormatter.preventEvent(e);
        };

        var inputEventHandler = function () {
            if (!self.element)
                return;
            var val = self.write(self.element.value, "", 0);
            if (val) {
                self.element.value = val.value;
                self.oldValue = val.value;
                RegFormatter.setCaretPosition(self.element, val.value.length);
            } else
                self.element.value = self.oldValue;
        }

        var pasteEventHandler = function (e) {
            if (!self.element)
                return;
            e = e || window.event;
            var text = e.clipboardData.getData("text/plain");
            if (text) {
                var sel = RegFormatter.getCaretPosition(self.element);
                var positionStart = sel.selectionStart;
                var positionEnd = sel.selectionEnd;
                var val = self.write(text, self.element.value, positionStart, positionEnd === positionStart ? null : positionEnd);
                if (val) {
                    self.element.value = val.value;
                    self.oldValue = val.value;
                    RegFormatter.setCaretPosition(self.element, val.position);
                }
            }
            RegFormatter.preventEvent(e);
        };

        var cutEventHandler = function () {
            if (!self.element)
                return;
            var sel = RegFormatter.getCaretPosition(self.element);
            var positionStart = sel.selectionStart;
            var positionEnd = sel.selectionEnd;
            var val = self.write("", self.element.value, positionStart, positionEnd === positionStart ? null : positionEnd);
            if (val) {
                setTimeout(function () {
                    self.element.value = val.value;
                    self.oldValue = val.value;
                    RegFormatter.setCaretPosition(self.element, val.position - 1);
                }, 10);
            }
        }

        if (element) {
            RegFormatter.addEvent(element, "keydown", keydownEventHandler);
            RegFormatter.addEvent(element, "keypress", keypressEventHandler);
            RegFormatter.addEvent(element, "input", inputEventHandler);
            RegFormatter.addEvent(element, "paste", pasteEventHandler);
            RegFormatter.addEvent(element, "cut", cutEventHandler);
        }

        RegFormatter.prototype.destroy = function () {
            var self = this;
            if (self.element) {
                RegFormatter.removeEvent(self.element, "keydown", keydownEventHandler);
                RegFormatter.removeEvent(self.element, "keypress", keypressEventHandler);
                RegFormatter.removeEvent(self.element, "input", inputEventHandler);
                RegFormatter.removeEvent(self.element, "paste", pasteEventHandler);
                RegFormatter.removeEvent(self.element, "cut", cutEventHandler);
            }
            self.formats = null;
            self.patterns = null;
            self.oldValue = null;
            self.element = null;
            delete self.formats;
            delete self.patterns;
            delete self.oldValue;
            delete self.element;
            delete self;
        }
    }

    RegFormatter.addEvent = function (elem, type, func) {
        if (!elem || !type || !func)
            return;
        if (elem.addEventListener)
            elem.addEventListener(type, func);
        else
            elem.attachEvent("on" + type, func);
    }

    RegFormatter.removeEvent = function (elem, type, func) {
        if (!elem || !type || !func)
            return;
        if (elem.removeEventListener)
            elem.removeEventListener(type, func);
        else
            elem.detachEvent("on" + type, func);
    }

    RegFormatter.preventEvent = function (e) {
        if (!e)
            return;
        if (e.preventDefault)
            e.preventDefault();
        else
            e.returnValue = false;
    }

    RegFormatter.getCaretPosition = function (elem) {
        if (!elem)
            return null;
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

    RegFormatter.setCaretPosition = function (elem, pos) {
        if (!elem || !pos)
            return;
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
            if (format === "*") {
                patternsArr.push([{ value: ".*", isExp: true }]);
                continue;
            }
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
                    continue;
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
                    if (/[^\\]\{(\d+),(\d+)\}$/.test(p.value)) {
                        reg = /\{(\d+),(\d+)\}$/;
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
                    } else if (/(^|[^\\])(\{(\d+),(\d+)\})|\?/.test(p.value))
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
        var self = this;
        var result = "";
        value = value != undefined ? value : (!this.element ? "" : this.element.value);
        if (!value)
            return "";

        var i;
        var ps = null;
        for (i = 0; i < self.patterns.length; i++) {
            if (self.patterns[i].length === 1 && self.patterns[i][0].isExp && self.patterns[i][0].value === ".*")
                return value;
            ps = self.patterns[i].slice(0, value.length);
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
        var subvalue1;
        var subvalue2;
        if (!positionEnd) {
            subvalue1 = this.value(value.substring(0, positionStart));
            subvalue2 = currentValue.substring(subvalue1.length);
            newvalue = subvalue1 + str + subvalue2;
            position = subvalue1.length;
        } else {
            subvalue1 = this.value(value.substring(0, positionStart));
            subvalue2 = this.value(value.substring(0, positionEnd));
            var value3 = currentValue.substring(subvalue2.length);
            newvalue = subvalue1 + str + value3;
            position = subvalue1.length;
        }

        for (var k = 0; k < this.patterns.length; k++) {
            var ps = this.patterns[k];
            var val = newvalue;
            var pos = position;
            if (ps.length === 1 && ps[0].isExp && ps[0].value === ".*")
                return { value: val, position: pos + str.length };
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
                            if (j < pos + str.length + s.length)
                                pos += s.length;
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
                        return { value: val, position: pos + str.length };
                    else
                        break;
                }
            }
        }
        return null;
    };
    return RegFormatter;
})();
