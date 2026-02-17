<script setup lang="ts">
import { useIndexStore } from '@/stores';
import { UseLoaderStore } from '@/stores/loader';
import { useToasterStore } from '@/stores/toaster';
import axios from 'axios';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute()
const router = useRouter()
const loaderStore = UseLoaderStore()
const toasterStore = useToasterStore()
const indexStore = useIndexStore()

</script>

<template lang="pug">
main.ip-main 
    section.header
        .ip-container.ip-dfw
            .left-slot.ip-dfw
                RouterLink.ip-btn__back(:to="'/project/' + $route.params.project + '/block/' + $route.params.block")
                    svg(width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg")
                        path(d="M15 4.5L7 12.5L15 20.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round")
                .ip-heading
                    h2.title "{{ room.project }}"
                    .bread-crumbs.ip-dfw
                        RouterLink(to='/') Все проекты
                        span >
                        RouterLink(:to="'/project/' + $route.params.project") {{ room.project }}
                        span >
                        RouterLink(:to="'/project/' + $route.params.project + '/block/' + $route.params.block") Блок {{ room.block }}
                        span(v-if="room.client") >
                        button.ip-btn.ip-btn_danger(@click="isModalOpen = 'active'" v-if="room.client")  {{ counterparty.name}}
            .right-slot.ip-dfw
                //- button.ip-btn.ip-btn_info(@click="printScreent()" type="button" ) Печать
                //- button.ip-btn.ip-btn_info(@click="printContract()" type="button" v-if="room.client") Печать Договора
                //- button.ip-btn.ip-btn_warn(@click="rezerveRoom()" type="button" v-if="!room.client && role.degree < 3" ) Резервировать
                //- button.ip-btn(@click="checkFields() ? isModalOpen = 'active' : ''" type="button" v-if="!room.client && role.degree < 3") Продать
                //- button.ip-btn(@click="isPaymentModalOpen = 'active'" type="button" v-if="room.client && role.degree < 3") Оплата
                //- button.ip-btn(@click="isSMSModalOpen = 'active'" type="button" v-if="room.client && role.degree < 3") 
                //-     svg(width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg")
                //-         path(d="M22 2L11 13M22 2L15.5 22L11 13L2 9L22 2Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round")



</template>

<style scoped>

</style>