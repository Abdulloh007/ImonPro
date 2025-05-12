import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Server } from '@/models/server'
import { Capacitor } from '@capacitor/core'



export const useIndexStore = defineStore('index', () => {
    // const apiHref = 'http://localhost/Main/hs'
    const servers = ref<Server[]>(JSON.parse(localStorage.getItem('ip_servers') || '[]'))

    const apiHref = ref<string>(!Capacitor.isNativePlatform() ? '' : localStorage.getItem('ip_server') || '')
    // const apiHref = 'http://10.158.190.10:8012/Main/hs'
    // const login = localStorage.getItem('ip_login') || ''
    // const password = localStorage.getItem('ip_password') || ''
    const token = ref<string>(localStorage.getItem('ip_token') || '')


    function base64ToUTF8Text(base64: string) {
        const binString = atob(base64);
        return new TextDecoder().decode(Uint8Array.from(binString.split('').map((m) => m.charCodeAt(0))));
    }

    function UTF8TextToBase64(text: string) {
        const bytes: Uint8Array = new TextEncoder().encode(text);
        const binString = String.fromCodePoint(...bytes);
        return btoa(binString);
    }

    function setAPIHref(server: Server) {
        apiHref.value = server.link
        localStorage.setItem('ip_server', server.link)
        localStorage.setItem('ip_token', server.token)
        token.value = server.token
    }

    function newServer(server: Server) {
        if(!servers.value.find(item => item.link == server.link)) {
            servers.value  = [...servers.value, server]
            localStorage.setItem('ip_servers', JSON.stringify(servers.value))
        }
    }

    return { apiHref, servers, token, base64ToUTF8Text, UTF8TextToBase64, setAPIHref, newServer}
})
