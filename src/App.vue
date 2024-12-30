<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { UseLoaderStore } from './stores/loader';
import { useToasterStore } from './stores/toaster';

const loaderStore = UseLoaderStore()
const toasterStore = useToasterStore()

</script>

<template lang="pug">
RouterView
.ip-loader__wrap(:class="{active: loaderStore.isActive}")
    span.loader
TransitionGroup.ip-toaster(name="ip-toaster" tag="div") 
    .ip-toast(v-for="item in toasterStore.toasterList" :class="item.type" @click="toasterStore.remove(item)") 
        h4 {{ item.title }}
        p {{ item.descr }}
</template>

<style scoped>

</style>
