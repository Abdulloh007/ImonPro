<script setup lang="ts">

import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { UseLoaderStore } from '@/stores/loader';
import { useToasterStore } from '@/stores/toaster';
import { useIndexStore } from '@/stores';
import axios from 'axios';

const servers = ref<any>([])
const route = useRoute()
const loaderStore = UseLoaderStore()
const toasterStore = useToasterStore()
const indexStore = useIndexStore()
const selectedServer = ref<any>({})

const isModalOpen = ref<string>('')

onMounted(() => {
    loaderStore.isActive = true
    servers.value = JSON.parse(localStorage.getItem('ip_servers') || '[]')
    loaderStore.isActive = false
    if (servers.value.length == 0) {
        toasterStore.add({
            title: 'Ошибка',
            descr: 'Список серверов пуст',
            type: 'info'
        })
    }
    else {
        servers.value = servers.value.map((server: any) => {
            return {
                ...server,
                link: server.link.replace('https://', '').replace('http://', '')
            }
        })
    }

})

function copyLink(link: string) {
    navigator.clipboard.writeText(link).then(() => {
        toasterStore.add({
            title: 'Скопировано',
            descr: 'Ссылка на сервер скопирована в буфер обмена',
            type: 'success'
        })
    }).catch(err => {
        toasterStore.add({
            title: 'Ошибка',
            descr: err.message,
            type: 'danger'
        })
    })
}

function openModal(server: any) {
    isModalOpen.value = 'active'
    let newServerList = servers.value.filter((item: any) => item.link != server.link)
    selectedServer.value = server
    servers.value = newServerList
}
function save() {
    if (selectedServer.value.link && selectedServer.value.login && selectedServer.value.password) {
        servers.value = servers.value.filter((item: any) => item.link != selectedServer.value.link)
        selectedServer.value.token = indexStore.UTF8TextToBase64(selectedServer.value.login + ':' + selectedServer.value.password)
        servers.value.push(selectedServer.value)
        localStorage.setItem('ip_servers', JSON.stringify(servers.value))
        selectedServer.value = {}
        toasterStore.add({
            title: 'Успех',
            descr: 'Сервер успешно сохранен',
            type: 'success'
        })
        closeModal()
    }
    else {
        toasterStore.add({
            title: 'Ошибка',
            descr: 'Заполните все поля',
            type: 'danger'
        })
    }
}
function deleteServer() {
    servers.value = servers.value.filter((item: any) => item.link != selectedServer.value.link)
    localStorage.setItem('ip_servers', JSON.stringify(servers.value))
    toasterStore.add({
        title: 'Успех',
        descr: 'Сервер успешно удален',
        type: 'success'
    })
    closeModal()
}
function closeModal() {
    isModalOpen.value = ''
}
</script>

<template lang="pug">

main.ip-main
    section.header
        .ip-container.ip-dfw.ip-justify-content-between.ip-align-items-center
            .left-slot
                h2.title Серверы
                .bread-crumbs
                    RouterLink(to='/') Все проекты
            //- .right-slot.ip-dfw
            //-     button.ip-btn.ip-btn_danger(@click="exit()") Выход

    section.ip-settings
        .ip-container.ip-dfw
            ul.ip-settings
                li.ip-settings__item(v-for="server in servers" @click="openModal(server)") {{ server.link }}
    
    .ip-modal(:class="isModalOpen")
        .ip-modal__container
            .ip-modal__header
                h2.title Серверы
                //- button.ip-btn__close(@click="closeModal()")
            form.ip-modal__content
                .ip-inp.modal-inp
                    input(type="text" v-model="selectedServer.link" placeholder="Ссылка на сервер")
                .ip-inp.modal-inp
                    input(type="text" v-model="selectedServer.login" placeholder="Логин")
                .ip-inp.modal-inp  
                    input(type="password" v-model="selectedServer.password" placeholder="Пароль")
                //- p {{ selectedServer.link }}
                //- button.ip-btn(@click="copyLink(selectedServer.link)") Скопировать ссылку
            .ip-modal__footer
                button.ip-btn(@click="save()") Сохранить
                button.ip-btn.ip-btn_warn(@click="closeModal()") Закрыть
                button.ip-btn.ip-btn_danger(@click="deleteServer()") Удалить

</template>

<style scoped lang="scss">
.ip-settings {
    display: block;
    width: 100%;
    max-width: 600px;
    margin-bottom: 15vh;
    padding: 0;

    &__item {
        padding: 1rem;
        background-color: #E1E1E1;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        list-style-type: none;
        margin-bottom: 1rem;

        & a {
            display: block;
        }

        &:last-child {
            margin-bottom: 0;
        }
    }
}
</style>
