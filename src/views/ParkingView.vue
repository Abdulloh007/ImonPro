<script setup lang="ts">
import { useIndexStore } from '@/stores';
import { UseLoaderStore } from '@/stores/loader';
import { useToasterStore } from '@/stores/toaster';
import { Capacitor } from '@capacitor/core';
import axios from '@/lib/httpClient';
import { onMounted, ref, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute()
const router = useRouter()
const loaderStore = UseLoaderStore()
const toasterStore = useToasterStore()
const indexStore = useIndexStore()

const parkingsSelectedlevel = ref<number>(-1)
const parkingsLevels = ref<any[]>([])
const parkings = ref([])
const viewMode = ref('plan')
const isEditMode = ref(false)
const draggedParking = ref<any>(null)
const selectedParkings = ref<Set<number>>(new Set())
const contextMenu = ref<{ x: number; y: number; parking: any } | null>(null)
const showCoordinatesModal = ref(false)
const modalParking = ref<any>(null)
const modalCoordinates = ref({ x: 0, y: 0 })
const dragStartMouse = ref({ x: 0, y: 0 })
const dragStartPositions = ref<Map<number, { x: number; y: number }>>(new Map())
const undoStack = ref<any[]>([])
const redoStack = ref<any[]>([])
const MAX_HISTORY = 100

const role = ref<any>({
    degree: 999,
    name: ''
})

const pushHistory = () => {
    const snapshot = parkings.value.map((p: any) => ({ id: p.id, x: p.x, y: p.y }))
    undoStack.value.push(JSON.parse(JSON.stringify(snapshot)))
    if (undoStack.value.length > MAX_HISTORY) undoStack.value.shift()
    // Clearing redo on new action
    redoStack.value = []
}

const applySnapshot = (snapshot: any[]) => {
    snapshot.forEach((s: any) => {
        const p: any = parkings.value.find((x: any) => x.id === s.id)
        if (p) {
            p.x = s.x
            p.y = s.y
        }
    })
}

const undo = () => {
    if (!undoStack.value.length) return
    const current = parkings.value.map((p: any) => ({ id: p.id, x: p.x, y: p.y }))
    const last = undoStack.value.pop()
    redoStack.value.push(JSON.parse(JSON.stringify(current)))
    applySnapshot(last)
}

const redo = () => {
    if (!redoStack.value.length) return
    const current = parkings.value.map((p: any) => ({ id: p.id, x: p.x, y: p.y }))
    const next = redoStack.value.pop()
    undoStack.value.push(JSON.parse(JSON.stringify(current)))
    applySnapshot(next)
}

onMounted(() => {
    role.value = JSON.parse(localStorage.getItem('ip_role') || '{"name":"","degree":999}')
    loaderStore.isActive = true
    axios.get(indexStore.apiHref + '/api/project/' + route.params.project + '/parking', {
        headers: {
            'Authorization': 'Basic ' + indexStore.token
        }
    }).then(response => {
        parkings.value = response.data
        
        // группируем парковки по уровням
        const levels = new Map<number, any[]>()
        parkings.value.forEach((p: any) => {
            if (!levels.has(p.level)) {
                levels.set(p.level, [])
            }
            levels.get(p.level)?.push(p)
        })
        
        parkingsLevels.value = Array.from(levels.keys()).sort((a, b) => b - a)
        // console.log('parkingsByLevel', parkingsByLevel.value)

        // сохранить исходное состояние для истории
        pushHistory()
    }).catch(error => {
        toasterStore.add({ title: 'Ошибка', descr: 'Ошибка при загрузке парковок', type: 'danger' })
    }).finally(() => {
        loaderStore.isActive = false
    })

    const keyHandler = (e: KeyboardEvent) => {
        // ignore if focus is input/textarea or contentEditable
        const active = document.activeElement as HTMLElement | null
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault()
            undo()
        }
        if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
            e.preventDefault()
            redo()
        }
    }

    window.addEventListener('keydown', keyHandler)
    onUnmounted(() => window.removeEventListener('keydown', keyHandler))
})

