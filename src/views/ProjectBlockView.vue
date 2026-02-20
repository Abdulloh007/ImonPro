<script setup lang="ts">
import { ref } from 'vue';
import { onMounted } from 'vue';
import axios from 'axios';
import { useRoute } from 'vue-router';
import { UseLoaderStore } from '@/stores/loader';
import { useToasterStore } from '@/stores/toaster';
import { useIndexStore } from '@/stores';
import type { Counterparty } from '@/models/couterparty';
import { Capacitor } from '@capacitor/core';


const project = ref<any>([])
const route = useRoute()
const loaderStore = UseLoaderStore()
const toasterStore = useToasterStore()
const indexStore = useIndexStore()


// const appartment = ref<any>({})
// const appartment_square = ref<number>(0)
// const price = ref<number>(0)
// const installment = ref<number>(6)
// const exchange_rate = ref<number | string>(0)
// const first_payment = ref<number>(0)
// const monthly_sum = ref<number | string>(0)
// const total_sum = ref<number | string>(0)
// const comment = ref<string>('')

const isModalOpen = ref<string>('')
const saleType = ref<'shop' | 'parking' | 'storage' | ''>('')

const counterparty = ref<Counterparty>({
    full_name: '',
    address: '',
    passport: 'A',
    date_of_issue: '',
    place_of_issue: '',
    id: null,
    inn: ''
})

const role = ref<any>({
    degree: 999,
    name: ''
})

function openModal(type: 'shop' | 'parking' | 'storage') {
    saleType.value = type
    isModalOpen.value = 'active'
}

