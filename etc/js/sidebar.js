var sidebar_db = [];

Vue.component('sidebar', {
  methods: {
    reset() {
        corto.subscribe({
          id: "sidebar",
          parent: "driver/ui",
          expr: "*",
          type: "package",
          db: sidebar_db,
          instance: this,
          summary: false,
          onError: function(error) {
            console.log("failed to subscribe for packages");
          }.bind(this)
        });
    },
    get_plugins() {
        for (var i = 0; i < this.db.length; i ++) {
            if (this.db[i].id == "package") {
                return this.db[i].objects;
            }
        }
    },
    set_plugin(plugin) {
        var el = document.getElementById("sidebar-shortcut-" + this.active_plugin);
        if (el) {
            if (el.classlist) {
                el.classlist.remove("active-shortcut");
            } else {
                var reg = new RegExp('(\\s|^)' + 'active-shortcut' + '(\\s|$)');
                el.className = el.className.replace(reg, ' ');
            }
        }
        this.active_plugin = plugin;
        this.$emit("set_plugin", {plugin_id: plugin});
    },
    plugin_loaded(plugin) {
      var el = document.getElementById("sidebar-shortcut-" + this.active_plugin);
      if (el) {
          if (el.classlist) {
              el.classlist.add("active-shortcut");
          } else {
              el.className += " " + "active-shortcut";
          }
      }
    },
    get_class(plugin) {
        if (plugin == this.active_plugin) {
            return "active-shortcut"
        } else {
            return "";
        }
    }
  },
  data: function() {
      return {
          db: sidebar_db,
          active_plugin: "browser"
      }
  },
  template: `
    <div class="sidebar">
      <ul>
        <li :id="'sidebar-shortcut-' + plugin.id" v-for="plugin in get_plugins()"
            v-on:click="set_plugin(plugin.id)"
            :class="get_class(plugin.id)">
            <md-icon>{{plugin.value[7]}}</md-icon>
        </li>
      </ul>
    </div>`
});
