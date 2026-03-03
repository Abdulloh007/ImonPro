<script setup lang="ts">
import { useIndexStore } from '@/stores';
import { UseLoaderStore } from '@/stores/loader';
import { useToasterStore } from '@/stores/toaster';
import axios from 'axios';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Counterparty } from '@/models/couterparty';
import type { Payment } from '@/models/payment';
import type Currency from '@/models/currency';
import type { Apartment } from '@/models/apartment';
import { Capacitor } from '@capacitor/core';

interface OrderDetails {

}

const route = useRoute()
const router = useRouter()
const loaderStore = UseLoaderStore()
const toasterStore = useToasterStore()
const indexStore = useIndexStore()
const room = ref<Apartment>({
    id: '',
    name: '',
    project: '',
    block: '',
    room_count: 0,
    room_number: '',
    room_square: 0,
    room_plane: '',
    block_plane: '',
    client: null,
    description: '',
    order: '',
    currency_code: '840'
})
const room_square = ref<number>(0)
const price = ref<number>(0)
const installment = ref<number>(6)
const exchange_rate = ref<number>(1)
const first_payment = ref<number>(0)
const monthly_sum = ref<number>(0)
const total_sum = ref<number>(0)
const comment = ref<string>('')
const isModalOpen = ref<string>('')
const isPaymentModalOpen = ref<string>('')
const isSMSModalOpen = ref<string>('')
const payments_plan = ref<Payment[]>([])
const payment_sum = ref<number>(0)
const payment_currency = ref<Currency>({ code: '972', name: 'Сомони', symbol: 'TJS' })
const payment_base = ref<string | null>('')

const currencies = ref<Currency[]>([
    { code: '840', name: 'Доллар', symbol: '$' },
    { code: '978', name: 'Евро', symbol: '€' },
    { code: '643', name: 'Рубль', symbol: '₽' },
    { code: '392', name: 'Иена', symbol: '¥' },
    { code: '826', name: 'Фунт', symbol: '£' },
    { code: '156', name: 'Юань', symbol: '¥' },
    { code: '972', name: 'Сомони', symbol: 'TJS' }
])

const counterparty = ref<Counterparty>({
    full_name: '',
    address: '',
    passport: 'A',
    date_of_issue: '',
    place_of_issue: '',
    inn: '',
    phone: '',
    id: null,
    another_phone: false,
})

const role = ref<any>({
    degree: 999,
    name: ''
})

const sms_templates = ref<{ id: number, name: string, text:     string }[]>([])
const sms_form = ref<{ phone: string, message: string }>({ phone: '', message: ''})

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
            room.value.description = room.value.description.replace("\u000B", "&nbsp;&nbsp;&nbsp;&nbsp;")
            room.value.description = room.value.description.replace("\r", "<br/>")
            room.value.currency_code = '840'
            room_square.value = room.value.room_square
            if (room.value.client) {
                counterparty.value = room.value.client

                sms_form.value.phone = counterparty.value.phone || ''
                sms_form.value.message = `Уважаемый(ая) ${ counterparty.value.full_name }, Ваш заказ на квартиру ${ room.value.name } в проекте ${ room.value.project } успешно оформлен. С уважением, Toj Fayz.` 

                getPaymentsPlan()
                getSMSTemplates()
            }
        })
        .catch(err => toasterStore.add({
            title: err.code,
            descr: err.message,
            type: 'danger'
        }))
        .finally(() => loaderStore.isActive = false)
})

function calcSum() {
    monthly_sum.value = parseFloat((((room_square.value * price.value) - first_payment.value) / installment.value).toFixed(2))
    total_sum.value = parseFloat((room_square.value * price.value).toFixed(2))
}

