String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

var util = {
    fullid(from, id) {
        if (from != undefined && from.length) {
            if (from != "/") {
                full = from + "/" + id;
            } else {
                full = from + id;
            }
        } else {
          full = "/" + id;
        }
        return full;
    },

    hasClass(element, cls) {
        return (' ' + element.className + ' ').indexOf(' ' + cls + ' ') > -1;
    },

    // Shorten type ids
    shortTypeId(id) {
      if (id.charAt(0) == '/') {
        id = id.slice(1, id.length);
      }
      if (id.slice(0,10) == "corto/vstore") {
        id = id.slice(11, id.length);
      }
      return id;
    },

    // Shorten type ids
    shorterTypeId(id) {
      var lastSlash = id.lastIndexOf("/") + 1;
      return id.slice(lastSlash, id.length);
    },

    toggle(thisElem, id) {
      var elem = document.getElementById('row-' + id);
      var div = elem.childNodes[0].childNodes[0];
      var table = div.childNodes[0];
      if (div.style.height == "0px") {
        elem.hidden = false;
        div.style.height = table.clientHeight + "px";
        thisElem.innerHTML = "keyboard_arrow_down";
      } else {
        window.setTimeout(function() {
            elem.hidden = true;
        }, 300)
        div.style.height = "0px"
        thisElem.innerHTML = "keyboard_arrow_right";
      }
    },

    memberId(parentMember, current) {
      if (parentMember != undefined && parentMember.length) {
        if (current.slice(0, 1) == "[") {
            return parentMember + current;
        } else {
            return parentMember + "." + current;
        }
      } else {
        return current;
      }
    },

    /* Functions to set, save and restore a cursor */
    moveCaret(context, pos) {
        var selection = window.getSelection();
        var range = selection.getRangeAt(0);
        range.setStart(  context, 0 );
        var len = pos;
        var pos = util.getTextNodeAtPosition(context, len);
        selection.removeAllRanges();
        var range = new Range();
        range.setStart(pos.node ,pos.position);
        selection.addRange(range);
    },
    saveCaretPosition(context) {
        var selection = window.getSelection();
        var len = 0;
        if (!selection.anchorNode) {
            context.focus();
            selection = window.getSelection();
            len = context.innerHTML.length;
        }
        var range = selection.getRangeAt(0);
        range.setStart(context, 0 );
        if (!len) {
            len = range.toString().length;
        }
        return function restore(){
            var pos = util.getTextNodeAtPosition(context, len);
            selection.removeAllRanges();
            var range = new Range();
            range.setStart(pos.node ,pos.position);
            selection.addRange(range);
        }
    },
    getTextNodeAtPosition: function(root, index) {
        var lastNode = null;
        var treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT,function next(elem) {
            if(index > elem.textContent.length){
                index -= elem.textContent.length;
                lastNode = elem;
                return NodeFilter.FILTER_REJECT
            }
            return NodeFilter.FILTER_ACCEPT;
        });
        var c = treeWalker.nextNode();
        return {
            node: c? c: root,
            position: c? index:  0
        };
    },

    /* Awesome function for translating URL parameters into a JS object from
     *   http://www.thecodeship.com/web-development/javascript-url-object/
     */
    urlObject: function(options) {
        "use strict";
        /*global window, document*/

        var url_search_arr,
            option_key,
            i,
            urlObj,
            get_param,
            key,
            val,
            url_query,
            url_get_params = {},
            a = document.createElement('a'),
            default_options = {
                'url': window.location.href,
                'unescape': true,
                'convert_num': true
            };

        if (typeof options !== "object") {
            options = default_options;
        } else {
            for (option_key in default_options) {
                if (default_options.hasOwnProperty(option_key)) {
                    if (options[option_key] === undefined) {
                        options[option_key] = default_options[option_key];
                    }
                }
            }
        }

        a.href = options.url;
        url_query = a.search.substring(1);
        url_search_arr = url_query.split('&');

        if (url_search_arr[0].length > 1) {
            for (i = 0; i < url_search_arr.length; i += 1) {
                get_param = url_search_arr[i].split("=");

                if (options.unescape) {
                    key = decodeURI(get_param[0]);
                    val = decodeURI(get_param[1]);
                } else {
                    key = get_param[0];
                    val = get_param[1];
                }

                if (options.convert_num) {
                    if (val.match(/^\d+$/)) {
                        val = parseInt(val, 10);
                    } else if (val.match(/^\d+\.\d+$/)) {
                        val = parseFloat(val);
                    }
                }

                if (url_get_params[key] === undefined) {
                    url_get_params[key] = val;
                } else if (typeof url_get_params[key] === "string") {
                    url_get_params[key] = [url_get_params[key], val];
                } else {
                    url_get_params[key].push(val);
                }

                get_param = [];
            }
        }

        urlObj = {
            protocol: a.protocol,
            hostname: a.hostname,
            host: a.host,
            port: a.port,
            hash: a.hash.substr(1),
            pathname: a.pathname,
            search: a.search,
            parameters: url_get_params
        };

        return urlObj;
    },
}
