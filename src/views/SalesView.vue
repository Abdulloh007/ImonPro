<script setup lang="ts">
import { useIndexStore } from '@/stores';
import { UseLoaderStore } from '@/stores/loader';
import { useToasterStore } from '@/stores/toaster';
import axios from 'axios';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import Navigation from '../components/Navigation.vue';
import { Capacitor } from '@capacitor/core';


const sales = ref<any[]>([])
const filtered_sales = ref<any[]>([])
const clients = ref<any[]>([])
const blocks = ref<any[]>([])
const projects = ref<any[]>([])

const totalSquare = ref<number>(0)
const totalRooms1 = ref<number>(0)
const totalRooms2 = ref<number>(0)
const totalRooms3 = ref<number>(0)
const totalRooms4 = ref<number>(0)

const filters = ref<any>({
    id: "",
    client: "",
    client_phone: "",
    room: "",
    room_count: 0,
    square: 0,
    float: 0,
    block: "",
    project: "",
    date: 0,
    monthly_payment: 0,
    comment: ""
})
// const route = useRoute() 
const loaderStore = UseLoaderStore()
const toasterStore = useToasterStore()
const indexStore = useIndexStore()

onMounted(() => {
    indexStore.servers.map(item => {
        loaderStore.isActive = true
        axios.get(item.link + '/api/sales', {
            headers: {
                'Authorization': 'Basic ' + item.token
            }
        }).then(res => {
            sales.value = res.data

            sales.value.map(item => {
                if (clients.value.indexOf(item.client) === -1) {
                    clients.value.push(item.client)
                }

                if (blocks.value.indexOf(item.block) === -1) {
                    blocks.value.push(item.block)
                }

                if (projects.value.indexOf(item.project) === -1) {
                    projects.value.push(item.project)
                }
            })

            projects.value = projects.value.sort()
            blocks.value = blocks.value.sort()
            clients.value = clients.value.sort()

            filterSales()
        })
            .catch(err => toasterStore.add({
                title: err.code,
                descr: err.message,
                type: 'danger'
            }))
            .finally(() => loaderStore.isActive = false)
    })
})

function filterSales() {
    let filtered = sales.value

    if (filters.value.client !== "") {
        filtered = filtered.filter(item => { return item.client === filters.value.client })
    }

    if (filters.value.block !== "") {
        filtered = filtered.filter(item => { return item.block === filters.value.block })
    }

    if (filters.value.project !== "") {
        filtered = filtered.filter(item => { return item.project === filters.value.project })
    }

    filtered_sales.value = filtered

    totalSquare.value = filtered.reduce((acc: number, item: any) => acc + item.square, 0).toFixed(2)
    totalRooms1.value = filtered.filter((item: any) => item.room_count === 1).length
    totalRooms2.value = filtered.filter((item: any) => item.room_count === 2).length
    totalRooms3.value = filtered.filter((item: any) => item.room_count === 3).length
    totalRooms4.value = filtered.filter((item: any) => item.room_count === 4).length
}
</script>

