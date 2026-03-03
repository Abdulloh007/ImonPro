<template lang="pug">
section.ip-navigation
    .ip-container
        nav.ip-menu
            RouterLink.ip-ip-m__item(to="/")
                .ip-ip-m__icon
                    svg(viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg")
                        path(d="M3.5 9.25L12 3L20.5 9.25V19.5C20.5 20.0523 20.0523 20.5 19.5 20.5H4.5C3.94772 20.5 3.5 20.0523 3.5 19.5V9.25Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round")
                        path(d="M9.5 20.5V13H14.5V20.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round")
                span Проекты
            RouterLink.ip-ip-m__item(to="/reports")
                .ip-ip-m__icon
                    svg(viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg")
                        path(d="M12 3.5V6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round")
                        path(d="M12 18V20.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round")
                        path(d="M20.5 12H18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round")
                        path(d="M6 12H3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round")
                        path(d="M17.3033 6.6967L15.5355 8.46447" stroke="currentColor" stroke-width="1.8" stroke-linecap="round")
                        path(d="M8.4645 15.5355L6.69672 17.3033" stroke="currentColor" stroke-width="1.8" stroke-linecap="round")
                        path(d="M17.3033 17.3033L15.5355 15.5355" stroke="currentColor" stroke-width="1.8" stroke-linecap="round")
                        path(d="M8.4645 8.46447L6.69672 6.6967" stroke="currentColor" stroke-width="1.8" stroke-linecap="round")
                        path(d="M16.5 12C16.5 14.4853 14.4853 16.5 12 16.5C9.51472 16.5 7.5 14.4853 7.5 12C7.5 9.51472 9.51472 7.5 12 7.5C14.4853 7.5 16.5 9.51472 16.5 12Z" stroke="currentColor" stroke-width="1.8")
                span Отчёты
            RouterLink.ip-ip-m__item(to="/settings")
                .ip-ip-m__icon
                    svg(viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg")
                        path(d="M19.4 13.5C19.4667 13.0053 19.5 12.5053 19.5 12C19.5 11.4947 19.4667 10.9947 19.4 10.5L21.25 9.05L19.45 5.95L17.2 6.6C16.4333 6.01667 15.6 5.53333 14.7 5.15L14.25 2.75H10.65L10.2 5.15C9.3 5.53333 8.46667 6.01667 7.7 6.6L5.45 5.95L3.65 9.05L5.5 10.5C5.43333 10.9947 5.4 11.4947 5.4 12C5.4 12.5053 5.43333 13.0053 5.5 13.5L3.65 14.95L5.45 18.05L7.7 17.4C8.46667 17.9833 9.3 18.4667 10.2 18.85L10.65 21.25H14.25L14.7 18.85C15.6 18.4667 16.4333 17.9833 17.2 17.4L19.45 18.05L21.25 14.95L19.4 13.5Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round")
                        path(d="M12.45 14.5C13.8307 14.5 14.95 13.3807 14.95 12C14.95 10.6193 13.8307 9.5 12.45 9.5C11.0693 9.5 9.95 10.6193 9.95 12C9.95 13.3807 11.0693 14.5 12.45 14.5Z" stroke="currentColor" stroke-width="1.6")
                span Настройки
</template>

<style scoped lang="scss">
    .ip-navigation {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        z-index: 15;
        width: 114px;
        background-color: #fff;
        box-shadow: 0 0 4px 0 rgba(0, 0, 0, 0.25);
    }

    .ip-container {
        height: 100%;
    }

    .ip-menu {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 14px;
        height: 100%;
        padding: 20px 10px;

        .ip-ip-m__item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 10px 8px;
            border-radius: 14px;
            text-align: center;
            color: #808080;
            text-decoration: none;
            transition: background-color 0.2s ease, color 0.2s ease;

            span {
                font-size: 12px;
                font-weight: 600;
                line-height: 1.2;
            }

            .ip-ip-m__icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 44px;
                height: 44px;
                border-radius: 12px;
                background: rgba(128, 128, 128, 0.1);

                svg {
                    width: 24px;
                    height: 24px;
                }
            }

            &.router-link-active,
            &.router-link-exact-active {
                color: #808080;
                background: rgba(128, 128, 128, 0.14);

                .ip-ip-m__icon {
                    background: rgba(128, 128, 128, 0.2);
                }
            }
        }
    }

    @media (max-width: 768px) {
        .ip-navigation {
            top: auto;
            right: 0;
            bottom: 0;
            width: 100%;
            height: auto;
        }

        .ip-menu {
            flex-direction: row;
            justify-content: space-evenly;
            align-items: center;
            gap: 8px;
            padding: 10px 12px 12px;

            .ip-ip-m__item {
                flex: 1 1 0;
                min-width: 0;
                gap: 4px;
                padding: 8px 6px;

                span {
                    font-size: 11px;
                }

                .ip-ip-m__icon {
                    width: 36px;
                    height: 36px;

                    svg {
                        width: 20px;
                        height: 20px;
                    }
                }
            }
        }
    }
</style>