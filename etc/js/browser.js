
var table_db = [];

Vue.component("object-index-headers", {
  props: ['scroll', 'scrollHeight', 'scrollAbsolute'],

  render: function (createElement) {


    return createElement(
      'div',
      {
        attrs: {
          dataScroll: this.scroll,
          class: "object-index-headers"
        },
      },
      headerElems
    );
  }
});

Vue.component('object-index', {
  props: ['scroll', 'scrollAbsolute', 'scrollHeight', 'scrollView', 'show', 'rightOffset'],

  render: function(createElement) {
    var children = [];

    // Create cursor
    var cursorHeight = (this.scrollView / this.scrollHeight);
    var cursorTop = (this.scrollAbsolute / this.scrollHeight);

    /*children.push(createElement(
      'div',
      {
        attrs: {
          class: "object-index-cursor",
          style:
            "top: " + (cursorTop * 100) + "%; height: " + (cursorHeight * 100) + "%;"
        }
      }
    ));*/

    // Create headers
    var browserContent = document.getElementById("browser-content");
    var docHeaders = document.getElementsByClassName("type-header");
    var headerElems = [];

    if (browserContent) {
      var browserRect = browserContent.getBoundingClientRect();

      for (var i = 0; i < docHeaders.length; i ++) {
        var docHeader = docHeaders[i];
        var absoluteTop = docHeader.getBoundingClientRect().top - browserRect.top + this.scrollAbsolute;
        var top = absoluteTop / this.scrollHeight;

        var headerElem = createElement(
          'div',
          {
            attrs: {
              class: "object-index-header",
              style: "top: " + (top * 100) + "%;"
            }
          },
          docHeader.textContent
        );
        children.push(headerElem);
      }
    }

    var show = this.show ? " object-index-show" : "";

    // Create root element
    return createElement(
      'div',
      {
        attrs: {class: "object-index" + show, style: "right: " + (this.rightOffset + 5) + "px"}
      },
      children
    );
  }
});

var queryStore = {
  state: {
    valid: true
  },
  setValid (newValue) {
    this.state.valid = newValue;
  }
}

Vue.component('query-input', {
  props: ['connected'],
  methods: {
    highlightQuery(input, qObj) {
      var q = "";
      if (qObj.select) {
        q += "select " + qObj.select;
      }
      if (qObj.from) {
        q += " from " +  qObj.from;
      }
      if (qObj.type) {
        q += " type " +  qObj.type;
      }

      var parsedInput = input.replaceAll('&nbsp;', ' ')
      var remainder = parsedInput.substr(q.length, parsedInput.length - q.length);
      remainder = remainder.replaceAll(' ', '&nbsp;');

      output = "";
      if (qObj.select) {
        output += "<span class='kw'>select</span> " + qObj.select;
      }
      if (qObj.from) {
        output += " <span class='kw'>from</span> " + qObj.from;
      }
      if (qObj.type) {
        output += " <span class='kw'>type</span> " + qObj.type;
      }

      if (remainder.length) {
        output += "<span class='query-input-remainder'>" + remainder + "</span>";
        this.remainder = true;
      } else {
        this.remainder = false;
      }

      return output;
    },
    applyHighlight(elem, queryText, queryObj) {
      var restore = util.saveCaretPosition(elem);
      elem.innerHTML = this.highlightQuery(queryText, queryObj);
      restore();
    },
    getQueryFromElem(elem) {
      return elem.innerHTML
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g,' ')
        .trim();
    },
    search(query) {
      var queryObj;
      if (query != undefined) {
        this.query = query.replaceAll('&nbsp;', ' ');
        queryObj = corto.parseQuery(this.query);
      } else {
        queryObj = corto.parseQuery(this.query);
        query = this.query;
      }

      this.activeQuery = this.query;
      if (!queryStore.state.valid) {
        this.$emit('invalidQuery', {});
      } else {
        this.$emit('search', {parent: queryObj.from, expr: queryObj.select, type: queryObj.type});
      }
      this.applyHighlight(this.$refs.queryInput, query, queryObj);
      util.moveCaret(this.$refs.queryInput, query.length);
    },
    onKeyup($event) {
      if ($event.key == "Enter") {
        if (this.remainder) {
          queryStore.setValid(false);
        } else {
          queryStore.setValid(true);
        }
        this.search();
        this.changed = false;
        this.$forceUpdate();
      }
    },
    onInput($event) {
      var query = this.getQueryFromElem($event.target);
      this.query = query.replaceAll('&nbsp;', ' ');
      this.applyHighlight($event.target, query, corto.parseQuery(this.query));
      this.changed = true;
    }
  },
  data: function() {
    return {
      query: "select * from data",
      changed: false,
      activeQuery: "",
      remainder: false,
      store: queryStore
    }
  },
  render: function (createElement) {
    var codeClass = "hljs query-input";
    if (this.changed || !queryStore.state.valid || !this.connected) {
      codeClass += " query-input-dirty";
    }
    return createElement(
      'div', {
        attrs: {class: "query"}
      },
      [
        createElement(
          'code',
          {
            attrs: {
              id: "code",
              class: codeClass,
              contenteditable: "true",
              spellcheck: "false"
            },
            on: {
              input: this.onInput,
              keyup: this.onKeyup
            },
            ref: 'queryInput'
          },
          this.query
        ) /* code element */
      ] /* div children */
    ); /* div */
  }
});

