<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import { UseLoaderStore } from './stores/loader';
import { useToasterStore } from './stores/toaster';
import { Capacitor } from '@capacitor/core';
import Navigation from './components/Navigation.vue'

const loaderStore = UseLoaderStore()
const toasterStore = useToasterStore()

const isIOS = Capacitor.getPlatform() === 'ios'
const isAndroid = Capacitor.getPlatform() === 'android'
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
const isSidebarCollapsed = ref(windowWidth.value <= 768)
const isMobile = computed(() => windowWidth.value <= 768)
const showSidebarOverlay = computed(() => isMobile.value && !isSidebarCollapsed.value)

function updateWindowWidth() {
    windowWidth.value = window.innerWidth
}

function toggleSidebar() {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
}

function closeSidebar() {
    isSidebarCollapsed.value = true
}

onMounted(() => {
    window.addEventListener('resize', updateWindowWidth)
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', updateWindowWidth)
})

</script>

<template lang="pug">
.ip-fake__statusbar(:class="{active: isIOS}")
Navigation(:collapsed="isSidebarCollapsed" @toggle-sidebar="toggleSidebar")
.ip-sidebar-overlay(v-if="showSidebarOverlay" @click="closeSidebar")
.ip-layout(:class="{collapsed: isSidebarCollapsed}")
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

.ip-layout {
    min-height: 100vh;
    padding-top: 64px;
    padding-left: 230px;
    transition: padding-left 0.25s ease;

    &.collapsed {
        padding-left: 82px;
    }
}

@media (max-width: 768px) {
    .ip-sidebar-overlay {
        position: fixed;
        top: 56px;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 19;
        background: rgba(0, 0, 0, 0.35);
    }

    .ip-layout,
    .ip-layout.collapsed {
        padding-top: 56px;
        padding-left: 0;
    }
}
    
</style>
