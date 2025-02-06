<script setup lang="ts">
import { useIndexStore } from '@/stores';
import { UseLoaderStore } from '@/stores/loader';
import { useToasterStore } from '@/stores/toaster';
import axios from 'axios';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import Navigation from '../components/Navigation.vue';


const sales = ref<any[]>([])
const filtered_sales = ref<any[]>([])
const clients = ref<any[]>([])
const blocks = ref<any[]>([])
const filters = ref<any>({
    id: "",
    client: "",
    client_phone: "",
    room: "",
    room_count: 0,
    square: 0,
    float: 0,
    block: "",
    date: 0,
    monthly_payment: 0,
    comment: ""
})
// const route = useRoute() 
const loaderStore = UseLoaderStore()
const toasterStore = useToasterStore()
const indexStore = useIndexStore()

onMounted(() => {
    loaderStore.isActive = true
    axios.get(indexStore.apiHref + '/api/sales', {
        headers: {
            'Authorization': 'Basic ' + indexStore.token
        }
    }).then(res => {
        sales.value = res.data

        sales.value.map(item => {
            // console.log(item);

            if (clients.value.indexOf(item.client) === -1) {
                clients.value.push(item.client)
            }

            if (blocks.value.indexOf(item.block) === -1) {
                blocks.value.push(item.block)
            }
        })

        console.log(clients.value);
        console.log(blocks.value);


        filterSales()
    })
        .catch(err => toasterStore.add({
            title: err.code,
            descr: err.message,
            type: 'danger'
        }))
        .finally(() => loaderStore.isActive = false)
})

function filterSales() {
    let filtered = sales.value

    if (filters.value.client !== "") {
        filtered = sales.value.filter(item => { return item.client === filters.value.client })
    }

    if (filters.value.block !== "") {
        filtered = sales.value.filter(item => { return item.block === filters.value.block })
    }

    filtered_sales.value = filtered
}
</script>

<template lang="pug">
main.ip-main 
    section.header
        .ip-container.ip-dfw.ip-justify-content-between.ip-align-items-center
            .left-slot
                h2.title Продажи
                .bread-crumbs
                    RouterLink(to="/sales") Все продажи
            .right-slot
                .ip-filter.client.ip-dfw
                    label(for="client") Клиенты
                    select(id="client" v-model="filters.client" @change="filterSales()")
                        option(value="") Все
                        option(v-for="client of clients" :value="client") {{client}}
                .ip-filter.block.ip-dfw
                    label(for="block") Блок
                    select(id="block" v-model="filters.block" @change="filterSales()")
                        option(value="") Все
                        option(v-for="block of blocks" :value="block") {{block}}

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
    Navigation
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

    .left,
    .right {
        width: 50%;
    }

    .ip-filter {
        align-items: center;

        label {
            display: block;
            width: 80px;
        }

        select {
            width: calc(100% - 80px);
            padding: 10px;
            border: none;
            border-bottom: 1px solid #e1e1e1;
        }
    }
}


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

@media (max-width: 576px) {
    .ip-table {
        .ip-t__row {
            .ip-t__data {
                &:first-child {
                    min-width: 180px;
                }
            }
        }
    }
}
</style>