Vue.component('search-toolbar', {
  props: ['connected', 'url'],
  methods: {
    connect() {
      this.$emit('login');
    },
    setQuery(parent, expr, type) {
      var q = corto.parseQuery(this.$refs.queryInput.query);

      if (q.from && parent && parent.charAt(0) != "/") {
        if (q.from != "/") {
          parent = q.from + "/" + parent;
        } else {
          parent = q.from + parent;
        }
      }

      if (!parent) {
        parent = q.from;
        if (!parent) {
          parent = "/";
        }
      }

      if (!expr) {
        expr = q.select;
      }

      this.query = "select " + expr;
      if (parent && parent != "/") {
        this.query += " from " + parent;
      }
      if (type && type != "*") {
        this.query += " type " + type;
      }

      this.$refs.queryInput.search(this.query);
    },
    setQueryFromUrl() {
      if (window.location.protocol != "file:") {
        var url = util.urlObject({"url": window.location.href});
        var q;
        if (url.parameters.select) {
          q = "select " + url.parameters.select;
        } else {
          q = "select *";
        }
        if (url.parameters.from && url.parameters.from != "/") {
          q += " from " + url.parameters.from;
        }
        if (url.parameters.type && url.parameters.type != "*") {
          q += " type " + url.parameters.type;
        }
        this.query = q;
      }
      this.$refs.queryInput.search(this.query);
    },
    getQuery() {
      return corto.parseQuery(this.$refs.queryInput.query);
    },
    getQueryString() {
      return this.$refs.queryInput.activeQuery;
    },
    parentFromPath: function(path) {
        var result = "/";
        if (path) {
          var split = path.lastIndexOf("/");
          if (split != -1) {
            result = path.slice(0, split);
            if (result == "") result = "/";
          }
        }
        return result;
    },
    back() {
      window.history.back();
    },
    up() {
      var q = corto.parseQuery(this.$refs.queryInput.query);
      var parent = q.from, expr = q.expr;

      if (!q.type && (q.select == "*" || q.select == "/" || q.select == "/*")) {
        parent = this.parentFromPath(q.from);
        expr = "*";
      } else {
        expr = "*";
      }
      this.query = "select " + expr;
      if (parent && parent != "/") {
        this.query += " from " + parent;
      }

      /* If pressing up, type filter is cleared */

      this.$refs.queryInput.search(this.query);
    },
    home() {
      this.query = "select * from data";
      this.$refs.queryInput.search(this.query);
    }
  },
  template: `
    <div>
      <div class="drag"></div>
      <md-toolbar class="searchToolbar" :disabled="!connected">
        <div class="toolbar-top">
          <span class="toolbar-address">{{url}}</span>
          <span v-on:click="connect()" class="toolbar-button">
            <md-icon v-if="connected" class="connection-ok">cloud_queue</md-icon>
            <md-icon v-if="!connected" class="connection-problem">cloud_off</md-icon>
          </span>
        </div>
        <div class="md-input-container md-input-placeholder" style="visibility: collapse">
          <md-button ref="backButton" class="md-icon-button nav-button" :disabled="!connected" @click.native="back" style="visibility: visible">
            <md-icon>arrow_back</md-icon>
          </md-button>
          <md-button ref="upButton" class="md-icon-button nav-button" :disabled="!connected" @click.native="up" style="visibility: visible">
            <md-icon>arrow_upward</md-icon>
          </md-button>
          <md-button ref="homeButton" class="md-icon-button nav-button" :disabled="!connected" @click.native="home" style="visibility: visible">
            <md-icon>explore</md-icon>
          </md-button>
          <md-whiteframe md-elevation="1" :class="'search search-parent' + (connected ? '' : ' search-disconnected') + (queryStore.state.valid ? '' : ' search-invalid')" :disabled="!connected" style="visibility: visible">
            <query-input ref="queryInput" :connected="connected" v-on:search="$emit('search', $event)" v-on:invalidQuery="$emit('invalidQuery', $event)"/>
          </md-whiteframe>
        </div>
      </md-toolbar>
    </div>
    `
});

