<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Navigation from '../components/Navigation.vue'
import ProjectList from '../components/ProjectList.vue'
import axios from 'axios';
import { useIndexStore } from '@/stores';
import { UseLoaderStore } from '@/stores/loader';
import { useToasterStore } from '@/stores/toaster';
import type { Server } from '@/models/server'
import { Capacitor } from '@capacitor/core'

const projectsListRef = ref<any[]>([])
const store = useIndexStore()
const loaderStore = UseLoaderStore()
const toasterStore = useToasterStore()
const indexStore = useIndexStore()
const isModalOpen = ref<string>('')
const newServer = ref<Server>({
    link: '',
    login: '',
    password: '',
    token: ''
})

onMounted(() => {
    indexStore.servers.map(item => {
        loaderStore.isActive = true
        axios.get(item.link + '/api/projects', {
            headers: {
                'Authorization': 'Basic ' + item.token
            }
        }).then(res => projectsListRef.value = [...projectsListRef.value, ...res.data.map((it: any) => {return {...it, server: item}})])
        .catch(err => toasterStore.add({
            title: err.code,
            descr: err.message,
            type: 'danger'
        }))
        .finally(() => {loaderStore.isActive = false; console.log(projectsListRef.value);
        })
    })
})

function addServer() {
    loaderStore.isActive = true
    newServer.value.token = indexStore.UTF8TextToBase64(newServer.value.login + ':' + newServer.value.password)
    indexStore.newServer(newServer.value)
    location.reload()
}

</script>

<template lang="pug">
main.ip-main 
    section.header
        .ip-container.ip-dfw.ip-justify-content-between.ip-align-items-center
            .left-slot
                h2.title Проекты
                .bread-crumbs
                    RouterLink Все проекты
            .right-slot.ip-dfw
                button.ip-btn.ip-light-primary(@click="isModalOpen = 'active'" type="button")
                    span Добавить
                    svg(width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg")
                        path(d="M12 7V17M7 12L17 12" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round")
    ProjectList(:list="projectsListRef")
    Navigation  
    .ip-modal(:class="isModalOpen")
        form.ip-modal__container(@submit.prevent="addServer()" :ref="form")
            .ip-modal__header
                h4 Добавить сервер
                svg(class="ip-modal__close" @click="isModalOpen = ''" width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg")
                    path(d="M1 22L22 1M22 22L1 1" stroke="#D65C10" stroke-opacity="0.61" stroke-width="2")
            .ip-modal__content.ip-dfw
                .ip-inp.modal-inp.ip-dfw.w-full
                    input(placeholder="Сервер" v-model="newServer.link" required)
                .ip-inp.modal-inp.ip-dfw.w-full
                    input(placeholder="Логин" v-model="newServer.login" required)
                .ip-inp.modal-inp.ip-dfw.w-full
                    input(placeholder="Пароль" type="password" v-model="newServer.password" required)
            .ip-modal__footer
                button.ip-dfw.ip-btn(type="submit") 
                    span Добавить
</template>

<style scoped lang="scss">

</style>