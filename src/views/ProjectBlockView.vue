<script setup lang="ts">
import { ref } from 'vue';
import { onMounted } from 'vue';
import axios from 'axios';
import { useRoute } from 'vue-router';


    const project = ref<any>([])
    const route = useRoute()

    onMounted(() => {
        axios.get('/api/project/' + route.params.id + '/block/' + route.params.block, {
        headers: {
            'Authorization': 'Basic ' + btoa('Admin:27863')
        }
    }).then(res => {
        project.value = res.data
        let roomsList = []
        for(let i = res.data?.float_count; i > res.data?.magazine_count; i--) {
            roomsList.push(res.data?.places?.room.filter((item: any) => item?.float == i))
        }
        
        project.value.places.room = roomsList
        console.log(project);
        
    })

    })

function filterRoomsByFloat(arr: any[], float: number) {
    if (arr) return arr.filter(item => item.float == float) 
    else return []
}

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
            .ip-table(v-if="project")
                .ip-t__row.ip-head
                    .ip-t__data.ip-dfw(v-for="room in project.places?.title") {{room?.title}} 
                .ip-t__row(v-for="(rooms, idx) in project.places?.room")
                    .ip-t__data.ip-dfw {{ project.float_count - idx}}
                    RouterLink.ip-t__data.room.ip-dfw(v-for="item in rooms" :to="'/project/' + route.params.id + '/block/' + route.params.block + '/room/' + item.id") {{item.room_number}} кв 
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
            
            &.room {
                cursor: pointer;
                transition: all .2s ease;
                &:hover {
                    background-color: rgb(241 200 90 / 60%);
                }
            }

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