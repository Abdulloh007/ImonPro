<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
    collapsed: boolean
    theme: 'light' | 'dark'
}>()

const role = ref<any>({
    degree: 999,
    name: ''
})
role.value = JSON.parse(localStorage.getItem('ip_role') || '{"name":"","degree":999}')

const emit = defineEmits<{
    (e: 'toggle-sidebar'): void
    (e: 'toggle-theme'): void
}>()

function toggleSidebar() {
    emit('toggle-sidebar')
}
</script>

<template lang="pug">
section.ip-navigation
    header.ip-topbar
        button.ip-topbar__toggle(type="button" @click="toggleSidebar")
            svg(viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg")
                path(d="M4 7H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round")
                path(d="M4 12H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round")
                path(d="M4 17H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round")
        RouterLink.ip-topbar__brand(to="/") ImonPro
        button.ip-topbar__theme(type="button" @click="emit('toggle-theme')")
            svg(v-if="theme === 'dark'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg")
                path(d="M21 12.79C20.89 12.79 20.78 12.8 20.68 12.8C18.52 12.94 16.6 14.35 15.56 16.21C14.51 18.07 14.43 20.31 15.35 22.28C15.3 22.29 15.26 22.3 15.21 22.31C10.88 23.25 6.09 20.24 4.86 15.76C3.63 11.28 5.64 6.54 9.67 4.62C13.7 2.7 18.67 3.82 21 7.28C21.1 7.42 21.16 7.58 21.16 7.76C21.16 8.94 20.24 10.04 19.02 10.31C19.01 10.49 21 12.79 21 12.79Z" fill="currentColor")
            svg(v-else viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg")
                path(d="M12 4.5V2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round")
                path(d="M12 22V19.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round")
                path(d="M4.22 4.22L5.64 5.64" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round")
                path(d="M18.36 18.36L19.78 19.78" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round")
                path(d="M2 12H4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round")
                path(d="M19.5 12H22" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round")
                path(d="M4.22 19.78L5.64 18.36" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round")
                path(d="M18.36 5.64L19.78 4.22" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round")
                path(d="M12 18.5C15.5899 18.5 18.5 15.5899 18.5 12C18.5 8.41015 15.5899 5.5 12 5.5C8.41015 5.5 5.5 8.41015 5.5 12C5.5 15.5899 8.41015 18.5 12 18.5Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round")
            span {{ theme === 'dark' ? 'Светлая' : 'Тёмная' }}

    aside.ip-sidebar(:class="{ collapsed }")
        nav.ip-menu
            RouterLink.ip-menu__item(to="/")
                .ip-menu__icon
                    svg(viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg")
                        path(d="M3.5 9.25L12 3L20.5 9.25V19.5C20.5 20.0523 20.0523 20.5 19.5 20.5H4.5C3.94772 20.5 3.5 20.0523 3.5 19.5V9.25Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round")
                        path(d="M9.5 20.5V13H14.5V20.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round")
                span Проекты
            RouterLink.ip-menu__item(to="/reports" v-if="role.degree < 3")
                .ip-menu__icon
                    svg(viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg")
                        path(d="M12 3.5V6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round")
                        path(d="M12 18V20.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round")
                        path(d="M20.5 12H18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round")
                        path(d="M6 12H3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round")
                        path(d="M16.5 12C16.5 14.4853 14.4853 16.5 12 16.5C9.51472 16.5 7.5 14.4853 7.5 12C7.5 9.51472 9.51472 7.5 12 7.5C14.4853 7.5 16.5 9.51472 16.5 12Z" stroke="currentColor" stroke-width="1.8")
                span Отчёты
            RouterLink.ip-menu__item(to="/settings")
                .ip-menu__icon
                    svg(viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg")
                        path(d="M19.4 13.5C19.4667 13.0053 19.5 12.5053 19.5 12C19.5 11.4947 19.4667 10.9947 19.4 10.5L21.25 9.05L19.45 5.95L17.2 6.6C16.4333 6.01667 15.6 5.53333 14.7 5.15L14.25 2.75H10.65L10.2 5.15C9.3 5.53333 8.46667 6.01667 7.7 6.6L5.45 5.95L3.65 9.05L5.5 10.5C5.43333 10.9947 5.4 11.4947 5.4 12C5.4 12.5053 5.43333 13.0053 5.5 13.5L3.65 14.95L5.45 18.05L7.7 17.4C8.46667 17.9833 9.3 18.4667 10.2 18.85L10.65 21.25H14.25L14.7 18.85C15.6 18.4667 16.4333 17.9833 17.2 17.4L19.45 18.05L21.25 14.95L19.4 13.5Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round")
                        path(d="M12.45 14.5C13.8307 14.5 14.95 13.3807 14.95 12C14.95 10.6193 13.8307 9.5 12.45 9.5C11.0693 9.5 9.95 10.6193 9.95 12C9.95 13.3807 11.0693 14.5 12.45 14.5Z" stroke="currentColor" stroke-width="1.6")
                span Настройки
</template>

<style scoped lang="scss">
.ip-topbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 21;
    height: 64px;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0 18px;
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: 0 1px 6px -3px var(--color-border);

    &__toggle {
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 10px;
        background: var(--color-surface-alt);
        color: var(--color-text);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;

        svg {
            width: 22px;
            height: 22px;
        }
    }

    &__theme {
        display: flex;
        align-items: center;
        gap: 8px;
        border: none;
        border-radius: 10px;
        background: rgba(128, 128, 128, 0.12);
        color: var(--color-text);
        padding: 0 14px;
        min-height: 40px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s ease, color 0.2s ease;

        svg {
            width: 18px;
            height: 18px;
        }

        &:hover {
            background: rgba(128, 128, 128, 0.18);
        }
    }

    &__brand {
        color: var(--color-heading);
        text-decoration: none;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 0.4px;
    }
}

.ip-sidebar {
    position: fixed;
    top: 64px;
    left: 0;
    bottom: 0;
    width: 230px;
    z-index: 20;
    background: var(--color-surface);
    box-shadow: 0 1px 8px -4px var(--color-border);
    transition: width 0.25s ease, transform 0.25s ease;
    overflow: hidden;

    &.collapsed {
        width: 82px;

        .ip-menu__item {
            justify-content: center;
            padding: 10px;

            span {
                opacity: 0;
                width: 0;
                margin: 0;
                overflow: hidden;
            }
        }
    }
}

.ip-menu {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 10px;

    &__item {
        display: flex;
        align-items: center;
        gap: 10px;
        border-radius: 12px;
        text-decoration: none;
        color: var(--color-text);
        padding: 10px 12px;
        transition: all 0.2s ease;

        span {
            font-size: 14px;
            font-weight: 600;
            white-space: nowrap;
        }

        &.router-link-active,
        &.router-link-exact-active {
            background: rgba(128, 128, 128, 0.16);
            color: var(--color-heading);
        }
    }

    &__icon {
        width: 36px;
        min-width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(128, 128, 128, 0.11);

        svg {
            width: 20px;
            height: 20px;
        }
    }
}

@media (max-width: 768px) {
    .ip-topbar {
        height: 56px;
        padding: 0 12px;
    }

    .ip-sidebar {
        top: 56px;
        width: 240px;
        transform: translateX(0);

        &.collapsed {
            width: 240px;
            transform: translateX(-100%);

            .ip-menu__item {
                justify-content: flex-start;
                padding: 10px 12px;

                span {
                    opacity: 1;
                    width: auto;
                }
            }
        }
    }
}
</style>