var editorStore = {
  state: {
    types: [],
    width: 450,
    enabled: false,
    id: "",
  },
  setObject (newValue) {
    this.state.object = newValue;
  },
  setWidth(newValue) {
    this.state.width = newValue;
  },
  setEnabled(newValue) {
    this.state.enabled = newValue;
  },
  setId(newValue) {
    this.state.id = newValue;
  }
}

Vue.component('object-value', {
  props: ['value', 'header', 'connected', 'editor', 'isBase'],
  data: function() {
    return {
      currentValue: this.$props.value,
      lastValue: "",
      changed: false,
      updateCount: 0
    }
  },
  updated: function() {
    if (this.updateCount == 1 && this.header.type.kind == "bitmask") {
      this.clear();
    }
    this.updateCount ++;
  },
  methods: {
    navigate(link, absolutePath) {
      if (this.connected) {
        this.$emit('navigate', {link: link, absolutePath: absolutePath});
      }
    },
    truncate(value, kind) {
      var json = JSON.stringify(value, undefined, " ");
      if (kind == "struct" || kind == "list") {
        if (json.length > 40) {
          json = json.slice(0, 40) + "...";
        }
        return json;
      } else if (kind == "range") {
        value = value[0];
      }
      this.lastValue = value;
      return value;
    },
    edit(event) {
      if (event) {
        this.currentValue = event.target.innerHTML;
      }
      this.$emit('edit', {value: this.currentValue, type: this.header.type.kind});
    },
    changeSelect(event) {
      /* The delay in sending the event is necessary because the md-select does
       * not provide an event that does *not* trigger when the component is
       * loaded, and when events are emitted by md-option, the value always lag
       * change behind. The delay gives md-select the time to process the event
       * and set the correct value in 'currentValue' */
      window.setTimeout(function() {
        this.edit();
      }.bind(this), 200);
      this.changed = true;
    },
    change(event) {
      if (this.editor && this.header.type.isPrimitive()) {
        if (!this.changed) {
          this.edit(event);
        }
        this.changed = true;
      }
    },
    clear() {
      this.changed = false;
      this.$emit('clear');
    }
  },
  template: `
    <div v-if="header.type.kind == 'list'">
      <span v-if="!editor"
        :class="'table-cell table-' + header.type.kind + ' table-ref-false'"
        :contenteditable="editor">
        [&nbsp;{{value[0]}}&nbsp;elements&nbsp;]
      </span>
      <span v-else
        :class="'table-cell table-' + header.type.kind + ' table-ref-false'">
        {{truncate(value, header.type.kind)}}
      </span>
    </div>
    <div v-else-if="header.type.reference && !isBase"
      @click="navigate(corto.getMember(value, header.index), true)">
      <span
        :class="'table-cell table-' + header.type.kind + ' ' + 'table-ref-true-' + connected"
        :contenteditable="editor">
        {{value}}
      </span>
    </div>
    <div v-else-if="header.type.kind == 'boolean' && editor">
      <md-input-container class="shrink-md-container">
        <md-switch id="object-value-select" name="object-value-select" class="md-secondary editor-switch" v-model="currentValue" v-on:change="changeSelect">
        </md-switch>
      </md-input-container>
    </div>
    <div v-else-if="header.type.kind == 'enum' && editor">
      <md-input-container class="shrink-md-container">
        <md-select id="object-value-select" name="object-value-select" v-model="currentValue">
          <md-option v-for="c in header.type.constants" :value="c" v-on:selected="changeSelect">{{c}}</md-option>
        </md-select>
      </md-input-container>
    </div>
    <div v-else-if="header.type.kind == 'bitmask' && editor">
      <md-input-container class="shrink-md-container">
        <md-select id="object-value-select" multiple v-model="currentValue">
          <md-option v-for="c in header.type.constants" :value="c" v-on:selected="changeSelect">{{c}}</md-option>
        </md-select>
      </md-input-container>
    </div>
    <div v-else @click="change" @keyup="edit" class="table-value-container">
      <span
        :class="'table-cell ' + 'table-' + header.type.kind + ' table-ref-false table-editor-' + editor"
        :contenteditable="editor && header.type.isPrimitive()">
        <template v-if="!changed">{{truncate(value, header.type.kind)}}</template>
        <template v-else>{{lastValue}}</template>
      </span>
      <span v-if="header.unit" :class="'table-cell table-unit' + ' table-' + header.type.kind">
        {{header.unit[2]}}
      </span>
    </div>
  `
});

