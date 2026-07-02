import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Server } from '@/models/server'
import { Capacitor } from '@capacitor/core'

type Role = {
    name: string
    degree: number
}

const defaultRole: Role = {
    name: '',
    degree: 999
}

function normalizeRole(value: unknown): Role {
    if (!value) {
        return { ...defaultRole }
    }

    if (typeof value === 'string') {
        try {
            return normalizeRole(JSON.parse(value))
        } catch {
            const isAdmin = /admin|админ/i.test(value)
            return {
                name: value,
                degree: isAdmin ? 0 : defaultRole.degree
            }
        }
    }

    if (Array.isArray(value)) {
        return normalizeRole(value[0])
    }

    if (typeof value === 'object') {
        const role = value as Partial<Role>
        const name = typeof role.name === 'string' ? role.name : ''
        const parsedDegree = Number(role.degree)
        const isAdmin = /admin|админ/i.test(name)

        return {
            name,
            degree: Number.isFinite(parsedDegree) ? parsedDegree : isAdmin ? 0 : defaultRole.degree
        }
    }

    return { ...defaultRole }
}

function readStoredRole() {
    return normalizeRole(localStorage.getItem('ip_role'))
}

export const useIndexStore = defineStore('index', () => {
    // const apiHref = 'http://localhost/Main/hs'
    const servers = ref<Server[]>(JSON.parse(localStorage.getItem('ip_servers') || '[]'))

    const apiHref = ref<string>(localStorage.getItem('ip_server') || '')
    // const apiHref = ref<string>('')
    // const login = localStorage.getItem('ip_login') || ''
    // const password = localStorage.getItem('ip_password') || ''
    const token = ref<string>(localStorage.getItem('ip_token') || '')
    const role = ref<Role>(readStoredRole())


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

        if (server.role) {
            setRole(server.role)
        } else {
            role.value = readStoredRole()
        }
    }

    function setRole(value: unknown) {
        role.value = normalizeRole(value)
        localStorage.setItem('ip_role', JSON.stringify(role.value))
    }

    function newServer(server: Server) {
        const normalizedServer = {
            ...server,
            role: normalizeRole(server.role)
        }
        const currentServerIndex = servers.value.findIndex(item => item.link == normalizedServer.link)

        if(currentServerIndex === -1) {
            servers.value  = [...servers.value, normalizedServer]
        } else {
            servers.value = servers.value.map((item, index) => index === currentServerIndex ? normalizedServer : item)
        }

        localStorage.setItem('ip_servers', JSON.stringify(servers.value))
    }

    return { apiHref, servers, token, role, base64ToUTF8Text, UTF8TextToBase64, setAPIHref, setRole, newServer}
})
