
var queryStore = {
  state: {
    valid: true
  },
  setValid (newValue) {
    this.state.valid = newValue;
  }
}

Vue.component('query-input', {
  props: ['connected', 'hidden'],
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
      if (!this.hidden) {
          this.applyHighlight(this.$refs.queryInput, query, queryObj);
          util.moveCaret(this.$refs.queryInput, query.length);
      }
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
  props: ['connected', 'url', 'hidden'],
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
            <query-input ref="queryInput" :hidden="hidden" :connected="connected" v-on:search="$emit('search', $event)" v-on:invalidQuery="$emit('invalidQuery', $event)"/>
          </md-whiteframe>
        </div>
      </md-toolbar>
    </div>
    `
});