Vue.component('object-range-indicator', {
  props: ['header', 'value', 'offset'],
  methods: {
    range_color(value) {
        var last_value = value[0];
        var lo = value[1];
        var hi = value[2];
        var _class = "ok";

        if (last_value < lo[1]) {
            _class = "lo-high";
        } else if (last_value < lo[0]) {
            _class = "lo-medium";
        } else if (last_value > hi[1]) {
            _class = "hi-high";
        } else if (last_value > hi[0]) {
            _class = "hi-medium";
        }

        return _class;
    }
  },
  template: `
      <div v-if="header.type.kind == 'range'" :class="'range range-' + range_color(value)" :style="'top: ' + offset">
      </div>
  `
});

Vue.component('object-row-template', {
  props: ['row', 'value', 'connected', 'parentMember'],
  data: function() {
    return {
      changed: false
    }
  },
  methods: {
    edit($event) {
      this.changed = true;
      this.$emit('edit', {memberId: util.memberId(this.parentMember, this.row.rowName), src: $event, component: this})
    },
    clearSelf() {
      this.changed = false;
    },
    clear() {
      this.clearSelf();
      this.$refs.objectValue.clear();
    },
    rowClass() {
        var result = '';
        if (this.row.m_readonly || this.row.m_const) {
            result = 'table-value-readonly';
        } else if (this.changed) {
            result = 'table-value-changed';
        }
        return result;
    },
    headerClass() {
        var result = '';
        if (this.row.m_readonly || this.row.m_const) {
            result = 'table-header-readonly';
        }
        return result;
    }
  },
  template: `
    <tr :id="util.memberId(parentMember, row.rowName)" :class="this.rowClass()">
      <td class="table-header table-header-editor">
        <md-icon
          v-if="!row.type.isPrimitive() && !row.type.reference"
          @click.native="util.toggle(event.target, util.memberId(parentMember, row.rowName))"
          class="editor-toggle-button">
          keyboard_arrow_right
        </md-icon>
        <span :class="headerClass()">{{row.rowName}}</span>
      </td>
      <td class="editor-value">
        <object-range-indicator :value="corto.getMember(value, row.index)" :header="row" :offset="-10">
        </object-range-indicator>
        <object-value
          ref="objectValue"
          :value="corto.getMember(value, row.index)"
          :header="row"
          :connected="connected"
          :editor="!(row.m_readonly || row.m_const)"
          :isBase="row.rowName == 'super'"
          v-on:navigate="$emit('navigate', $event)"
          v-on:edit="edit($event)"
          v-on:clear="clearSelf">
        </object-value>
      </td>
    </tr>`
});

