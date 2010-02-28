
(function($) {
    $.fn.ucf = function(options) {
        options = $.extend($.fn.ucf.defaults, options);

        $(this).each(function(x) {
            this.options = options;
            load_unicode_data(this);
            build_app(this);
        });

        return this;
    };

    $.fn.ucf.defaults = {
        sample_chars: [ 169, 233, 256, 257, 8364, 8451, 9733, 9731 ]
    }

    function build_app(app) {
        var form = $('<form class="ucf-app"></form>');
        form.submit(function() { return false; });
        $(app).append(form);

        form.append( char_search_field(app, form) );
        form.append( char_input_field(app, form) );
        form.append( char_info_panel(app, form) );

        $(app).find('input.search').focus();
    }

    function char_search_field(app, form) {
        var div = $('<div class="search-wrap"><label>Search character descriptions:</label><br></div>');
        var inp = $('<input type="text" class="search">');
        div.append(inp);

        inp.autocomplete({
            delay: 900,
            minLength: 1,
            source: function(request, response) {
                var target = request.term.toUpperCase();
                if(target != '') {
                    inp.addClass('busy');
                    setTimeout(function() {
                        execute_search(target, app, response, inp);
                    }, 2 );
                }
            },
            open: function(e, ui) {
                inp.removeClass('busy');
            },
            focus: function(e, ui) {
                return false;
            },
            select: function(e, ui) {
                var code = ui.item.value;
                var char_inp = $(app).find('input.char');
                char_inp.val(ui.item.character)
                char_changed(app, char_inp);
                return false;
            }
        })

        return div;
    }

    function char_input_field(app, form) {
        var div = $('<div class="char-wrap">Type/paste a character: </div>');
        var inp = $('<input type="text" class="char">');
        div.append(
            $('<button type="button" class="prev-char" title="Previous character">◂</button>'),
            inp,
            $('<button type="button" class="next-char" title="Next character">▸</button>')
        );

        div.append( sample_chars(app, inp) );

        var cb = function() { char_changed(app, inp) };
        inp.change( cb );
        inp.keypress(function(event) { setTimeout(cb, 50); });
        inp.mouseup(function(event) { setTimeout(cb, 50); });

        div.find('button.prev-char').click(function() {
            increment_code_point(app, inp, -1);
        });
        div.find('button.next-char').click(function() {
            increment_code_point(app, inp, 1);
        });

        return div;
    }

    function sample_chars(app, inp) {
        var chars = app.options.sample_chars;

        var div = $(
            '<div class="char-samples" title="click character to select">'
            + 'Examples … </div>'
        );

        var list = $('<ul></ul>');
        for(i = 0; i < chars.length; i++) {
            var item = $('<li></li>');
            item.text(codepoint_to_string(chars[i]));
            list.append(item);
        }
        div.append(list);

        list.find('li').click(function (event) {
            inp.val($(this).text());
            inp.focus();
            char_changed(app, inp);
        });
        return div;
    }

    function char_info_panel(app, form) {
        var info = $('<div class="char-data"></div>');
        info.hide();
        return info;
    }

    function execute_search(target, app, response, inp) {
        var result = [ ];
        var desc  = app.char_desc;
        var codes = app.code_list;
        var len = codes.length;
        var code, char, character, div;
        for(var i = 0; i < len; i++) {
            if(result.length > 10) { break };
            code = codes[i];
            char = desc[code];
            if(char[0].indexOf(target) >= 0 || char[1].indexOf(target) >= 0) {
                character = codepoint_to_string(hex2dec(code));
                div = $('<div />').text(char[0]);
                if(char[1] && char[1].length > 0) {
                    div.append( $('<span class="code-alias" />').text(char[1]) );
                }
                result.push({
                    'code': code,
                    'character': character,
                    'value': char[0] + ' ' + char[1],
                    'label': '<div class="code-point">U+' + code + '</div>'
                             + '<div class="code-sample">&#160;' + character
                             + '</div><div class="code-descr">' + div.html()
                             + '</div>'
                });
            }
        }
        if(result.length == 0) {
            inp.removeClass('busy');
        }
        response(result);
    }

    function char_changed(app, inp) {
        var txt = inp.val();
        var len = txt.length;
        if(len > 1) {
            if((txt.charCodeAt(len - 2) & 0xF800) == 0xD800) {
                inp.val(txt.substr(txt.length - 2, 1));
            }
            else {
                inp.val(txt.substr(txt.length - 1, 1));
            }
        }
        examine_char(app, inp);
    }

    function examine_char(app, inp) {
        var char = inp.val();
        if(char == app.last_char) {
            return;
        }
        if(char.length == 0) {
            $(app).find('div.char-data').hide();
            return;
        }
        app.last_char = char;
        var code = string_to_codepoint(char);
        var hex  = dec2hex(code, 4);

        var table = $('<table />')
        table.append(
            $('<tr />').append(
                $('<th />').text('Unicode code point'),
                $('<td />').text('U+' + hex)
            )
        );
        var cd = app.char_desc[hex];
        if(cd && cd[0].length > 0) {
            var td = $('<td />').text(cd[0]);
            if(cd[1].length > 0) {
                td.append(
                    $('<br />'),
                    $('<span class="alias"/>').text(cd[1])
                );
            }
            table.append(
                $('<tr />').append( $('<th />').text('Description'), td )
            );
        }
        table.append(
            $('<tr />').append(
                $('<th />').text('HTML entity'),
                $('<td />').text('&#' + code + ';')
            )
        );
        $(app).find('div.char-data').empty().append(table).show();
    }

    function increment_code_point(app, inp, inc) {
        var char = app.last_char
        if(!char) { return; }
        var code = string_to_codepoint(char) + inc;
        var hex  = dec2hex(code, 4);
        while(!app.char_desc[hex]) {
            code = code + inc;
            if(code < 0) { return; }
            hex = dec2hex(code, 4);
        }
        inp.val(codepoint_to_string(code));
        examine_char(app, inp);
    }

    function dec2hex(dec, len) {
        var hex = dec.toString(16).toUpperCase();
        while (hex.length < len) { hex = "0" + hex; }
        return hex;
    }

    function hex2dec(hex) {
        return parseInt(hex, 16);
    }

    function load_unicode_data(app) {
        $.get('./char-data.txt', null, function(data, status) {
            parse_unicode_data(app, data, status);
        }, 'text' );
    }

    function parse_unicode_data(app, data, status) {
        var i = 0;
        var chart = { };
        var codes = [ ];
        var j, str, row, code;
        while(i < data.length) {
            j = data.indexOf("\n", i);
            if(j < 1) { break; }
            row = data.substring(i, j).split("\t");
            code = row.shift();
            chart[code] = row;
            codes.push(code);
            i = j + 1;
        }
        app.char_desc = chart;
        app.code_list = codes;
    }

    function codepoint_to_string(i) {
        if(i < 65536) {
            return String.fromCharCode(i);
        }
        var hi = Math.floor((i - 0x10000) / 0x400) + 0xD800;
        var lo = ((i - 0x10000) % 0x400) + 0xDC00;
        return String.fromCharCode(hi) + String.fromCharCode(lo);
    }

    function string_to_codepoint(str) {
        var hi = str.charCodeAt(0);
        if((hi & 0xF800) != 0xD800) {
            return hi;
        }
        var lo = str.charCodeAt(1);
        return ((hi - 0xD800) * 0x400) + (lo - 0xDC00) + 0x10000;
    }

})(jQuery);