const saveAllParkings = () => {

    axios.post(indexStore.apiHref + '/api/project/' + route.params.project + '/parking', parkings.value, {
        headers: {
            'Authorization': 'Basic ' + indexStore.token
        }
    }).then(() => {
        toasterStore.add({ title: 'Успех', descr: 'Позиции парковок сохранены', type: 'success' })
    }).catch(() => {
        toasterStore.add({ title: 'Ошибка', descr: 'Ошибка при сохранении позиций парковок', type: 'danger' })
    })
}

const getParkingsBySelectedLevel = () => {
    return parkings.value.filter((p: any) => p.level === parkingsSelectedlevel.value)
}

const handleMouseDown = (parking: any, event: MouseEvent) => {
    if (!isEditMode.value) return

    // Игнорируем правый клик здесь — контекстное меню обрабатывает выделение отдельно
    if (event.button === 2) return

    // Проверяем Ctrl/Cmd для множественного выбора
    const isMultiSelect = event.ctrlKey || event.metaKey

    if (!isMultiSelect && !selectedParkings.value.has(parking.id)) {
        selectedParkings.value.clear()
    }

    if (selectedParkings.value.has(parking.id)) {
        selectedParkings.value.delete(parking.id)
    } else {
        selectedParkings.value.add(parking.id)
    }

    // Если хотя бы одна парковка выбрана, запоминаем начальные позиции
    if (selectedParkings.value.size > 0) {
        // Записываем в историю перед началом перемещения
        pushHistory()

        draggedParking.value = parking
        dragStartMouse.value = {
            x: event.clientX,
            y: event.clientY
        }

        // Сохраняем начальные позиции всех выбранных парковок
        dragStartPositions.value.clear()
        selectedParkings.value.forEach(parkingId => {
            const p: any = parkings.value.find((pk: any) => pk.id === parkingId)
            if (p) {
                dragStartPositions.value.set(parkingId, { x: p.x, y: p.y })
            }
        })
    }
}

const handleMouseMove = (e: MouseEvent) => {
    if (!draggedParking.value || !isEditMode.value || dragStartPositions.value.size === 0) return

    const deltaX = e.clientX - dragStartMouse.value.x
    const deltaY = e.clientY - dragStartMouse.value.y

    // Применяем смещение к каждой выбранной парковке с requestAnimationFrame для плавности
    requestAnimationFrame(() => {
        selectedParkings.value.forEach(parkingId => {
            const parking: any = parkings.value.find((p: any) => p.id === parkingId)
            const startPos = dragStartPositions.value.get(parkingId)
            if (parking && startPos) {
                parking.x = startPos.x + deltaX
                parking.y = startPos.y + deltaY
            }
        })
    })
}

const handleMouseUp = () => {
    draggedParking.value = null
}

const handleContextMenu = (event: MouseEvent, parking: any) => {
    event.preventDefault()
    if (!isEditMode.value) return

    // Не сбрасываем выделение при открытии контекстного меню.
    // Если выделение пустое, добавим текущую парковку в выделение.
    if (!selectedParkings.value.size) {
        selectedParkings.value.add(parking.id)
    }

    contextMenu.value = {
        x: event.clientX,
        y: event.clientY,
        parking
    }
}

const openCoordinatesModal = (parking: any) => {
    modalParking.value = parking
    modalCoordinates.value = { x: parking.x, y: parking.y }
    showCoordinatesModal.value = true
    contextMenu.value = null
}