onMounted(() => {
    loaderStore.isActive = true
    axios.get(Capacitor.isNativePlatform() ? indexStore.apiHref + '/api/project/' + route.params.id + '/block/' + route.params.block : '/api/project/' + route.params.id + '/block/' + route.params.block, {
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

        project.value.places.parking = res.data?.places?.parking.map((item: any) => {
            item.parking_number = parseInt(item.name.split(' ')[item.name.split(' ').length - 1])
            return item
        }).sort((a: any, b: any) => a.parking_number < b.parking_number ? -1 : 1)

        project.value.places.storage = res.data?.places?.storages.map((item: any) => {
            item.storage_number = parseInt(item.name.split(' ')[item.name.split(' ').length - 1])
            return item
        }).sort((a: any, b: any) => a.storage_number < b.storage_number ? -1 : 1)

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
            .left-slot.ip-dfw
                RouterLink.ip-btn__back(:to="'/project/' + project.id")
                    svg(width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg")
                        path(d="M15 4.5L7 12.5L15 20.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round")
                .ip-heading
                    h2.title "{{ project.title }}"
                    .bread-crumbs
                        RouterLink(to='/') Все проекты
                        span >
                        RouterLink(:to="'/project/' + project.id") {{ project.id }}
                        span >
                        RouterLink(to="#") Блок {{ project.block }}

            .right-slot
                //- .ip-heading
                //-     h2.title Спец продажи
                //- .ip-buttons.ip-dfw
                //-     button.ip-btn.ip-btn_danger(@click="openModal('shop')") Магазины
                //-     button.ip-btn.ip-btn_info(@click="openModal('parking')") Парковка
                //-     button.ip-btn.ip-btn_black(@click="openModal('storage')") Кладовые

    section.ip-lux__rooms 
        .ip-container
            .ip-heading.ip-w-full.ip-mb-2
                h2.title 
                    b Пентхаусы
            .ip-table(v-if="project")
                .ip-t__row
                    .ip-t__data.ip-dfw {{ project.places?.lux[0]?.float }} этаж
                    RouterLink.ip-t__data.ip-dfw(v-for="appartment in project.places?.lux" :to="'/project/' + route.params.id + '/block/' + route.params.block + '/room/' + appartment.id" :class="{reserved: appartment.reserved, broned: appartment.broned}") {{appartment?.room_number}} кв
        .ip-container 
            .ip-heading.ip-w-full.ip-mb-2  
                h2.title 
                    b Типовые Квартиры
            .ip-table(v-if="project")
                .ip-t__row.ip-head
                    .ip-t__data.ip-dfw(v-for="room in project.places?.title") {{room?.title}} 
                .ip-t__row(v-for="(rooms, idx) in project.places?.room")
                    .ip-t__data.ip-dfw {{ project.float_count - idx}}
                    RouterLink.ip-t__data.room.ip-dfw(v-for="item in rooms" :to="'/project/' + route.params.id + '/block/' + route.params.block + '/room/' + item.id" :class="{reserved: item.reserved, broned: item.broned}") 
                        span {{ item.room_number }} кв
                        span(v-if="item.broned") {{ item.client.split(' ')[0] }} {{ item.client.split(' ').length > 1 ? item.client.split(' ')[1].slice(0, 1) : ''}}. {{ item.client.split(' ').length > 2 ? item.client.split(' ')[2].slice(0, 1) : '' }}.
                        //- span
        .ip-container
            .ip-heading.ip-w-full.ip-mb-2  
                h2.title 
                    b Магазины
            .ip-table(v-if="project")
                .ip-t__row(v-for="(shop, idx) in project.places?.store")
                    RouterLink.ip-t__data.ip-w-full.room.ip-dfw(:to="'/project/' + route.params.id + '/block/' + route.params.block + '/room/' + shop.id" :class="{reserved: shop.reserved, broned: shop.broned}") 
                        span {{ shop.float }} этаж
                        span(v-if="shop.broned") {{ shop.client.split(' ')[0] }} {{ shop.client.split(' ').length > 1 ? shop.client.split(' ')[1].slice(0, 1) : ''}}. {{ shop.client.split(' ').length > 2 ? shop.client.split(' ')[2].slice(0, 1) : '' }}.
                        //- span
                .ip-t__row(v-if="!project.places?.store || project.places?.store.length === 0")
                    .ip-t__data.ip-w-full.ip-dfw Нет данных

        .ip-container
            .ip-heading.ip-w-full.ip-mb-2  
                h2.title 
                    b Подвал
            .ip-table(v-if="project")
                .ip-t__row(v-for="(underground, idx) in project.places?.underground")
                    RouterLink.ip-t__data.ip-w-full.room.ip-dfw(:to="'/project/' + route.params.id + '/block/' + route.params.block + '/room/' + underground.id" :class="{reserved: underground.reserved, broned: underground.broned}") 
                        span {{ underground.float }} этаж
                        span(v-if="underground.broned") {{ underground.client.split(' ')[0] }} {{ underground.client.split(' ').length > 1 ? underground.client.split(' ')[1].slice(0, 1) : ''}}. {{ underground.client.split(' ').length > 2 ? underground.client.split(' ')[2].slice(0, 1) : '' }}.
                        //- span
                .ip-t__row(v-if="!project.places?.underground || project.places?.underground.length === 0")
                    .ip-t__data.ip-w-full.ip-dfw Нет данных
        
        .ip-container.ip-mb-2
            .ip-heading.ip-w-full.ip-mb-2  
                h2.title 
                    b Кладовые
            .ip-row(v-if="project")
                RouterLink.ip-col-2(v-for="(storage, idx) in project.places?.storage" :to="'/project/' + route.params.id + '/block/' + route.params.block + '/room/' + storage.id" )
                    .ip-storage(:class="{reserved: storage.reserved, broned: storage.broned}")
                        span.ip-icon 
                            //- storage icon
                            img(src="@/assets/storage.png" alt="storage")
                        span Кладовая №{{ storage.storage_number }} 
                        span(v-if="storage.broned") {{ storage.client.split(' ')[0] }} {{ storage.client.split(' ').length > 1 ? storage.client.split(' ')[1].slice(0, 1) : ''}}. {{ storage.client.split(' ').length > 2 ? storage.client.split(' ')[2].slice(0, 1) : '' }}.
                        //- span
            .ip-t__row(v-if="!project.places?.storage || project.places?.storage.length === 0")
                .ip-t__data.ip-w-full.ip-dfw Нет данных

        .ip-container
            .ip-heading.ip-w-full.ip-mb-2  
                h2.title 
                    b Парковочные места
            .ip-row.ip-dfw(v-if="project")
                RouterLink.ip-col-2(v-for="(parking, idx) in project.places?.parking" :to="'/project/' + route.params.id + '/block/' + route.params.block + '/room/' + parking.id" )
                    .ip-parking(:class="{reserved: parking.reserved, broned: parking.broned}")
                        span.ip-icon 
                            //- parking icon
                            img(src="@/assets/parking.svg" alt="parking")
                        span {{ parking.parking_number }} место
                        span(v-if="parking.broned") {{ parking.client.split(' ')[0] }} {{ parking.client.split(' ').length > 1 ? parking.client.split(' ')[1].slice(0, 1) : ''}}. {{ parking.client.split(' ').length > 2 ? parking.client.split(' ')[2].slice(0, 1) : '' }}.
                        //- span
            .ip-t__row(v-if="!project.places?.parking || project.places?.parking.length === 0")
                .ip-t__data.ip-w-full.ip-dfw Нет данных
        


        //- section.ip-modals
        //- .ip-modal(:class="isModalOpen")
        //-     form.ip-modal__container(@submit.prevent="createOrder()" :ref="form")
        //-     .ip-modal__header
        //-         h4 Продажа {{ saleType === 'shop' ? 'магазина' : saleType === 'parking' ? 'парковочного места' : saleType === 'storage' ? 'кладовой' : '' }}
        //-         svg(class="ip-modal__close" @click="isModalOpen = ''" width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg")
        //-             path(d="M1 22L22 1M22 22L1 1" stroke="#D65C10" stroke-opacity="0.61" stroke-width="2")
        //-     .ip-modal__content.ip-dfw
        //-         .ip-inp.modal-inp.ip-dfw
        //-             input( type="number" placeholder="Площадь (м²)" v-model="appartment_square" required)
        //-         .ip-inp.modal-inp.ip-dfw
        //-             input( type="number" placeholder="Цена (USD)" v-model="price" required)
        //-         .ip-inp.modal-inp.ip-dfw
        //-             input( type="number" placeholder="Первый взнос (%)" v-model="first_payment" required)
        //-         .ip-inp.modal-inp.ip-dfw
        //-             input( type="number" placeholder="Срок рассрочки (мес.)" v-model="installment" required)
        //-         .ip-inp.modal-inp.ip-dfw
        //-             input( type="number" placeholder="Курс USD" v-model="exchange_rate" required)
        //-         .ip-inp.modal-inp.ip-dfw
        //-             input( type="number" placeholder="Ежемесячный платёж (USD)" v-model="monthly_sum" required)
        //-         .ip-inp.modal-inp.ip-dfw
        //-             input( type="number" placeholder="Общая сумма (USD)" v-model="total_sum" required)
        //-         hr
        //-         .ip-inp.modal-inp.ip-dfw
        //-             input( placeholder="ФИО" v-model="counterparty.full_name" required)
        //-         .ip-inp.modal-inp.ip-dfw
        //-             input( placeholder="Серия Паспорта" v-model="counterparty.passport" maxlength="9" minlength="9" required @change="searchCounterParty")
        //-         .ip-inp.modal-inp.ip-dfw
        //-             input( placeholder="Место выдачи паспорта" v-model="counterparty.place_of_issue" required)
        //-         .ip-inp.modal-inp.ip-dfw
        //-             input( type="date" placeholder="Дата выдачи паспорта" v-model="counterparty.date_of_issue" required)
        //-         .ip-inp.modal-inp.ip-dfw
        //-             input( placeholder="Адрес" v-model="counterparty.address" required)
        //-         .ip-inp.modal-inp.ip-dfw
        //-             input( placeholder="Телефон" v-model="counterparty.phone" maxlength="9")
        //-         .ip-inp.modal-inp.ip-dfw.w-full
        //-             textarea( placeholder="Комментарий" col="1" rows="3" v-model="comment")
        //-     .ip-modal__footer
        //-         button.ip-dfw.ip-btn(type="submit") 
        //-             span Продать

</template>

<style scoped lang="scss">
.ip-table {
    display: flex;
    flex-direction: column;
    overflow: overlay;
    max-width: 100%;
    max-height: 90vh;
    margin-bottom: 10vh;

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

        a.ip-t__data {
            line-break: anywhere;
            background-color: #69cf4f;
            color: #000;
        }

        .ip-t__data {
            padding: 10px;
            width: 100%;
            min-height: 100px;
            justify-content: center;
            align-items: center;
            background-color: #d9d9d9;


            &.reserved {
                background-color: #faed62;
                color: #000;
            }

            &.broned {
                background-color: #cc6140;
                color: #fff;
            }

            &.room {
                cursor: pointer;
                transition: all .2s ease;

                &:hover {
                    // filter: brightness(0.95);
                    transform: scale(1.05);
                    box-shadow: 0 0 10px -3px #141414;
                    z-index: 1;
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

.ip-parking, .ip-storage {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 25px 20px;
    background-color: #f9f9f9;
    margin: 5px;
    cursor: pointer;
    transition: all .2s ease;
    color: #151e50;
    border: 1px solid #e1e1e1;
    border-radius: 8px;

    &:hover {
        // filter: brightness(0.95);
        transform: scale(1.05);
        box-shadow: 0 0 10px -3px #141414;
        z-index: 1;
    }

    &.reserved {
        background-color: #faed62;
        color: #000;
    }

    &.broned {
        background-color: #cc6140;
        color: #fff;
    }

    .ip-icon {
        width: 40px;
        height: 40px;
        margin-bottom: 10px;

        img {
            width: 100%;
            height: 100%;
        }
    }

    span {
        display: block;
        width: 100%;
        text-align: center;
    }
}

@media (max-width: 576px) {
    .right-slot {
        width: calc(100% - 45px);
    }
}
</style>