Vue.component('object-row-detail-template', {
  props: ['row', 'value', 'connected', 'parentMember'],
  template: `
    <tr :id="'row-' + util.memberId(parentMember, row.rowName)" hidden="true">
      <td colspan="2" class="editor-nested-table">
        <div style="height: 0px">
          <table>
            <object-rows
              :value="value"
              :row="row"
              :connected="connected"
              :parentMember="util.memberId(parentMember, row.rowName)"
              v-on:navigate="$emit('navigate', $event)"
              v-on:edit="$emit('edit', $event)">
            </object-rows>
          </table>
        </div>
      </td>
    </tr>
  `
});

/* Row for each object member */
Vue.component('object-rows', {
  functional: true,
  props: ['row', 'value', 'connected', 'parentMember'],
  render (h, ctx, children) {
    var props = ctx.props;
    var result = [], tr = [];
    var onEdit = ctx.data.on['edit'] || noop;
    var isCollection = props.row.type.isCollection();
    var length, value, row;

    if (isCollection) {
      row = props.row;
      value = corto.getMember(props.value, row.index);
      length = value.length;
    } else {
      length = props.row.rows.length;
      value = props.value;
    }

    for (var i = 0; i < length; i ++) {
      if (isCollection) {
        result.push(
          h('object-row-template', {
            props: {
              row: {rows: row.rows, index: [], type: row.type.elementType, rowName: '[' + i + ']', typeName: "N/A"},
              value: value[i],
              connected: props.connected,
              parentMember: props.parentMember
            },
            on: {
              edit: (event) => {
                onEdit(event);
              }
            }
          })
        );

        if (!row.type.elementType.isPrimitive() && !row.type.elementType.reference) {
          result.push(
            h('object-row-detail-template', {
              props: {
                row: {rows: row.rows, index: [], type: row.type.elementType, rowName: '[' + i + ']', typeName: "N/A"},
                value: value[i],
                connected: props.connected,
                parentMember: props.parentMember
              },
              on: {
                edit: (event) => {
                  onEdit(event);
                }
              }
            })
          );
        }

      } else if (props.row.rows[i].rowName != "super") {
        row = props.row.rows[i];

        result.push(
          h('object-row-template', {
            props: {
              row: row,
              value: props.value,
              connected: props.connected,
              parentMember: props.parentMember
            },
            on: {
              edit: (event) => {
                onEdit(event);
              }
            }
          })
        );

        if (!row.type.isPrimitive() && !row.type.reference) {
          result.push(
            h('object-row-detail-template', {
              props: {
                row: row,
                value: props.value,
                connected: props.connected,
                parentMember: props.parentMember
              },
              on: {
                edit: (event) => {
                  onEdit(event);
                }
              }
            })
          );
        }
      }
    }

    return result;
  }
});

/* Top level object element */
Vue.component('object-base', {
  functional: true,
  props: ['value', 'type', 'connected'],
  render (h, ctx, children) {
    var result = [];
    var props = ctx.props;
    var onEdit = ctx.data.on['edit'] || noop;

    /* Recursively find 'super' members & add tables for different levels in
     * inheritance hierarchy */
    var func = function(func, value, row, result, parentMember) {
      var hasSuper = false;

      if (row.rows[0].rowName == "super") {
        hasSuper = true;
        func(func, value, row.rows[0], result, util.memberId(parentMember, "super"));
      }

      var body = h('object-rows', {
        props: {
          row: row,
          value: value,
          connected: props.connected,
          parentMember: parentMember
        },
        on: {
          edit: (event) => {
            onEdit(event);
          }
        }
      });
      if (parentMember || hasSuper) {
        result.push(h('h3', null, "from: " + util.shortTypeId(row.typeName)));
      }
      result.push(h('table', null, body));
    };

    func(
      func,
      props.value,
      {rows: props.type.rows, typeName: props.type.id, type: corto.metadata[props.type.id]},
      result,
      undefined
    );

    return result;
  }
});