const saveCoordinatesFromModal = () => {
    if (!modalParking.value) return

    // история перед изменением
    pushHistory()

    const deltaX = modalCoordinates.value.x - modalParking.value.x
    const deltaY = modalCoordinates.value.y - modalParking.value.y

    // Если парковка в выборе, перемещаем все
    if (selectedParkings.value.has(modalParking.value.id)) {
        selectedParkings.value.forEach(parkingId => {
            const parking: any = parkings.value.find((p: any) => p.id === parkingId)
            if (parking) {
                parking.x += deltaX
                parking.y += deltaY
            }
        })
    } else {
        modalParking.value.x = modalCoordinates.value.x
        modalParking.value.y = modalCoordinates.value.y
    }

    showCoordinatesModal.value = false
}

const closeContextMenu = () => {
    contextMenu.value = null
}

const handleOutletClick = (event: MouseEvent) => {
    // Закрываем контекстное меню при клике на пустое место
    if (event.target === event.currentTarget) {
        closeContextMenu()
    }
}

const isSelected = (parkingId: number) => selectedParkings.value.has(parkingId)

const handleParkingClick = (event: MouseEvent, parking: any) => {
    // Если не в режиме редактирования - переходим на парковку
    if (!isEditMode.value) {
        router.push('/project/' + route.params.project + '/parking/' + parking.id)
    }
}

const autoArrangeSelected = () => {
    if (selectedParkings.value.size === 0) return
    pushHistory()

    const PARKING_WIDTH = 30
    const PARKING_HEIGHT = 65

    // Получаем размеры контейнера
    const outlet = document.querySelector('.ip-parking-outlet') as HTMLElement
    if (!outlet) return
    const containerWidth = outlet.clientWidth

    // Вычисляем, сколько парковок влезает в одну строку без зазоров
    const parkingsPerRow = Math.max(1, Math.floor(containerWidth / PARKING_WIDTH))

    // Получаем все выбранные парковки
    const selectedList: any[] = []
    selectedParkings.value.forEach(parkingId => {
        const parking = parkings.value.find((p: any) => p.id === parkingId)
        if (parking) selectedList.push(parking)
    })

    // Находим начальную позицию
    let minX = Math.min(...selectedList.map(p => p.x))
    let minY = Math.min(...selectedList.map(p => p.y))

    let currentX = minX
    let currentY = minY

    // Расставляем парковки плотной сеткой без зазоров
    selectedList.forEach((parking, index) => {
        if (index > 0 && index % parkingsPerRow === 0) {
            // Переходим на новую строку
            currentX = minX
            currentY += PARKING_HEIGHT
        }

        parking.x = currentX
        parking.y = currentY

        currentX += PARKING_WIDTH
    })

    contextMenu.value = null
    toasterStore.add({
        title: 'Успех',
        descr: `Расставлено ${selectedList.length} парковок без зазоров (${parkingsPerRow} в строке)`,
        type: 'success'
    })
}

const alignSelected = (dir: string) => {
    if (selectedParkings.value.size === 0) return
    pushHistory()

    const PARKING_WIDTH = 30
    const PARKING_HEIGHT = 65

    const selectedList: any[] = []
    selectedParkings.value.forEach(id => {
        const p = parkings.value.find((x: any) => x.id === id)
        if (p) selectedList.push(p)
    })

    const left = Math.min(...selectedList.map(p => p.x))
    const right = Math.max(...selectedList.map(p => p.x + PARKING_WIDTH))
    const top = Math.min(...selectedList.map(p => p.y))
    const bottom = Math.max(...selectedList.map(p => p.y + PARKING_HEIGHT))

    switch (dir) {
        case 'left':
            selectedList.forEach(p => p.x = left)
            break
        case 'right':
            selectedList.forEach(p => p.x = right - PARKING_WIDTH)
            break
        case 'center': {
            const centerX = left + (right - left) / 2
            selectedList.forEach(p => p.x = Math.round(centerX - PARKING_WIDTH / 2))
            break
        }
        case 'top':
            selectedList.forEach(p => p.y = top)
            break
        case 'bottom':
            selectedList.forEach(p => p.y = bottom - PARKING_HEIGHT)
            break
        case 'middle': {
            const centerY = top + (bottom - top) / 2
            selectedList.forEach(p => p.y = Math.round(centerY - PARKING_HEIGHT / 2))
            break
        }
    }

    contextMenu.value = null
    toasterStore.add({ title: 'Успех', descr: 'Выравнивание применено', type: 'success' })
}

