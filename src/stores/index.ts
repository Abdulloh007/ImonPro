import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useIndexStore = defineStore('index', () => {
    // const apiHref = 'http://localhost/Main/hs'
    const apiHref = localStorage.getItem('ip_server') || ''
    // const apiHref = 'http://10.158.190.10:8012/Main/hs'
    // const login = localStorage.getItem('ip_login') || ''
    // const password = localStorage.getItem('ip_password') || ''
    const token = localStorage.getItem('ip_token') || ''


    function base64ToUTF8Text(base64: string) {
        const binString = atob(base64);
        return new TextDecoder().decode(Uint8Array.from(binString.split('').map((m) => m.charCodeAt(0))));
    }

    function UTF8TextToBase64(text: string) {
        const bytes: Uint8Array = new TextEncoder().encode(text);
        const binString = String.fromCodePoint(...bytes);
        return btoa(binString);
    }

    return { apiHref, token, base64ToUTF8Text, UTF8TextToBase64 }
})
