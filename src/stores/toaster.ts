import { defineStore } from "pinia";
import { ref } from "vue";

interface Toast {
    id?: number;
    title: string;
    descr: string;
    type: 'danger' | 'warn' | 'info' | 'success';
}

export const useToasterStore = defineStore('toaster', () => {
    const index = ref<number>(1);
    const toasterList = ref<Toast[]>([]);

    const remove = (toast: Toast) => {
        toasterList.value = toasterList.value.filter(item => item != toast);
    }

    const add = (toast: Toast) => {
        const newToast = { ...toast, id: index.value }
        toasterList.value.push(newToast);
        setTimeout(() => toasterList.value = toasterList.value.filter(item => item.id != newToast.id), 5000)
        index.value++
    }



    return { toasterList, add, remove };
})