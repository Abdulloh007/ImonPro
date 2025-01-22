<script setup lang="ts">
import Navigation from '../components/Navigation.vue'


function exit() {
    localStorage.clear()
    location.reload()
}

</script>

<template lang="pug">
main.ip-main
    section.header
        .ip-container.ip-dfw.ip-justify-content-between.ip-align-items-center
            .left-slot
                h2.title Настройки
                .bread-crumbs
                    RouterLink Профиль
            button.ip-btn.ip-btn_danger(@click="exit()") Выход

    Navigation
</template>

<style scoped lang=scss>

.header {
    margin-bottom: 120px;

    .title {
        font-size: 32px;
    }

    .bread-crumbs {
        font-size: 20px;
    }
}
</style>