Vue.component('object-editor', {
  props: ['editor', 'connected'],
  data: function() {
    return {
      value: {},
      valueComponents: [],
      hide: true
    };
  },
  methods: {
    reset() {
      // Remove object-active class from other rows
      var rows = document.getElementsByClassName("object-active");
      for(var i = 0; i < rows.length; i++)
      {
        rows[i].childNodes[0].childNodes[0].childNodes[0].innerHTML = "zoom_in";
        rows[i].className =
          rows[i].className.replace
              ( /(?:^|\s)object-active(?!\S)/g , '' );
      }
      this.value = {};
      this.valueComponents = [];
    },
    open() {
      editorStore.setEnabled(true);
      window.setTimeout(function(){
        this.hide = false;
      }.bind(this), 50)
    },
    close() {
      editorStore.setEnabled(false);
      window.setTimeout(function() {
        this.reset();
        corto.unsubscribe({id:"editor"});
        this.hide = true;
      }.bind(this), 200);
    },
    cast(value, type) {
      var result = undefined;
      if (type == "int" || type == "uint" || type == "float" || type == "binary") {
        result = Number(value);
      } else
      if (type == "text" || type == "enum" || type == "bitmask") {
        result = String(value);
      } else {
        result = value;
      }
      return result;
    },
    edit(event) {
      this.value[event.memberId] = this.cast(event.src.value, event.src.type);
      this.valueComponents.push(event.component);
    },
    update() {
      this.$emit('update', {id: editorStore.state.id, value: this.value});
      for (var i = 0; i < this.valueComponents.length; i ++) {
        this.valueComponents[i].clear();
      }
    },
    del() {
      this.$emit('del', {id: editorStore.state.id, value: this.value});
    }
  },
  template: `
    <div
      class="object-editor"
      v-if="!hide"
      :style="'opacity: 1.0; width: ' + editor.width + 'px; left: calc(100wh - ' + editor.enabled * editor.width + ');'">
      <div class="object-editor-close"><md-icon @click.native="close">close</md-icon></div>
      <div class="editor-table" v-for="type in editor.types" v-if="type.objects.length">
        <div v-for="object in type.objects">
          {{util.shortTypeId(type.id)}}
          <h2 class="object-editor-id">{{object.id}}</h2>
          <div class="object-editor-scroll">
            <object-base
              :value="object.value"
              :type="type"
              :connected="connected"
              v-on:edit="edit">
            </object-rows>
          </div>
          <div v-if="!object.readonly" class="editor-actions">
            <md-button class="md-primary" @click.native="update">Update</md-button>
             <md-button class="md-primary delete" @click.native="del">Delete</md-button>
          </div>
          <div v-else class="editor-actions">
            This object is read-only
          </div>
        </div>
      </div>
    </div>
  `
});

