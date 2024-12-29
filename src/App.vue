<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { UseLoaderStore } from './stores/loader';

const loaderStore = UseLoaderStore()
loaderStore.isActive
</script>

<template lang="pug">
RouterView
.ip-loader__wrap(:class="{active: loaderStore.isActive}")
    span.loader
</template>

<style scoped>

</style>
