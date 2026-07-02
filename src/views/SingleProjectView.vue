<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import axios from '@/lib/httpClient';
import { useRoute } from 'vue-router';
import { Swiper, SwiperSlide } from 'swiper/vue';
import { Navigation, Pagination, Zoom } from 'swiper/modules';
import { UseLoaderStore } from '@/stores/loader';
import { useToasterStore } from '@/stores/toaster';
import { useIndexStore } from '@/stores';
// @ts-ignore
import 'swiper/css';
// @ts-ignore
import 'swiper/css/navigation';
// @ts-ignore
import 'swiper/css/pagination';
// @ts-ignore
import 'swiper/css/zoom';

const route = useRoute()
const project = ref<any>({})
const loaderStore = UseLoaderStore()
const toasterStore = useToasterStore()
const indexStore = useIndexStore()
const swiperModules = [Navigation, Pagination, Zoom]

const isFullscreen = ref(false)
const sliderRef = ref<HTMLElement | null>(null)

const baseUrl = computed(() => {
    try {
        const url = new URL(indexStore.apiHref)
        return `${url.protocol}//${url.host}`
    } catch {
        return indexStore.apiHref
    }
})

const sliderImages = computed(() => {
    const projectName = project.value?.title ? encodeURIComponent(project.value.title) : ''

    if (!projectName) {
        return []
    }

    return [1, 2, 3].map((index) => `${baseUrl.value}/statics/${projectName}/slider${index}.png`)
})

const toggleFullscreen = async () => {
    if (!sliderRef.value) return

    try {
        if (!document.fullscreenElement) {
            await sliderRef.value.requestFullscreen()
            isFullscreen.value = true
        } else {
            await document.exitFullscreen()
            isFullscreen.value = false
        }
    } catch (err) {
        console.error('Fullscreen error:', err)
    }
}

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
            .left-slot.ip-dfw
                RouterLink.ip-btn__back(to="/")
                    svg(width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg")
                        path(d="M15 4.5L7 12.5L15 20.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round")
                .ip-heading
                    h2.title {{ project.title }}
                    .bread-crumbs
                        RouterLink(to='/') Все проекты
                        span >
                        RouterLink(to='#') {{ project.id }}

    section.ip-slider(v-if="sliderImages.length" ref="sliderRef")
        .ip-container
            .ip-slider-wrapper
                Swiper.ip-project-slider(
                    :modules="swiperModules"
                    :slides-per-view="1"
                    :space-between="16"
                    :pagination="{ clickable: true }"
                    :navigation="true"
                    :zoom="{ maxRatio: 3, minRatio: 1 }"
                    :loop="true"
                )
                    SwiperSlide(v-for="(imageSrc, imageIndex) in sliderImages" :key="imageSrc")
                        .swiper-zoom-container
                            .ip-slide
                                img(:src="imageSrc" :alt="`Слайд ${imageIndex + 1} проекта ${project.title}`")
                button.ip-fullscreen-btn(@click="toggleFullscreen" :title="isFullscreen ? 'Выход из полноэкрана' : 'Полноэкран'")
                    svg(v-if="!isFullscreen" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg")
                        path(d="M3 7V3h4M21 7V3h-4M3 17v4h4M21 17v4h-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                    svg(v-else width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg")
                        path(d="M8 3v4H4M16 3v4h4M8 21v-4H4M16 21v-4h4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")

    section.ip-blocks
        .ip-container.ip-dfw 
            .ip-draft 
                RouterLink.ip-d__item( v-for="block of project.blocks" 
                :style="{width: `${block.figure.width}px`, height: `${block.figure.height}px`, top: `${block.coords.lng}px`, left: `${block.coords.lat}px`}"
                :to="'/project/' + project.id + '/block/' + block.id") {{ block.id }}
            RouterLink.ip-col-6(:to="'/project/' + route.params.id + '/parking'") 
                .ip-parking.ip-dfw
                    span.ip-icon 
                        //- parking icon
                        img(src="@/assets/parking.svg" alt="parking")
                    span Все парковочные места
</template>

<style scoped lang="scss">
.ip-slider {
    margin: 16px 0 24px;
    
    &:fullscreen {
        width: 100vh;
        height: 100vw;
        margin: 0;
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;
    }
}

.ip-slider-wrapper {
    position: relative;
}

.ip-project-slider {
    width: 100%;
    border-radius: 12px;
    overflow: hidden;
}

.ip-fullscreen-btn {
    position: absolute;
    bottom: 16px;
    right: 16px;
    width: 44px;
    height: 44px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.6);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    transition: background 0.2s ease;

    &:hover {
        background: rgba(0, 0, 0, 0.8);
    }

    svg {
        width: 24px;
        height: 24px;
    }
}

.ip-slide {
    width: 100%;
    min-height: 75vh;
    height: 75vh;
    background: #f1f1f1;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }
}

.ip-blocks{
    margin-bottom: 130px;
}

.ip-draft {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    width: 100%;
    height: 75vh;
    overflow: overlay;
    margin-bottom: 15vh;
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

.ip-parking {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background-color: #E1E1E1;
    border-radius: 8px;
    cursor: pointer;

    .ip-icon {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;

        img {
            width: 100%;
            height: 100%;
        }
    }
}
</style>
