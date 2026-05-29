<script setup lang="ts">
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
                li.ip-list__item
                    RouterLink(to='/reports/analysis') Анализ
                li.ip-list__item
                    RouterLink(to='/reports/clients-payments') Должники по оплатам
                    
</template>

<style scoped lang="scss">
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
        background-color: var(--color-surface);
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s ease;
        color: var(--color-text);

        &:hover {
            background-color: var(--color-surface-alt);
        }

        & a {
            display: block;
            color: inherit;
        }
    }
}
</style>