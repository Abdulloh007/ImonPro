<script setup lang="ts">
import router from '@/router';

function exit() {
    localStorage.clear()
    router.push('/').then(() => location.reload())
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
            .right-slot.ip-dfw
                button.ip-btn.ip-btn_danger(@click="exit()") Выход
    .ip-settings
        .ip-container.ip-dfw
            ul.ip-settings
                li.ip-settings__item
                    RouterLink(to='/settings/servers') Серверы
                //- li.ip-settings__item
                //-     RouterLink(to='/settings/notifications') Уведомления
                //- li.ip-settings__item
                //-     RouterLink(to='/settings/faq') Часто задаваемые вопросы
                li.ip-settings__item
                    RouterLink(to='/settings/support') Поддержка
</template>

<style scoped lang=scss>
.ip-settings {
    display: block;
    width: 100%;
    max-width: 600px;
    margin-bottom: 15vh;
    padding: 0;

    &__item {
        padding: 1rem;
        background-color: var(--color-surface);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        list-style-type: none;
        margin-bottom: 1rem;

        & a {
            display: block;
            color: var(--color-text);
        }

        &:last-child {
            margin-bottom: 0;
        }

        &:hover {
            background-color: var(--color-surface-alt);
        }
    }
}
</style>