const distributeSelected = (axis: 'h' | 'v') => {
    if (selectedParkings.value.size < 3) return
    pushHistory()

    const PARKING_WIDTH = 30
    const PARKING_HEIGHT = 65

    const selectedList: any[] = []
    selectedParkings.value.forEach(id => {
        const p = parkings.value.find((x: any) => x.id === id)
        if (p) selectedList.push(p)
    })

    if (axis === 'h') {
        // sort by x
        selectedList.sort((a, b) => a.x - b.x)
        const left = Math.min(...selectedList.map(p => p.x))
        const right = Math.max(...selectedList.map(p => p.x + PARKING_WIDTH))
        const span = right - left - PARKING_WIDTH
        const step = span / (selectedList.length - 1 || 1)
        selectedList.forEach((p, i) => {
            p.x = Math.round(left + i * step)
        })
    } else {
        // vertical
        selectedList.sort((a, b) => a.y - b.y)
        const top = Math.min(...selectedList.map(p => p.y))
        const bottom = Math.max(...selectedList.map(p => p.y + PARKING_HEIGHT))
        const span = bottom - top - PARKING_HEIGHT
        const step = span / (selectedList.length - 1 || 1)
        selectedList.forEach((p, i) => {
            p.y = Math.round(top + i * step)
        })
    }

    contextMenu.value = null
    toasterStore.add({ title: 'Успех', descr: 'Распределение применено', type: 'success' })
}
</script>

