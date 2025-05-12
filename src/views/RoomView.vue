<script setup lang="ts">
import { useIndexStore } from '@/stores';
import { UseLoaderStore } from '@/stores/loader';
import { useToasterStore } from '@/stores/toaster';
import axios from 'axios';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

interface Counterparty {
    id: string | null;
    name?: string
    full_name: string;
    address: string;
    passport: string;
    date_of_issue: string | Date;
    place_of_issue: string;
    phone?: string;
}

interface OrderDetails {

}

const route = useRoute()
const router = useRouter()
const loaderStore = UseLoaderStore()
const toasterStore = useToasterStore()
const indexStore = useIndexStore()
const room = ref<any>({})
const room_square = ref<number>(0)
const price = ref<number>(0)
const installment = ref<number>(6)
const exchange_rate = ref<number | string>(0)
const first_payment = ref<number>(0)
const monthly_sum = ref<number | string>(0)
const total_sum = ref<number | string>(0)
const comment = ref<string>('')
const isModalOpen = ref<string>('')

const counterparty = ref<Counterparty>({
    full_name: '',
    address: '',
    passport: 'A',
    date_of_issue: '',
    place_of_issue: '',
    id: null
})

const role = ref<any>({
    degree: 999,
    name: ''
})

const OrderDetails = ref<OrderDetails>()

onMounted(() => {
    role.value = JSON.parse(localStorage.getItem('ip_role') || '{"name":"","degree":999}')   
    loaderStore.isActive = true
    axios.get(indexStore.apiHref + '/api/room/' + route.params.id, {
        headers: {
            'Authorization': 'Basic ' + indexStore.token
        }
    })
        .then(res => {
            room.value = res.data
            room.value.description = room.value.description.replaceAll("\u000B", "&nbsp;&nbsp;&nbsp;&nbsp;")
            room.value.description = room.value.description.replaceAll("\r", "<br/>")
            room_square.value = room.value.room_square
            room.value.client ? counterparty.value = room.value.client : ''
        })
        .catch(err => toasterStore.add({
            title: err.code,
            descr: err.message,
            type: 'danger'
        }))
        .finally(() => loaderStore.isActive = false)
})

function calcSum() {
    monthly_sum.value = (((room_square.value * price.value) - first_payment.value) / installment.value).toFixed(2)
    total_sum.value = (room_square.value * price.value).toFixed(2)
}

function searchCounterParty() {
    loaderStore.isActive = true
    axios.get(indexStore.apiHref + '/api/counterparty/' + counterparty.value.passport, {
        headers: {
            'Authorization': 'Basic ' + indexStore.token
        }
    })
        .then(res => {
            counterparty.value = res.data
            console.log(counterparty);

        })
        .catch(err => toasterStore.add({
            title: err.code,
            descr: err.message,
            type: 'danger'
        }))
        .finally(() => loaderStore.isActive = false)
}

function createCounterParty() {
    loaderStore.isActive = true
    return axios.post(indexStore.apiHref + '/api/counterparties', counterparty.value, {
        headers: {
            'Authorization': 'Basic ' + indexStore.token
        }
    })
        .then(res => {
            counterparty.value = res.data
        })
        .catch(err => toasterStore.add({
            title: err.code,
            descr: err.message,
            type: 'danger'
        }))
        .finally(() => loaderStore.isActive = false)
}

async function createOrder() {
    if (counterparty.value.id === null) {
        await createCounterParty()
    }
    loaderStore.isActive = true
    axios.post(indexStore.apiHref + '/api/orders', {
        id: null,
        client: counterparty.value,
        room: {
            ...room.value,
            price: price.value,
            first_payment: first_payment.value,
            exchange_rate: exchange_rate.value,
            monthly_sum: monthly_sum.value,
            total_sum: total_sum.value
        },
        comment: comment.value
    }, {
        headers: {
            'Authorization': 'Basic ' + indexStore.token
        }
    })
        .then(res => {
            // router.push('/project/' + route.params.project + '/block/' + route.params.block)
            location.reload()
        })
        .catch(err => toasterStore.add({
            title: err.code,
            descr: err.message,
            type: 'danger'
        }))
        .finally(() => loaderStore.isActive = false)
}

