import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useIndexStore = defineStore('index', () => {
    const apiHref = 'http://10.154.184.152:8012/DataBase/hs'

    return { apiHref }
})
