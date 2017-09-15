Vue.use(VueMaterial)

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

var app = new Vue({
  el: '#app',
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
          this.$refs.plugin.reset();
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
      this.$refs.plugin.reset();
    },

    // Query is executed
    search($event) {
      this.setTitle($event.parent, $event.expr, $event.type);
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

    // Update the browser history
    updateHistory(parent, expr, type) {
      if (!parent) {
        parent = "/";
      }
    
      if (window.location.protocol == "http:") {
        var newUrl = window.location.host + "/?select=" + expr + "&from=" + parent;
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
    db: table_db,
    connected: false,
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