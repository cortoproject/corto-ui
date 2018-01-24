Vue.use(VueMaterial)

var db = [];

Vue.material.registerTheme('default', {
  primary: {
    color: "teal",
    hue: 'A700',
    textColor: "white"
  },
  accent: {
    color: "pink",
    hue: 500,
    textColor: "white"
  }
});

/* Error snackbar */
Vue.component('error-snackbar', {
  methods: {
    // Throw error
    throw(msg, duration) {
      this.message = msg;
      if (!duration) {
        this.duration = 1000000;
      } else {
        this.duration = duration;
      }
      this.$refs.snackbar.open();
    },

    // Clear error
    clear() {
      this.$refs.snackbar.close();
    }
  },
  data: function() {
    return {
      message: undefined,
      duration: 5000
    }
  },
  template: `
    <md-snackbar md-position="bottom center" ref="snackbar" :duration="duration">
      <span>{{message}}</span>
      <md-button class="md-accent" @click.native="$refs.snackbar.close()">Close</md-button>
    </md-snackbar>`
});

/* Connect dialog */
Vue.component('login-dialog', {
  methods: {
    open(url) {
      this.url = url;
      this.$refs.dialog.open();
    },
    connect(ref) {
      this.$refs.dialog.close();
      var url = this.url;
      if (url.substr(0, 7) == "http://") {
        url = url.substr(7, url.length - 7);
      }
      this.$emit('connect', {'url': url});
    },
    cancel(ref) {
      this.$refs.dialog.close();
    }
  },

  data: function() {
    return {
      isGuest: true,
      url: "localhost:9090"
    }
  },

  template: `
    <md-dialog id="login" ref="dialog" :md-backdrop="true" :md-click-outside-to-close="false">
      <div style="text-align: center; padding-top: 20px">
        <img src="images/logo.png" width="70px"/>
      </div>
      <md-dialog-content>
        <md-input-container>
          <label>URL</label>
          <md-input placeholder="localhost:9090" ref="url" v-model="url"></md-input>
        </md-input-container>
      </md-dialog-content>
      <md-dialog-actions>
          <md-button class="md-primary" @click.native="cancel()">Cancel</md-button>
          <md-button class="md-primary" @click.native="connect()">Connect</md-button>
      </md-dialog-actions>
    </md-dialog>`
});

/* Active plugin element */
var plugin_el = undefined;

/* Plugin interface */
Vue.component('plugin', {
    props: ['active_plugin', 'connected', 'url', 'query_valid', 'query_string', 'query_object', 'db'],

    /* Forward methods of plugin interface to plugin */
    methods: {
        search($event) {
            if (plugin_el && plugin_el.child && plugin_el.child.search) {
              plugin_el.child.search($event);
            }
        }
    },

    render: function(createElement) {
      plugin_el = createElement(
        'plugin-' + this.active_plugin, {
          props: {
            connected: this.connected,
            url: this.url,
            query_valid: this.query_valid,
            query_string: this.query_string,
            query_object: this.query_object,
            db: this.db
          },
          on: {
            navigate: function(event) {this.$emit('navigate', event)}.bind(this),
          }
        }
      );
      return plugin_el;
    }
});

