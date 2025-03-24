<script setup lang="ts">
import { onMounted, ref } from 'vue';
import axios from 'axios';
import { useRoute } from 'vue-router';
import { UseLoaderStore } from '@/stores/loader';
import { useToasterStore } from '@/stores/toaster';
import { useIndexStore } from '@/stores';

interface Project {

}

const route = useRoute()
const project = ref<any>({})
const loaderStore = UseLoaderStore()
const toasterStore = useToasterStore()
const indexStore = useIndexStore()

onMounted(() => {
    loaderStore.isActive = true
    axios.get(indexStore.apiHref + '/api/project/' + route.params.id, {
        headers: {
            'Authorization': 'Basic ' + indexStore.token
        }
    }).then(res => project.value = res.data)
        .catch(err => toasterStore.add({
            title: err.code,
            descr: err.message,
            type: 'danger'
        }))
        .finally(() => loaderStore.isActive = false)
})
</script>

<template lang="pug">
main.ip-main 
    section.header
        .ip-container.ip-dfw
            .left-slot
                RouterLink.ip-btn__back(to="/")
                    svg(width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg")
                        path(d="M15 4.5L7 12.5L15 20.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round")

            .right-slot
                h2.title {{ project.title }}
                .bread-crumbs
                    RouterLink(to='/') Все проекты
                    span >
                    RouterLink(to='#') {{ project.id }}

    section.ip-blocks
        .ip-container.ip-dfw 
            .ip-draft 
                RouterLink.ip-d__item( v-for="block of project.blocks" 
                :style="{width: `${block.figure.width}px`, height: `${block.figure.height}px`, top: `${block.coords.lng}px`, left: `${block.coords.lat}px`}"
                :to="'/project/' + project.id + '/block/' + block.id") {{ block.id }} 

</template>

<style scoped lang="scss">
.header {
    margin-bottom: 80px;

    .title {
        font-size: 32px;
    }

    .bread-crumbs {
        font-size: 20px;
    }

    .ip-btn__back {
        display: flex;
        height: 100%;
        background-color: var(--ip-primary);
        border-radius: 6px;
        align-items: center;
        margin-right: 10px;

        svg {
            stroke: #fff;
        }
    }
}

.ip-draft {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    width: 100%;
    height: 75vh;
    overflow: overlay;
}

.ip-d__item {
    position: absolute;
    top: 0;
    left: 0;
    width: 100px;
    height: 100px;
    max-width: 100vw;
    max-height: 100vh;
    transition: all 0.2s ease;
    background-color: #E1E1E1;
    cursor: pointer;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    margin: 10px;
    font-size: 24px;
    font-weight: 600;

    &:hover {
        background-color: var(--ip-bg);
    }
}
</style>