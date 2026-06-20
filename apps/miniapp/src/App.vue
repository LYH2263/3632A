<script lang="ts">
export default {
  onLaunch() {
    // uni-app 生命周期入口，业务初始化由各页面按需执行。
  }
};
</script>

<style lang="scss">
/* #ifdef H5 */
@import './style.css';
/* #endif */
/* #ifndef H5 */
@import './style-mp.css';
/* #endif */
</style>