<template lang="pug">
main.ip-main 
    section.header
        .ip-container.ip-dfw.ip-justify-content-between.ip-align-items-center
            .left-slot
                h2.title Продажи
                .bread-crumbs
                    RouterLink(to="/reports") Все отчеты
            .right-slot 
                .ip-filter.project.ip-dfw  
                    label(for="project") Проект
                    select(id="project" v-model="filters.project" @change="filterSales()")
                        option(value="") Все
                        option(v-for="project of projects" :value="project") {{project}}
                .ip-filter.block.ip-dfw
                    label(for="block") Блок
                    select(id="block" v-model="filters.block" @change="filterSales()")
                        option(value="") Все
                        option(v-for="block of blocks" :value="block") {{block}}
                .ip-filter.client.ip-dfw
                    label(for="client") Клиенты
                    select(id="client" v-model="filters.client" @change="filterSales()")
                        option(value="") Все
                        option(v-for="client of clients" :value="client") {{client}}

    section.ip-list
        .ip-container.ip-dfw
            .ip-table
                .ip-t__row.ip-head
                    .ip-t__data.ip-dfw ФИО
                    .ip-t__data.ip-dfw Телефон
                    .ip-t__data.ip-dfw №
                    .ip-t__data.ip-dfw Комнат
                    .ip-t__data.ip-dfw m2
                    .ip-t__data.ip-dfw Этаж
                    .ip-t__data.ip-dfw Блок
                    .ip-t__data.ip-dfw Дата
                    .ip-t__data.ip-dfw Сумма
                    .ip-t__data.ip-dfw Заметка
                .ip-t__row(v-for="sale in filtered_sales")
                    .ip-t__data.ip-dfw {{sale.client}}
                    .ip-t__data.ip-dfw {{sale.client_phone}}
                    .ip-t__data.ip-dfw {{sale.room}}
                    .ip-t__data.ip-dfw {{sale.room_count}}
                    .ip-t__data.ip-dfw {{sale.square}}
                    .ip-t__data.ip-dfw {{sale.float}}
                    .ip-t__data.ip-dfw {{sale.block}}
                    .ip-t__data.ip-dfw {{sale.date}}
                    .ip-t__data.ip-dfw {{sale.monthly_payment}}
                    .ip-t__data.ip-dfw {{sale.comment}}
            
            .ip-rooms_quantity
                .ip-rooms_quantity__item
                    .ip-rooms_quantity__title Общая площадь
                    .ip-rooms_quantity__value {{ totalSquare }}
                .ip-rooms_quantity__item
                    .ip-rooms_quantity__title 1 комнатные
                    .ip-rooms_quantity__value {{ totalRooms1 }}
                .ip-rooms_quantity__item
                    .ip-rooms_quantity__title 2 комнатные
                    .ip-rooms_quantity__value {{ totalRooms2 }}
                .ip-rooms_quantity__item
                    .ip-rooms_quantity__title 3 комнатные
                    .ip-rooms_quantity__value {{ totalRooms3 }}
                .ip-rooms_quantity__item
                    .ip-rooms_quantity__title 4 комнатные
                    .ip-rooms_quantity__value {{ totalRooms4 }}
    Navigation
</template>

<style scoped lang="scss">
.ip-table {
    display: flex;
    flex-direction: column;
    overflow: scroll;
    max-width: 100%;
    padding-bottom: 20vh;
    max-height: 90vh;

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

        &:nth-child(odd) {
            .ip-t__data {
                background-color: #f7b487;
            }
        }

        .ip-t__data {
            padding: 10px;
            width: 100%;
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
            }

            &:first-child {
                position: sticky;
                left: 0;
                top: 0;
                z-index: 9;
                box-shadow: 1px 0 6px -3px #000;
                min-width: 320px;
                justify-content: flex-start;
            }

            &:nth-child(2) {
                min-width: 120px;
            }

            &:nth-child(3),
            &:nth-child(4),
            &:nth-child(5),
            &:nth-child(6),
            &:nth-child(7),
            &:nth-child(8),
            &:nth-child(9) {
                min-width: 80px;
            }

            &:nth-child(10) {
                min-width: 120px;
            }

            &:not(:last-child) {
                margin-right: 5px;
            }
        }
    }
}

.ip-rooms_quantity {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    margin-top: 20px;
    padding: 0 20px;
    padding-bottom: 20vh;

    &__item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 19%;
        max-width: 200px;
        padding: 10px;
        background-color: #f5f5f5;
        border-radius: 5px;
    }

    &__title {
        font-size: 18px;
        margin-bottom: 5px;
    }

    &__value {
        font-size: 24px;
        font-weight: bold;
    }
}

@media (max-width: 576px) {

    .header {
        margin-bottom: 20px;
    }

    .ip-table {
        .ip-t__row {
            .ip-t__data {
                &:first-child {
                    min-width: 180px;
                }
            }
        }
    }

    .ip-rooms_quantity {
        flex-direction: column;
        align-items: center;
        padding: 0 10px;
        padding-bottom: 20vh;

        &__item {
            width: 100%;
            max-width: none;
            margin-bottom: 10px;
        }
    }
}
</style>