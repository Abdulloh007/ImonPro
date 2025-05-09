<script setup lang="ts">
import { ref } from 'vue';
import { onMounted } from 'vue';
import axios from 'axios';
import { useRoute } from 'vue-router';
import { UseLoaderStore } from '@/stores/loader';
import { useToasterStore } from '@/stores/toaster';
import { useIndexStore } from '@/stores';


const project = ref<any>([])
const route = useRoute()
const loaderStore = UseLoaderStore()
const toasterStore = useToasterStore()
const indexStore = useIndexStore()

onMounted(() => {
    loaderStore.isActive = true
    axios.get(indexStore.apiHref + '/api/project/' + route.params.id + '/block/' + route.params.block, {
        headers: {
            'Authorization': 'Basic ' + indexStore.token
        }
    }).then(res => {
        project.value = res.data
        let roomsList: any[] = []
        for (let i = res.data?.float_count; i > res.data?.magazine_count; i--) {
            roomsList.push(res.data?.places?.room.filter((item: any) => item?.float == i).sort((a: any, b: any) => a.room_number < b.room_number ? -1 : 1))
        }

        project.value.places.room = roomsList
    })
    .catch(err => toasterStore.add({
        title: err.code,
        descr: err.message,
        type: 'danger'
    }))
    .finally(() => loaderStore.isActive = false)

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
                RouterLink.ip-btn__back(:to="'/project/' + project.id")
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
                    RouterLink.ip-t__data.room.ip-dfw(v-for="item in rooms" :to="'/project/' + route.params.id + '/block/' + route.params.block + '/room/' + item.id" :class="{reserved: item.reserved, broned: item.broned}") 
                        span {{ item.room_number }} кв
                        span(v-if="item.broned") {{ item.client.split(' ')[0] }} {{ item.client.split(' ').length > 1 ? item.client.split(' ')[1].slice(0, 1) : ''}}. {{ item.client.split(' ').length > 2 ? item.client.split(' ')[2].slice(0, 1) : '' }}.
                        //- span
</template>

<style scoped lang="scss">
.header {
    margin-bottom: 120px;

    .title {
        font-size: 32px;
    }

    .bread-crumbs {
        font-size: 20px;
        a {
            word-break: break-all;
        }
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
    overflow: overlay;
    max-width: 100%;
    max-height: 90vh;
    padding-bottom: 10vh;

    .ip-t__row {
        position: relative;
        display: flex;
        flex-basis: 100px;
        margin-bottom: 5px;
        min-width: 1024px;

        &.ip-head {
            position: sticky;
            top: 0;
            z-index: 10;
            box-shadow: 0 1px 6px -3px #000;
        }

        .ip-t__data {
            padding: 10px;
            width: 100%;
            min-height: 100px;
            justify-content: center;
            align-items: center;
            background-color: #D9D9D9;

            &.reserved {
                background-color: #FAF2A0;
                color: #000;
            }

            &.broned {
                background-color: #79AB33;
                color: #fff;
            }

            &.room {
                cursor: pointer;
                transition: all .2s ease;

                &:hover {
                    background-color: rgb(241 200 90 / 60%);
                }

                span {
                    display: block;
                    width: 100%;
                    text-align: center;
                }
            }

            &:first-child {
                width: 50%;
                position: sticky;
                left: 0;
                top: 0;
                z-index: 9;
                box-shadow: 1px 0 6px -3px #000;
                justify-content: flex-start;
            }

            &:not(:last-child) {
                margin-right: 5px;
            }
        }
    }
}

@media (max-width: 576px) {
    .right-slot {
        width: calc(100% - 45px);
    }
}
</style>