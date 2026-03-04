<script setup lang="ts">
defineProps<{
    collapsed: boolean
}>()

const emit = defineEmits<{
    (e: 'toggle-sidebar'): void
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

    aside.ip-sidebar(:class="{ collapsed }")
        nav.ip-menu
            RouterLink.ip-menu__item(to="/")
                .ip-menu__icon
                    svg(viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg")
                        path(d="M3.5 9.25L12 3L20.5 9.25V19.5C20.5 20.0523 20.0523 20.5 19.5 20.5H4.5C3.94772 20.5 3.5 20.0523 3.5 19.5V9.25Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round")
                        path(d="M9.5 20.5V13H14.5V20.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round")
                span Проекты
            RouterLink.ip-menu__item(to="/reports")
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
    background: #fff;
    box-shadow: 0 1px 6px -3px #000;

    &__toggle {
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 10px;
        background: rgba(128, 128, 128, 0.14);
        color: #666;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;

        svg {
            width: 22px;
            height: 22px;
        }
    }

    &__brand {
        color: #363636;
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
    background: #fff;
    box-shadow: 0 1px 8px -4px #000;
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
        color: #808080;
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
            color: #555;
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