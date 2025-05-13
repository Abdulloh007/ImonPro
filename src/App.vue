<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { UseLoaderStore } from './stores/loader';
import { useToasterStore } from './stores/toaster';
import { Capacitor } from '@capacitor/core';

const loaderStore = UseLoaderStore()
const toasterStore = useToasterStore()

const isIOS = Capacitor.getPlatform() === 'ios'
const isAndroid = Capacitor.getPlatform() === 'android'

</script>

<template lang="pug">
.ip-fake__statusbar(:class="{active: isIOS}")
RouterView
.ip-loader__wrap(:class="{active: loaderStore.isActive}")
    span.loader
TransitionGroup.ip-toaster(name="ip-toaster" tag="div") 
    .ip-toast(v-for="item in toasterStore.toasterList" :class="item.type" @click="toasterStore.remove(item)") 
        h4 {{ item.title }}
        p {{ item.descr }}
</template>

<style scoped lang="scss">
.ip-fake__statusbar {
    width: 100%;
    height: 0;
    display: block;

    &.active {
        height: 20px;
    }
}
    
</style>
