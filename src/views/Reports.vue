<script setup lang="ts">
import Navigation from '../components/Navigation.vue';

</script>

<template lang="pug"> 
main.ip-main
    section.header
        .ip-container.ip-dfw.ip-justify-content-between.ip-align-items-center
            .left-slot
                h2.title Отчеты
                .bread-crumbs
                    RouterLink Все отчеты
            //- .right-slot
                //- RouterLink(to='/reports/create', class='ip-btn ip-btn-primary') Создать отчет
    section.content
        .ip-container.ip-dfw
            ul.ip-list
                li.ip-list__item
                    RouterLink(to='/reports/sales') Продажи
                li.ip-list__item
                    RouterLink(to='/reports/non-sales') Непроданные

    Navigation
                    
</template>

<style scoped lang="scss">

.header {
    margin-bottom: 120px;

    .title {
        font-size: 32px;
    }

    .bread-crumbs {
        font-size: 20px;
    }

    .left,
    .right {
        width: 50%;
    }

    .ip-filter {
        align-items: center;

        label {
            display: block;
            width: 80px;
        }

        select {
            width: calc(100% - 80px);
            padding: 10px;
            border: none;
            border-bottom: 1px solid #e1e1e1;
        }
    }
}

.ip-list {
    width: 100%;
    max-width: 600px;
    margin-top: 20px;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;

    .ip-list__item {
        padding: 10px 20px;
        background-color: #f5f5f5;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s ease;

        &:hover {
            background-color: #e0e0e0;
        }

        & a {
            display: block;
        }
    }
}
</style>