Vue.component('object-table', {
  props: ['type', 'connected'],
  data: function() {
    return {
      editor: editorStore.state
    }
  },
  methods: {
    navigate(link, absolutePath) {
      if (this.connected) {
        this.$emit('navigate', {link: link, absolutePath: absolutePath});
      }
    },
    edit(link, absolutePath, event) {
      if (event.target.innerHTML == "close") {
        this.$emit('unedit');
      } else if (event.target.innerHTML == "zoom_in") {
        // Add object-active to current row
        this.$emit('edit', {link: link, absolutePath: absolutePath});
        event.target.innerHTML = "close";
        event.target.parentElement.parentElement.parentElement.className += " object-active";
      }
    }
  },
  template: `
    <div class="object-table" style="overflow-x: auto">
      <table>
        <thead>
          <th class="object-link"><span class="table-header"></span></th>
          <th><span class="table-header">Id</span></th>
          <th v-for="header in type.headers" :key="header.name">
            <span class="table-header">{{header.name}}</span>
          </th>
        </thead>
        <tbody>
          <tr v-for="object in type.objects" :key="object.id">
            <td class="object-link" @click="edit(object.id, false, event)">
              <span class="table-cell">
                <md-icon>zoom_in</md-icon>
              </span>
            </td>
            <td @click.stop="navigate(object.id, false)">
              <span :class="'table-cell table-ref-true-' + connected">
                {{object.id}}
              </span>
            </td>
            <td v-for="header in type.headers" v-if="header.index" :key="header">
                <object-range-indicator :value="object.getMember(header.index)" :header="header" :offset="-15">
                </object-range-indicator>
                <object-value
                  :value="object.getMember(header.index)"
                  :header="header"
                  :connected="connected"
                  :editor="false"
                  :isBase="header.name == 'super'"
                  v-on:navigate="$emit('navigate', {link: $event.link, absolutePath: $event.absolutePath})">
                </object-value>
            </td>
          </tr>
        </tbody>
      </table>
    </div>`
});