var app = new Vue({
  el: '#app',

  created() {
    var pathname = window.location.pathname.substring(0, 4);
    var plugin = "browser";

    this.app_only = pathname == "/app";

    if (this.app_only) {
        pathname = window.location.pathname;
        plugin = pathname.substring(4, pathname.length);
        if (plugin[0] == '/') {
            plugin = plugin.substring(1, plugin.length);
        }
        plugin = plugin.split("/")[0];
    }

    this.load_plugin(plugin);
  },

  methods: {
    // Connect to a server
    connect($event) {
      if ($event == undefined) {
        $event = {url: window.location.host};
      }
      document.title = $event.url;
      this.host = $event.url;
      corto.connect({
        host: $event.url,
        onConnected: function(msg) {
          this.navigate({});
          this.$refs.sidebar.reset();
        }.bind(this),
        onClose: function(msg) {
          this.$refs.errorSnackbar.throw("URL " + $event.url + " is unavailable");
          this.connected = false;
        }.bind(this),
        onOpen: function() {
          this.connected = true;
        }.bind(this)
      });
    },

    // Back/Forward button pressed
    move() {
      this.navigate({});
    },

    // Nav changed query
    search($event) {
      this.setTitle($event.parent, $event.expr, $event.type);

      // Set query data
      this.query_valid = true;
      this.query_string = this.$refs.nav.getQueryString();
      this.query_object = this.$refs.nav.getQuery();

      // Subscribe for new query
      corto.unsubscribe({id:"nav"});
      corto.subscribe({
        id: "nav",
        parent: $event.parent,
        expr: $event.expr,
        type: $event.type,
        db: this.db,
        instance: this,
        summary: true,
        onOk: function() {
            this.$refs.errorSnackbar.clear();
            this.$refs.plugin.search($event);
        }.bind(this),
        onError: function(error) {
          this.throw(error, 5000);
        }.bind(this)
      });

      this.$refs.plugin.search($event);
    },

    // Nav reported invalid query
    invalid_query() {
      this.query_valid = false;
    },

    // Plugin requests new query
    navigate(event) {
        if (!event.select && !event.from && !event.type) {
            this.$refs.nav.setQueryFromUrl();
        } else {
            this.$refs.nav.setQuery(event.from, event.expr, event.type);
        }
    },

    // Error is thrown
    error($event) {
      this.$refs.errorSnackbar.throw($event.error);
    },

    // Connection button pressed
    login() {
      this.$refs.loginDialog.open(this.host);
    },

    // Menu button pressed
    menu() {
      this.$refs.menuSidenav.toggle();
    },

    load_plugin(plugin_id) {
        var plugin = document.createElement("script");
        plugin.setAttribute("id", "plugin-ref");
        plugin.setAttribute("type", "text/javascript");
        plugin.setAttribute("src", "plugin/" + plugin_id + ".js");
        document.body.appendChild(plugin);
    },

    unload_plugin() {
        var plugin = document.getElementById("plugin-ref");
        if (plugin) {
            plugin.parentNode.removeChild(plugin);
        }
    },

    // Change active plugin
    set_plugin(event) {
      console.log("[ activate plugin " + event.plugin_id + " ]");
          this.unload_plugin();
          this.load_plugin(event.plugin_id);
    },

    plugin_loaded(plugin_id, init_func) {
        console.log("[ plugin loaded: " + plugin_id + " ]");
        this.active_plugin = plugin_id;
        if (this.plugins_loaded.indexOf(plugin_id) == -1) {
            if (init_func != undefined) {
                init_func();
            }
            this.plugins_loaded.push(plugin_id);
        }
        this.$refs.sidebar.plugin_loaded(plugin_id);
    },

    // Update the browser history
    updateHistory(parent, expr, type) {
      if (!parent) {
        parent = "/";
      }

      if (window.location.protocol == "http:") {
        var newUrl = "?select=" + expr + "&from=" + parent;

        // Append path
        var pathname = window.location.pathname;

        if (pathname != "/") {
            if (pathname[pathname.length - 1] != '/') {
                newUrl = "/" + newUrl;
            }
            newUrl = pathname + newUrl;
        }

        // Append protocol & host
        newUrl = window.location.host + newUrl;

        if (type) {
          newUrl += "&type=" + type;
        }
        var fullUrl = window.location.protocol + "//" + newUrl;
        if (fullUrl != window.location.href) {
          window.history.pushState({}, "", fullUrl);
        }
      }
    },

    // Update document title
    setTitle(parent, expr, type) {
      var q = expr;

      if (parent) {
        q += "," + parent;
      } else {
        parent = "/";
      }
      if (type) {
        q += "," + type;
      }

      this.updateHistory(parent, expr, type);
      if (parent == "/") {
        parent = "root";
      } else {
        parent = parent.slice(1, parent.length);
      }
    },
  },

  data: {
    host: window.location.host,
    connected: false,
    active_plugin: "browser",
    query_string: undefined,
    query_object: undefined,
    query_valid: true,
    db: db,
    plugins_loaded: [],
    app_only: false
  }
});

window.onload = function() {
  window.onpopstate = function(e) {
      app.move();
  };
  if (!window.location.host) {
    app.login();
  } else {
    app.connect();
  }
}