function calcInstallment() {
    installment.value = parseFloat((((room_square.value * price.value) - first_payment.value) / monthly_sum.value).toFixed(2))
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
    return axios.post(indexStore.apiHref + '/api/counterparties', {...counterparty.value, currency_code: room.value.currency_code}, {
        headers: {
            'Authorization': 'Basic ' + indexStore.token
        }
    })
        .then(res => {
            counterparty.value = res.data
            
            sms_form.value.phone = counterparty.value.phone || ''
            sms_form.value.message = `Уважаемый(ая) ${ counterparty.value.full_name }, Ваш заказ на квартиру ${ room.value.name } в проекте ${ room.value.project } успешно оформлен. С уважением, IMON GROUP.` 

            room.value.client = counterparty.value
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
            total_sum: total_sum.value,
            installment: installment.value
        },
        comment: comment.value
    }, {
        headers: {
            'Authorization': 'Basic ' + indexStore.token
        }
    })
        .then(res => {
            // router.push('/project/' + route.params.project + '/block/' + route.params.block)
            sendSMS(() => location.reload())
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
    axios.get(indexStore.apiHref + '/api/order-contract/' + room.value?.client?.order, {
        headers: {
            'Authorization': 'Basic ' + indexStore.token
        },
        responseType: 'blob'
    })
        .then(res => {
            const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.style.display = 'none'
            a.download = counterparty.value.full_name + '.docx'
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

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

function checkFields() {
    if (room_square.value === 0) {
        toasterStore.add({
            title: 'Ошибка',
            descr: 'Площадь незаполнена или равна 0',
            type: 'danger'
        })
        return false
    }
    if (price.value === 0) {
        toasterStore.add({
            title: 'Ошибка',
            descr: 'Цена незаполнена или равна 0',
            type: 'danger'
        })
        return false
    }
    if (installment.value === 0) {
        toasterStore.add({
            title: 'Ошибка',
            descr: 'Рассрочка незаполнена или равна 0',
            type: 'danger'
        })
        return false
    }
    if (exchange_rate.value === 0) {
        toasterStore.add({
            title: 'Ошибка',
            descr: 'Курс незаполнен или равен 0',
            type: 'danger'
        })
        return false
    }
    if (total_sum.value === 0) {
        toasterStore.add({
            title: 'Ошибка',
            descr: 'Сумма равна 0. Пожалуйста правильно заполните поля',
            type: 'danger'
        })
        return false
    }
    return true
}

function checkFieldsPayment() {
    // if (payment_base.value === null) {
    //     toasterStore.add({
    //         title: 'Ошибка',
    //         descr: 'Основание незаполнено',
    //         type: 'danger'
    //     })
    //     return false
    // }
    if (payment_sum.value === 0) {
        toasterStore.add({
            title: 'Ошибка',
            descr: 'Сумма незаполнена или равна 0',
            type: 'danger'
        })
        return false
    }
    if (payment_currency.value === null) {
        toasterStore.add({
            title: 'Ошибка',
            descr: 'Валюта незаполнена',
            type: 'danger'
        })
        return false
    }
    return true
}

function getPaymentsPlan() {
    loaderStore.isActive = true
    axios.post(Capacitor.isNativePlatform() ? indexStore.apiHref + '/api/payments/' + room.value?.client?.order : '/api/payments/' + room.value?.client?.order, {id: room.value?.client?.order, date: room.value?.client?.order_date} , {
        headers: {
            'Authorization': 'Basic ' + indexStore.token
        }
    })
        .then(res => payments_plan.value = res.data.filter((p: any) => p.paid < p.sum))
        .catch(err => toasterStore.add({
            title: err.code,
            descr: err.message,
            type: 'danger'
        }))
        .finally(() => loaderStore.isActive = false)
}

function getSMSTemplates() {
    loaderStore.isActive = true
    axios.get(Capacitor.isNativePlatform() ? indexStore.apiHref + '/api/sms-templates' : '/api/sms-templates', {
        headers: {
            'Authorization': 'Basic ' + indexStore.token
        }
    })
        .then(res => sms_templates.value = res.data)
        .catch(err => toasterStore.add({
            title: err.code,
            descr: err.message,
            type: 'danger'
        }))
        .finally(() => loaderStore.isActive = false)
}

function setSelectedTemplate(id: string) {
    const template = sms_templates.value.find(t => t.id.toString() === id)
    if (template) {
            sms_form.value.message = template.text
    }
}

function sendSMS(callback?: () => void) {
    loaderStore.isActive = true
    axios.post(Capacitor.isNativePlatform() ? indexStore.apiHref + '/api/sms' : '/api/sms',  sms_form.value, {
        headers: {
            'Authorization': 'Basic ' + indexStore.token
        }
    })
        .then(() => {
            toasterStore.add({
                title: 'Успех',
                descr: 'SMS успешно отправлено',
                type: 'success'
            })
            callback ? callback() : null
        })
        .catch(err => toasterStore.add({
            title: err.code,
            descr: err.message,
            type: 'danger'
        }))
        .finally(() => loaderStore.isActive = false)
}

function createPayment() {
    if (!checkFieldsPayment()) {
        return
    }
    isPaymentModalOpen.value = ''
    loaderStore.isActive = true
    axios.post(indexStore.apiHref + '/api/income', {
        id: null,
        order: room.value.order,
        date: new Date().toISOString(),
        sum: payment_sum.value,
        currency: payment_currency.value,
        base: payment_base.value,
        client: room.value.client
    }, {
        headers: {
            'Authorization': 'Basic ' + indexStore.token
        }
    })
        .then(res => {
            payment_base.value = ''
            payment_sum.value = 0
            payment_currency.value = { code: '972', name: 'Сомони', symbol: 'TJS' }

            getPaymentsPlan()

            const blobData = atob(res.data.bill);
            const uintArray = new Uint8Array(blobData.length);
            for (let i = 0; i < blobData.length; i++) {
                uintArray[i] = blobData.charCodeAt(i);
            }
            const blob = new Blob([uintArray], { type: 'application/pdf' });
            const pdfUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = pdfUrl;
            a.style.display = 'none';
            a.download = res.data.name + '.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(pdfUrl);
        })
        .catch(err => toasterStore.add({
            title: err.code,
            descr: err.message,
            type: 'danger'
        }))
        .finally(() => loaderStore.isActive = false)
}

function getCurrencySymboll() {
    return currencies.value.find(item => item.code === room.value.currency_code)?.symbol
}

</script>

<template lang="pug">
main.ip-main 
    section.header
        .ip-container.ip-dfw
            .left-slot.ip-dfw
                RouterLink.ip-btn__back(:to="'/project/' + $route.params.project + ($route.params.block ? '/block/' + $route.params.block : '/parking')")
                    svg(width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg")
                        path(d="M15 4.5L7 12.5L15 20.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round")
                .ip-heading
                    h2.title "{{ room.project }}"
                    .bread-crumbs.ip-dfw
                        RouterLink(to='/') Все проекты
                        span >
                        RouterLink(:to="'/project/' + $route.params.project") {{ room.project }}
                        span(v-if="$route.params.block") >
                        RouterLink(v-if="$route.params.block" :to="'/project/' + $route.params.project + '/block/' + $route.params.block") Блок {{ room.block }}
                        span(v-if="room.client") >
                        button.ip-btn.ip-btn_danger(@click="isModalOpen = 'active'" v-if="room.client")  {{ counterparty.name}}
            .right-slot.ip-dfw
                button.ip-btn.ip-btn_info(@click="printScreent()" type="button" ) Печать
                button.ip-btn.ip-btn_info(@click="printContract()" type="button" v-if="room.client") Печать Договора
                button.ip-btn.ip-btn_warn(@click="rezerveRoom()" type="button" v-if="!room.client && role.degree < 3" ) Резервировать
                button.ip-btn(@click="checkFields() ? isModalOpen = 'active' : ''" type="button" v-if="!room.client && role.degree < 3") Продать
                button.ip-btn(@click="isPaymentModalOpen = 'active'" type="button" v-if="room.client && role.degree < 3") Оплата
                button.ip-btn(@click="isSMSModalOpen = 'active'" type="button" v-if="room.client && role.degree < 3") 
                    svg(width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg")
                        path(d="M22 2L11 13M22 2L15.5 22L11 13L2 9L22 2Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round")
    section.ip-room
        .ip-container.ip-dfw
            .ip-row
                .ip-col-12.ip-room__plan
                    h4 {{ room.name }}
                    img(:src="room.room_plane !== null && room.room_plane !== undefined && room.room_plane !== '' ? 'data:image;base64,' + room.room_plane : '/default.png'" alt="План квартиры")
                //- .ip-col-6.ip-room__plan__descr
                //-     p(v-html="room.description")
            .ip-row
                .ip-col-6.ip-room__calc.ip-dfw
                    h4 Общие сведения
                    .ip-inp.ip-dfw(symbol="")
                        label Валюта
                        select(v-model="room.currency_code" required)
                            option(v-for="currency in currencies" :key="currency.code" :value="currency.code") {{ currency.name }}
                    .ip-inp.ip-dfw(symbol="m²" style="pointer-events: none;")
                        label Площадь
                        input(v-model="room_square" )
                    .ip-inp.ip-dfw(:symbol="getCurrencySymboll()")
                        label(for="price") Цена
                        input#price(type="number" v-model="price" @change="calcSum()" @focus="(e) => e.target.value == '0' ? e.target.value = '' : null")
                    .ip-inp.ip-dfw(symbol="мес")
                        label(for="installment") Рассрочка
                        input#installment(type="number" v-model="installment" @change="calcSum()" @focus="(e) => e.target.value == '0' ? e.target.value = '' : null")
                    .ip-inp.ip-dfw(symbol="")
                        label(for="exchange_rate") Курс
                        input#exchange_rate(type="number" v-model="exchange_rate" @change="calcSum()" @focus="(e) => e.target.value == '0' ? e.target.value = '' : null")
                    .ip-inp.ip-dfw(:symbol="getCurrencySymboll()")
                        label(for="first_payment") Первый взнос
                        input#first_payment(type="number" v-model="first_payment" @change="calcSum()" @focus="(e) => e.target.value == '0' ? e.target.value = '' : null")
                    .ip-inp.ip-dfw(:symbol="getCurrencySymboll()" style="pointer-events: none;")
                        label(for="total_sum") Сумма
                        input#total_sum(type="number" v-model="total_sum")
                    .ip-inp.ip-dfw(:symbol="getCurrencySymboll()")
                        label(for="total_sum") Ежемесячная Оплата
                        input#total_sum(type="number" v-model="monthly_sum" @change="calcInstallment()" @focus="(e) => e.target.value == '0' ? e.target.value = '' : null")
                .ip-col-6.ip-room__whole__plane
                    img(:src="room.block_plane !== null && room.block_plane !== undefined && room.block_plane !== '' ? 'data:image;base64,' + room.block_plane : '/default.png'" alt="План блока")

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
                .ip-inp.modal-inp.ip-dfw
                    input(:disabled="room.client" placeholder="ИНН" v-model="counterparty.inn" maxlength="9" minlength="9" required)
                .ip-inp.modal-inp.ip-dfw.w-full
                    textarea(:disabled="room.client" placeholder="Комментарий" col="1" rows="3" v-model="comment")
            .ip-modal__footer
                button.ip-dfw.ip-btn(type="submit" v-if="!room.client") 
                    span Продать
    
    .ip-modal(:class="isPaymentModalOpen")
        .ip-modal__container
            .ip-modal__header
                h4 Оплата
                svg(class="ip-modal__close" @click="isPaymentModalOpen = ''" width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg")
                    path(d="M1 22L22 1M22 22L1 1" stroke="#D65C10" stroke-opacity="0.61" stroke-width="2")
            .ip-modal__content.ip-dfw
                .ip-inp.ip-dfw.w-full
                    label Основание
                    select(v-model="payment_base" required)
                        option(value="" disabled selected) Выберите основание
                        option(v-for="payment in payments_plan" :key="payment.id" :value="payment.id") {{ payment.sum }} {{ payment.currency }} от {{ new Date(payment.date).toLocaleDateString() }} выплачено: {{ payment.paid }}
                .ip-inp.ip-dfw.w-full
                    label Сумма
                    input(v-model="payment_sum" type="number" @focus="(e) => e.target.value == '0' ? e.target.value = '' : null" value="0" required)
                .ip-inp.ip-dfw.w-full
                    label Валюта
                    select(v-model="payment_currency" required)
                        option(v-for="currency in currencies" :key="currency.code" :value="currency") {{ currency.name }}
            .ip-modal__footer
                button.ip-dfw.ip-btn(@click="createPayment()" type="button") 
                    span Закрыть
        
    .ip-modal(:class="isSMSModalOpen")
        .ip-modal__container
            .ip-modal__header
                h4 Отправить SMS
                svg(class="ip-modal__close" @click="isSMSModalOpen = ''" width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg")
                    path(d="M1 22L22 1M22 22L1 1" stroke="#D65C10" stroke-opacity="0.61" stroke-width="2")
            .ip-modal__content.ip-dfw
                .ip-inp.ip-dfw.w-full
                    label Телефон
                    input(:value="sms_form.phone" type="text" :disabled="!counterparty.another_phone")
                .ip-inp.ip-dfw.w-full
                    label Другой Телефон
                    input(type="checkbox" v-model="counterparty.another_phone") 
                    span Отправить на другой номер
                .ip-inp.ip-dfw.w-full
                    label Сообщение
                    textarea(col="1" rows="5" v-model="sms_form.message" placeholder="Введите сообщение сюда..." ) 
                .ip-inp.ip-dfw.w-full
                    label Шаблоны
                    select(@change="(e) => setSelectedTemplate(e.target.value)")
                        option(value="" disabled selected) Выберите шаблон
                        option(value="1" v-for="n in sms_templates") {{ n.name }}
                    
            .ip-modal__footer
                button.ip-dfw.ip-btn(@click="sendSMS()" type="button") 
                    span Отправить
                button.ip-dfw.ip-col-6.ip-btn.ip-btn_info(@click="isSMSModalOpen = ''" type="button") 
                    span Закрыть

</template>

<style scoped lang="scss">
.header .right-slot *:not(:last-child) {
    margin-right: 15px;
}

.ip-room__plan {

    img {
        width: 100%;
        height: 45vh;
        object-fit: contain;
    }
}

.ip-room__whole__plane {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 40vh;

    img {
        width: 100%;
        height: 100%;
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
    .ip-row.reverse {
        flex-direction: column-reverse;
    }

    .ip-room__calc {
        margin-top: 20px;
    }

}
</style>