<template lang="pug">
main.ip-main 
    section.header
        .ip-container.ip-dfw
            .left-slot.ip-dfw
                RouterLink.ip-btn__back(:to="'/project/' + $route.params.project")
                    svg(width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg")
                        path(d="M15 4.5L7 12.5L15 20.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round")
                .ip-heading
                    h2.title Парковки
                    .bread-crumbs.ip-dfw
                        RouterLink(to='/') Все проекты
                        span >
                        RouterLink(:to="'/project/' + $route.params.project") {{ $route.params.project }}
                        
            .right-slot
                h2.title Варианты отображения
                .ip-btn-group.ip-dfw
                    button.ip-btn.ip-mr-1(:class="{ active: viewMode === 'list' }" @click="viewMode = 'list'") Список
                    button.ip-btn(:class="{ active: viewMode === 'plan' }" @click="viewMode = 'plan'") План
                    button.ip-btn.ip-ml-1(:class="{ active: isEditMode }" @click="isEditMode = !isEditMode" v-if="viewMode === 'plan'") {{ isEditMode ? 'Готово' : 'Редактировать' }}
                    button.ip-btn.ip-ml-1(:class="{ active: isEditMode }" @click="undo" :disabled="undoStack.length === 0" title="Отмена (Ctrl+Z)" v-if="viewMode === 'plan' && isEditMode")
                        svg(width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2")
                            path(d="M3 7v6h6")
                            path(d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13")
                    button.ip-btn.ip-ml-1(:class="{ active: isEditMode }" @click="redo" :disabled="redoStack.length === 0" title="Вернуть (Ctrl+Y)" v-if="viewMode === 'plan' && isEditMode")
                        svg(width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2")
                            path(d="M21 7v6h-6")
                            path(d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7")
                    button.ip-btn.ip-ml-1(:class="{ active: isEditMode }" @click="saveAllParkings" v-if="viewMode === 'plan' && isEditMode") Сохранить

    section.content
        .ip-container.ip-dfw
            .ip-table.ip-col-12(v-if="viewMode === 'list'")
                .ip-table__header.ip-dfw
                    .ip-table__cell Номер парковки
                    .ip-table__cell(v-if="role.degree < 3") Клиент
                    .ip-table__cell Действия
                .ip-table__body
                    .ip-table__row.ip-dfw(v-for="parking in parkings" :key="parking.id")
                        .ip-table__cell {{ parking.number }}
                        .ip-table__cell(v-if="role.degree < 3") {{ parking.client ? parking.client.name : 'Свободна' }}
                        .ip-table__cell 
                            RouterLink.ip-btn(:to="'/project/' + $route.params.project + '/parking/' + parking.id") Подробнее

            .ip-parking-plan(v-if="viewMode === 'plan'")
                .ip-parking-level.ip-dfw
                    button.ip-btn.ip-mb-2.ip-mr-1(v-for="(level, index) in parkingsLevels" :key="index" @click="parkingsSelectedlevel = level") Уровень {{ level }}
                .ip-parking-outlet(
                    @mousemove="handleMouseMove"
                    @mouseup="handleMouseUp"
                    @mouseleave="handleMouseUp"
                    @click="handleOutletClick"
                    @contextmenu.prevent
                )
                    img(:src="'/img/parking-plan.png'").parking-plan-bg
                    .parking-placeholder(v-if="parkings.length === 0") Нет парковок для отображения
                    .parking(
                        v-for="parking in getParkingsBySelectedLevel()" 
                        :key="parking.id" 
                        :style="{ left: parking.x + 'px', top: parking.y + 'px', transform: 'rotate(' + parking.rotation + 'deg)' }" 
                        :class="{ free: !parking.client, occupied: parking.client, 'edit-mode': isEditMode, selected: isSelected(parking.id) }"
                        @mousedown="handleMouseDown(parking, $event)"
                        @click="handleParkingClick($event, parking)"
                        @contextmenu.prevent="handleContextMenu($event, parking)"
                        :draggable="false"
                    )
                        .number {{ parking.number }}

                // Контекстное меню
                .context-menu(v-if="contextMenu" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }")
                    .context-menu__item(@click="openCoordinatesModal(contextMenu.parking)")
                        svg(width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2")
                            circle(cx="12" cy="12" r="1")
                            path(d="M12 19V5")
                            path(d="M5 12H19")
                        span Указать координаты
                    .context-menu__item(@click="autoArrangeSelected" v-if="selectedParkings.size > 0")
                        svg(width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2")
                            rect(x="3" y="3" width="7" height="7")
                            rect(x="14" y="3" width="7" height="7")
                            rect(x="14" y="14" width="7" height="7")
                            rect(x="3" y="14" width="7" height="7")
                        span Авто расстановка ({{ selectedParkings.size }})
                    // Выравнивание (гориз. и верт.)
                    .context-menu__item(@click="alignSelected('left')" v-if="selectedParkings.size > 1")
                        span Выровнять влево
                    .context-menu__item(@click="alignSelected('center')" v-if="selectedParkings.size > 1")
                        span Выровнять по центру (гор.)
                    .context-menu__item(@click="alignSelected('right')" v-if="selectedParkings.size > 1")
                        span Выровнять вправо
                    .context-menu__item(@click="alignSelected('top')" v-if="selectedParkings.size > 1")
                        span Выровнять вверх
                    .context-menu__item(@click="alignSelected('middle')" v-if="selectedParkings.size > 1")
                        span Выровнять по центру (верт.)
                    .context-menu__item(@click="alignSelected('bottom')" v-if="selectedParkings.size > 1")
                        span Выровнять вниз
                    .context-menu__item(@click="distributeSelected('h')" v-if="selectedParkings.size > 2")
                        span Равномерно распределить по горизонтали
                    .context-menu__item(@click="distributeSelected('v')" v-if="selectedParkings.size > 2")
                        span Равномерно распределить по вертикали

            // Модальное окно для ввода координат
            .modal-overlay(v-if="showCoordinatesModal" @click.self="showCoordinatesModal = false")
                .modal
                    .modal__header
                        h3 Координаты парковки №{{ modalParking?.number }}
                        button.modal__close(@click="showCoordinatesModal = false")
                            svg(width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2")
                                line(x1="18" y1="6" x2="6" y2="18")
                                line(x1="6" y1="6" x2="18" y2="18")
                    .modal__body
                        .form-group
                            label X координата:
                            input(v-model.number="modalCoordinates.x" type="number" min="0")
                        .form-group
                            label Y координата:
                            input(v-model.number="modalCoordinates.y" type="number" min="0")
                    .modal__footer
                        button.ip-btn-secondary(@click="showCoordinatesModal = false") Отмена
                        button.ip-btn(@click="saveCoordinatesFromModal") Сохранить
</template>

<style scoped lang="scss">
.ip-table {
    &__header {
        background-color: #f5f5f5;
        font-weight: 600;
    }

    &__row {
        &:hover {
            background-color: #f9f9f9;
        }
    }

    &__cell {
        padding: 12px;
        border-bottom: 1px solid #e0e0e0;

        &:nth-child(1) {
            width: 20%;
        }

        &:nth-child(2) {
            width: 40%;
        }

        &:nth-child(3) {
            width: 40%;
        }
    }
}

.ip-parking-plan {
    width: 100%;
    height: 75vh;
    display: flex;
    flex-wrap: wrap;
    overflow: overlay;

    .ip-parking-outlet {
        width: 100%;
        height: 100%;
        position: relative;
        user-select: none;
    }

    img.parking-plan-bg {
        width: auto;
        height: 700px;
    }

    .parking {
        position: absolute;
        width: 35px;
        height: 75px;
        background-image: url('@/assets/car.png');
        background-size: 100%;
        background-repeat: no-repeat;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        border-radius: 4px;
        cursor: pointer;
        will-change: transform, left, top;
        transition: box-shadow 0.2s;
        user-select: none;

        &.free {
            box-shadow: inset 0 0 5px 2px #8ceb8f;
        }

        &.occupied {
            box-shadow: inset 0 0 5px 2px #ff6171;
        }

        &.selected {
            box-shadow: inset 0 0 5px 2px #2196f3, 0 0 8px 2px rgba(33, 150, 243, 0.5) !important;
        }

        &.edit-mode {
            cursor: move;

            &:hover {
                box-shadow: inset 0 0 5px 2px #2196f3 !important;
            }
        }

        .number {
            color: #fff;
            font-size: 10px;
        }
    }
}

.ip-ml-1 {
    margin-left: 8px;
}

.context-menu {
    position: fixed;
    background-color: white;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    min-width: 220px;
    overflow: hidden;

    &__item {
        padding: 12px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background-color 0.2s;
        font-size: 14px;
        color: #333;

        svg {
            flex-shrink: 0;
            color: #666;
        }

        &:hover {
            background-color: #f5f5f5;
        }

        &:not(:last-child) {
            border-bottom: 1px solid #f0f0f0;
        }
    }
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
}

.modal {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    min-width: 400px;
    overflow: hidden;

    &__header {
        padding: 16px;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        justify-content: space-between;
        align-items: center;

        h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }
    }

    &__close {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #999;
        transition: color 0.2s;

        &:hover {
            color: #333;
        }
    }

    &__body {
        padding: 16px;
    }

    &__footer {
        padding: 16px;
        border-top: 1px solid #e0e0e0;
        display: flex;
        gap: 8px;
        justify-content: flex-end;
    }
}

.form-group {
    margin-bottom: 16px;

    &:last-child {
        margin-bottom: 0;
    }

    label {
        display: block;
        margin-bottom: 6px;
        font-size: 14px;
        font-weight: 500;
        color: #333;
    }

    input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        font-size: 14px;
        transition: border-color 0.2s;

        &:focus {
            outline: none;
            border-color: #2196f3;
        }
    }
}

.ip-btn-secondary {
    padding: 8px 16px;
    background-color: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;

    &:hover {
        background-color: #e0e0e0;
    }
}
</style>
