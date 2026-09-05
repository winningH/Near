<template>
  <div v-if="att" class="lightbox-overlay" @click="$emit('close')">
    <img class="lightbox-img" :src="safeUrl(att.url)" :alt="att.name || ''" />
  </div>
</template>

<script>
  import { safeUrl } from '../utils/helpers';

  export default {
    name: 'Lightbox',

    props: {
      // 要预览的附件对象，为 null 时不渲染
      att: { type: Object, default: null }
    },

    mounted() {
      document.addEventListener('keydown', this.onKey);
    },

    beforeDestroy() {
      document.removeEventListener('keydown', this.onKey);
    },

    methods: {
      safeUrl,
      onKey(e) {
        if (e.key === 'Escape') this.$emit('close');
      }
    }
  };
</script>

<style scoped>
  .lightbox-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    cursor: pointer;
    backdrop-filter: blur(8px);
    background: rgba(0, 0, 0, 0.75);
  }

  .dark .lightbox-overlay {
    background: rgba(0, 0, 0, 0.85);
  }

  .lightbox-img {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }
</style>
