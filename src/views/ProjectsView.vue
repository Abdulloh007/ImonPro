<script setup lang="ts">
    import { onMounted, ref } from 'vue';
    import Navigation from '../components/Navigation.vue'
    import ProjectList from '../components/ProjectList.vue'
    import axios from 'axios';
import { useIndexStore } from '@/stores';

    const projectsListRef = ref<any[]>([])
    const store = useIndexStore()

    onMounted(() => {
        axios.get('/api/projects', {
            headers: {
                'Authorization': 'Basic ' + btoa('Admin:A927592454r')
            }
        }).then(res => projectsListRef.value = res.data)
    })
</script>

<template lang="pug">
main.ip-main 
    section.header
        .ip-container.ip-dfw.ip-justify-content-between.ip-align-items-center
            .left-slot
                h2.title Проекты
                .bread-crumbs
                    span Все проекты
            .right-slot
                RouterLink.ip-btn.ip-light-primary 
                    span Добавить
                    svg(width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg")
                        path(d="M12 7V17M7 12L17 12" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round")
    ProjectList(:list="projectsListRef")
    Navigation  
</template>

<style scoped lang="scss">

</style>