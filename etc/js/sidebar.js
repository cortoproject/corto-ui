Vue.component('sidebar', {
  methods: {
    connect() {
      this.$emit('connect')
    }
  },
  template: `
    <div class="sidebar">
      <ul>
        <li><md-icon>search</md-icon></li>
        <li><md-icon>dashboard</md-icon></li>
      </ul>
      <svg class="connect-indicator">
        <circle cx="32" cy="20" r="7" fill="green" @click.native="connect"s>
      </svg>
    </div>`
});
