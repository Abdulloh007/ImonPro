<script setup lang="ts">
import { useIndexStore } from '@/stores';
import { UseLoaderStore } from '@/stores/loader';
import { useToasterStore } from '@/stores/toaster';
import axios from 'axios';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const server = ref("")
const login = ref("")
const password = ref("")
const router = useRouter()
const loaderStore = UseLoaderStore()
const toasterStore = useToasterStore()
const indexStore = useIndexStore()

function auth() {


    loaderStore.isActive = true
    axios.get(server.value + '/api/auth', {
        headers: {
            'Authorization': 'Basic ' + indexStore.UTF8TextToBase64(login.value + ':' + password.value)
        }
    }).then(res => {
        localStorage.setItem('ip_server', server.value)
        localStorage.setItem('ip_token', indexStore.UTF8TextToBase64(login.value + ':' + password.value))
        localStorage.setItem('ip_role', JSON.stringify(res.data.role))
        router.push('/')
            .then(() => location.reload())
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
    section.ip-auth__section
        .ip-container
            form.ip-form.auth.ip-dfw(@submit.prevent="auth()")
                img.ip-auth_logo(src="/img/logo.png")
                .ip-inp.ip-dfw
                    input(placeholder="Сервер" v-model="server")
                .ip-inp.ip-dfw
                    input(placeholder="Логин" v-model="login" required)
                .ip-inp.ip-dfw
                    input(placeholder="Пароль" v-model="password" required)
                button.ip-btn(type="submit") Войти
    img.ip-bg_auth(src="/img/bg_auth.jpg")                
</template>

<style lang="scss" scoped>
.ip-auth_logo {
    max-width: 100%;
    width: 35%;
    // margin-right: auto;
    // margin-left: auto;
    margin-bottom: 10vh;
}
.ip-form.auth{
    height: calc(100vh - 4rem);
    width: 45%;
    align-content: center;
    justify-content: center;
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
            width: 100%;
            border: none;
            border-bottom: 1px solid #e1e1e1;
            font-size: 18px;
            outline: none;
    
        }
    }

    button {
        width: 50%;
        text-align: center;
        display: block;
    }
}

.ip-bg_auth {
    position: fixed;
    top: 0%;
    left: 50vw;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
}

@media (max-width: 576px) {
    .ip-form.auth {
        width: 100%;
    }
    .ip-bg_auth {
        display: none;
    }
}
</style>