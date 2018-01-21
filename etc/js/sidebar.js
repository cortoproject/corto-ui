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
    get_apps() {
        for (var i = 0; i < this.db.length; i ++) {
            if (this.db[i].id == "package") {
                return this.db[i].objects;
            }
        }
    },
    set_plugin(plugin) {
        this.active_plugin = plugin;
        this.$emit('set_plugin', {plugin_id: plugin});
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
        <li v-for="app in get_apps()" v-on:click="set_plugin(app.id)"><md-icon>{{app.value[7]}}</md-icon></li>
      </ul>
    </div>`
});