Vue.component('plugin', {
  props: ['db', 'connected', 'url'],
  methods: {
    reset() {
      this.$refs.searchToolbar.setQueryFromUrl();
    },

    // Subscribe to a new query
    subscribe(parent, expr, type) {
      corto.unsubscribe({id:"table"});
      corto.subscribe({
        id: "table",
        parent: parent,
        expr: expr,
        type: type,
        db: this.$props.db,
        instance: this,
        summary: true,
        onError: function(error) {
          this.throw(error, 5000);
        }.bind(this)
      });
    },

    // User entered a query
    search($event) {
      this.validQuery = true;
      this.$refs.editor.close();
      this.subscribe($event.parent, $event.expr, $event.type);
      this.$emit('search', {parent: $event.parent, expr: $event.expr, type: $event.type});
    },

    invalidQuery() {
      this.validQuery = false;
    },

    // User clicked on an object link
    navigate(obj, absolute) {
      this.$refs.editor.close();

      if (absolute) {
        parent = "";
        if (obj.charAt(0) != '/') {
          parent += "/corto/lang"
        }

        split = obj.lastIndexOf("/");
        if (split != -1) {
          parent += obj.slice(0, split);
          expr = obj.slice(split + 1, obj.length);
        } else {
          expr = obj;
        }
        this.$refs.searchToolbar.setQuery(parent, expr, undefined);
      } else if (absolute != undefined) {
        this.$refs.searchToolbar.setQuery(obj, "*", undefined);
      } else {
        this.$refs.searchToolbar.setQuery(undefined, obj, undefined);
      }
    },

    // User applies type filter
    filterType(typeId) {
      this.$refs.searchToolbar.setQuery(undefined, undefined, typeId);
    },

    edit(obj, absolute) {
      var q = this.$refs.searchToolbar.getQuery();
      this.$refs.editor.reset();
      corto.unsubscribe({id:"editor"});
      corto.subscribe({
        id: "editor",
        parent: q.from,
        expr: obj,
        db: editorStore.state.types,
        instance: this,
        summary: false,
        onError: function(error) {
          this.$emit('error', {error: error});
        }.bind(this),
        onDelete: function() {
          this.$refs.editor.close();
        }.bind(this)
      });
      this.$refs.editor.open();
      editorStore.setId(obj);
    },

    del(event) {
      var q = this.$refs.searchToolbar.getQuery();
      corto.delete({id: util.fullid(q.from, event.id)});
    },

    update(event) {
      var q = this.$refs.searchToolbar.getQuery();
      corto.update({
        id: util.fullid(q.from, event.id),
        value: event.value
      });
    },

    clearEdit() {
      this.$refs.editor.close();
    },

    // Strip path from an object identifier
    idFromPath(path) {
        var result = "";
        split = path.lastIndexOf("/");
        if (split != -1) {
          result = obj.slice(split + 1, obj.length);
        } else {
          result = path;
        }
        return result;
    },

    scroll(e) {
      this.browserScroll = e.target.scrollTop / (e.target.scrollHeight - e.target.clientHeight);
      this.browserScrollAbsolute = e.target.scrollTop;
      this.browserScrollView = e.target.clientHeight;
      this.browserHeight = e.target.scrollHeight;
      this.showIndex = true;

      if (this.timer) {
        window.clearTimeout(this.timer);
      }

      this.timer = window.setTimeout(function() {
        this.showIndex = false;
      }.bind(this), 500)
    }
  },

  data: function() {
    return {
      browserScroll: 0.0,
      browserScrollAbsolute: 0.0,
      browserScrollView: 0.0,
      browserHeight: 0.0,
      showIndex: false,
      editor: editorStore.state,
      timer: undefined,
      validQuery: true
    }
  },

  template: `
    <div id="browser">
    <search-toolbar
      ref="searchToolbar"
      :connected="connected"
      :url="url"
      v-on:search="search"
      v-on:invalidQuery="invalidQuery"
      v-on:connect="$emit('login')"
      v-on:menu="$emit('menu')">
    </search-toolbar>
    <div id="browser-content" :class="'browser-show-editor-' + editor.enabled" :style="'width: calc(100% - ' + editor.width * editor.enabled + 'px);'" v-on:scroll="scroll">
      <object-index :show="showIndex" v-if="!editor.enabled" :rightOffset="0" :scroll="browserScroll" :scrollAbsolute="browserScrollAbsolute" :scrollHeight="browserHeight" :scrollView="browserScrollView"></object-index>
      <object-index :show="showIndex" v-if="editor.enabled" :rightOffset="editor.width" :scroll="browserScroll" :scrollAbsolute="browserScrollAbsolute" :scrollHeight="browserHeight" :scrollView="browserScrollView"></object-index>
      <md-list class="md-double-line object-table-list" v-if="db.length && validQuery">
        <md-list-item class="md-active object-table-frame" v-for="type in db" v-if="type.objects.length" :key="type.id" md-expand-multiple>
          <div class="md-list-text-container">
            <div class="type-link" @click="filterType(type.id)">
              <h2 class="type-header">{{util.shorterTypeId(type.id)}}</h2>
            </div>
            <span>
              <object-table :type="type" :connected="connected" v-on:edit="edit($event.link, $event.absolutePath)" v-on:unedit="clearEdit" v-on:navigate="navigate($event.link, $event.absolutePath)"></object-table>
            </span>
          </div>
        </md-list-item>
      </md-list>
      <div id="browser-no-objects" v-else-if="!validQuery">
        <md-icon>announcement</md-icon>&nbsp;&nbsp;Invalid query '<span class="browser-no-objects-param">{{$refs.searchToolbar.getQueryString()}}</span>'
      </div>
      <div id="browser-no-objects" v-else-if="!connected && !url">
        <md-icon>announcement</md-icon>&nbsp;&nbsp;Not connected to a server
      </div>
      <div id="browser-no-objects" v-else-if="!connected">
        <md-icon>announcement</md-icon>&nbsp;&nbsp;Waiting for server '<span class="browser-no-objects-param">{{url}}</span>' to become available
      </div>
      <div id="browser-no-objects" v-else="!connected">
        <md-icon>announcement</md-icon>&nbsp;&nbsp;No objects returned for query <span class="browser-no-objects-param">{{$refs.searchToolbar.getQueryString()}}</span>
      </div>
    </div>
    <object-editor
      ref="editor"
      :editor="editor"
      :connected="connected"
      v-on:navigate="navigate($event.link, $event.absolutePath)"
      v-on:del="del"
      v-on:update="update">
    </object-editor>
    </div>`
});
