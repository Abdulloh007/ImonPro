import { defineStore } from "pinia";
import { ref } from "vue";

export const UseLoaderStore = defineStore('loader', () => {
    const isActive = ref<boolean>(false);

    return {isActive}
})