function printScreent() {
    window.print()
}

function printContract() {
    loaderStore.isActive = true
    axios.get(indexStore.apiHref + '/api/order-contract/' + room.value.client.order, {
        headers: {
            'Authorization': 'Basic ' + indexStore.token
        }
    })
        .then(res => {
            // router.push('/project/' + route.params.project + '/block/' + route.params.block)
            // location.reload()
        })
        .catch(err => toasterStore.add({
            title: err.code,
            descr: err.message,
            type: 'danger'
        }))
        .finally(() => loaderStore.isActive = false)
}

function rezerveRoom() {
    loaderStore.isActive = true
    axios.get(indexStore.apiHref + '/api/rezerve/' + route.params.id, {
        headers: {
            'Authorization': 'Basic ' + indexStore.token
        }
    })
        .then(res => {
            router.push('/project/' + route.params.project + '/block/' + route.params.block)
        })
        .catch(err => toasterStore.add({
            title: err.code,
            descr: err.message,
            type: 'danger'
        }))
        .finally(() => loaderStore.isActive = false)
}

</script>

<template lang="pug">
main.ip-main 
    section.header
        .ip-container.ip-dfw
            .left-slot
                RouterLink.ip-btn__back(:to="'/project/' + $route.params.project + '/block/' + $route.params.block")
                    svg(width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg")
                        path(d="M15 4.5L7 12.5L15 20.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round")
            .right-slot
                h2.title "{{ room.project }}"
                .bread-crumbs.ip-dfw
                    RouterLink(to='/') Все проекты
                    span >
                    RouterLink(:to="'/project/' + $route.params.project") {{ room.project }}
                    span >
                    RouterLink(:to="'/project/' + $route.params.project + '/block/' + $route.params.block") Блок {{ room.block }}
                    span >
                    button.ip-btn.ip-btn_danger(@click="isModalOpen = 'active'" v-if="room.client")  {{ counterparty.name}}
            .end-slot.ip-dfw
                button.ip-btn.ip-btn_info(@click="printScreent()" type="button" ) Печать
                button.ip-btn.ip-btn_info(@click="printContract()" type="button" v-if="room.client") Печать Договора
                //- button.ip-btn.ip-btn_warn(@click="rezerveRoom()" type="button" ) Резервировать
                button.ip-btn(@click="isModalOpen = 'active'" type="button" v-if="!room.client && role.degree < 3") Продать
    section.ip-room
        .ip-container.ip-dfw
            .ip-row
                .ip-col-12.ip-room__plan
                    h4 {{ room.name }}
                    img(:src="room.room_plane !== null && room.room_plane !== undefined && room.room_plane !== '' ? 'data:image;base64,' + room.room_plane : ''")
                //- .ip-col-6.ip-room__plan__descr
                //-     p(v-html="room.description")
            .ip-row
                .ip-col-6.ip-room__calc.ip-dfw
                    h4 Общие сведения
                    .ip-inp.ip-dfw(symbol="m²" style="pointer-events: none;")
                        label Площадь
                        input(v-model="room_square" )
                    .ip-inp.ip-dfw(symbol="$")
                        label(for="price") Цена
                        input#price(type="number" v-model="price" @change="calcSum()" @focus="(e) => e.target.value == '0' ? e.target.value = '' : null")
                    .ip-inp.ip-dfw(symbol="мес")
                        label(for="installment") Рассрочка
                        input#installment(type="number" v-model="installment" @change="calcSum()" @focus="(e) => e.target.value == '0' ? e.target.value = '' : null")
                    .ip-inp.ip-dfw(symbol="")
                        label(for="exchange_rate") Курс
                        input#exchange_rate(type="number" v-model="exchange_rate" @change="calcSum()" @focus="(e) => e.target.value == '0' ? e.target.value = '' : null")
                    .ip-inp.ip-dfw(symbol="$")
                        label(for="first_payment") Первый взнос
                        input#first_payment(type="number" v-model="first_payment" @change="calcSum()" @focus="(e) => e.target.value == '0' ? e.target.value = '' : null")
                    .ip-inp.ip-dfw(symbol="$" style="pointer-events: none;")
                        label(for="total_sum") Сумма
                        input#total_sum(type="number" v-model="total_sum")
                    .ip-inp.ip-dfw(symbol="$" style="pointer-events: none;")
                        label(for="total_sum") Ежемесячная Оплата
                        input#total_sum(type="number" v-model="monthly_sum")
                .ip-col-6
                    img(:src="room.block_plane !== null && room.block_plane !== undefined && room.block_plane !== '' ? 'data:image;base64,' + room.block_plane : ''")

    .ip-modal(:class="isModalOpen")
        form.ip-modal__container(@submit.prevent="createOrder()" :ref="form")
            .ip-modal__header
                h4 {{room.client ? room.name: 'Новая продажа'}}
                svg(class="ip-modal__close" @click="isModalOpen = ''" width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg")
                    path(d="M1 22L22 1M22 22L1 1" stroke="#D65C10" stroke-opacity="0.61" stroke-width="2")
            .ip-modal__content.ip-dfw
                .ip-inp.modal-inp.ip-dfw
                    input(:disabled="room.client" placeholder="ФИО" v-model="counterparty.full_name" required)
                .ip-inp.modal-inp.ip-dfw
                    input(:disabled="room.client" placeholder="Серия Паспорта" v-model="counterparty.passport" maxlength="9" minlength="9" required @change="searchCounterParty")
                .ip-inp.modal-inp.ip-dfw
                    input(:disabled="room.client" placeholder="Место выдачи паспорта" v-model="counterparty.place_of_issue" required)
                .ip-inp.modal-inp.ip-dfw
                    input(:disabled="room.client" type="date" placeholder="Дата выдачи паспорта" v-model="counterparty.date_of_issue" required)
                .ip-inp.modal-inp.ip-dfw
                    input(:disabled="room.client" placeholder="Адрес" v-model="counterparty.address" required)
                .ip-inp.modal-inp.ip-dfw
                    input(:disabled="room.client" placeholder="Телефон" v-model="counterparty.phone" maxlength="9")
                .ip-inp.modal-inp.ip-dfw.w-full
                    textarea(:disabled="room.client" placeholder="Комментарий" col="1" rows="3" v-model="comment")
            .ip-modal__footer
                button.ip-dfw.ip-btn(type="submit" v-if="!room.client") 
                    span Продать

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

    .end-slot {
        margin-left: auto;
        align-items: center;

        & *:not(:last-child) {
            margin-right: 15px;
        }
    }
}

.ip-col-12 {
    width: 100%;
}

.ip-col-6 {
    width: 50%;
}

.ip-room {

    img {
        width: 100%;
        height: 50vh;
        object-fit: contain;
    }
}

.ip-room__plan__descr {
    padding-left: 5%;
}

.ip-room__plan h4,
.ip-room__calc h4 {
    width: 100%;
    font-weight: 600;
    font-size: 24px;
    margin-bottom: 20px;
}

.ip-room__calc {
    align-content: center;

    .ip-inp {
        width: 100%;
        margin-bottom: 15px;
        font-size: 18px;

        &::after {
            content: attr(symbol);
        }

        label {
            width: 40%;
            display: block;
        }

        input {
            width: 40%;
            border: none;
            border-bottom: 1px solid #e1e1e1;
            font-size: 18px;
            text-align: end;
            outline: none;

        }
    }
}

.ip-room .ip-container .ip-row:first-child {
    margin-bottom: 20px;
}

@media print {
    .header {
        display: none;
    }
    body {
        width: 1200px;
    }
}

@media (max-width: 576px) {
    .ip-col-6 {
        width: 100%;
    }

    .ip-row.reverse {
        flex-direction: column-reverse;
    }
}
</style>