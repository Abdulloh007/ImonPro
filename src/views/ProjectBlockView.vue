<script setup lang="ts">
import { ref } from 'vue';
import { onMounted } from 'vue';
import axios from 'axios';
import { useRoute } from 'vue-router';

    const project = ref([])
    const route = useRoute()

    onMounted(() => {
        axios.get('/api/project/' + route.params.id + '/block/' + route.params.block, {
        headers: {
            'Authorization': 'Basic ' + btoa('Admin:27863')
        }
    }).then(res => project.value = res.data)

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
                h2.title "{{ project.title }}"
                .bread-crumbs
                    RouterLink(to='/') Все проекты
                    span >
                    RouterLink(:to="'/project/' + project.id") {{ project.id }}
                    span >
                    RouterLink(to="#") Блок {{ project.block }}
    section.ip-lux__rooms 
        .ip-container 
            .ip-table
                .ip-t__row.ip-head
                        .ip-t__data.ip-dfw(v-for="room in project.places?.title") {{room?.title}} 
                        .ip-t__data.ip-dfw(v-for="room in project.places?.lux") {{room?.title}} 
                        .ip-t__data.ip-dfw(v-for="room in project.places?.room") {{room?.title}} 
                        .ip-t__data.ip-dfw(v-for="room in project.places?.underground") {{room?.title}} 

</template>

<style scoped lang="scss">
.header {
    margin-bottom: 120px;

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

.ip-table {
    display: flex;
    flex-direction: column;
    .ip-t__row {
        display: flex;
        flex-basis: 100px;
        margin-bottom: 5px;
        .ip-t__data {
            padding: 10px;
            width: 100%;
            justify-content: center;
            align-items: center;
            background-color: #D9D9D9;
            
            &:first-child {
                width: 50%;
            }
            
            &:not(:last-child) {
                margin-right: 5px;
            }
        }
    }
}
</style>