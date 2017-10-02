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
      </ul>
    </div>`
});
