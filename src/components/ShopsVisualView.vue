<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Shop, ShopCoordinates } from '@/models/shop'
import axios from '@/lib/httpClient'
import { useIndexStore } from '@/stores'
import { useToasterStore } from '@/stores/toaster'

interface Props {
    shops: Shop[]
    projectId: string | string[]
    blockId: string | string[]
    isEditing?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    isEditing: false
})

const emit = defineEmits<{
    selectShop: [id: string]
    updateCoordinates: [coords: ShopCoordinates]
}>()

const indexStore = useIndexStore()
const toasterStore = useToasterStore()

const svgElement = ref<SVGElement | null>(null)
const selectedShopId = ref<string | null>(null)
const draggingShopId = ref<string | null>(null)
const resizingShopId = ref<string | null>(null)
const resizeHandle = ref<string | null>(null)
const draggingVertex = ref<{shopId:string;index:number} | null>(null)
const dragStart = ref({ x: 0, y: 0 })
const shiftLockOrientation = ref<'horizontal'|'vertical'|null>(null)
const shopCoordinates = ref<Map<string, ShopCoordinates>>(new Map())
const blueprintImage = ref<string | null>(null)
const zoomLevel = ref<number>(1)
// history stacks for undo/redo
const history = ref<ShopCoordinates[][]>([])
const historyIndex = ref<number>(-1)
const isSaving = ref<boolean>(false)
const hasChanges = ref<boolean>(false)

const canvasWidth = 1200
const canvasHeight = 800

onMounted(() => {
    loadShopCoordinates()
    loadBlueprint()
})

async function loadBlueprint() {
    try {
        const response = await axios.get(
            `${indexStore.apiHref}/api/project/${props.projectId}/block/${props.blockId}/blueprint`,
            {
                headers: {
                    'Authorization': 'Basic ' + indexStore.token
                },
                responseType: 'blob'
            }
        )
        const url = URL.createObjectURL(response.data)
        blueprintImage.value = url
    } catch (error) {
        // Blueprint не найден, используем пустой фон
    }
}

async function loadShopCoordinates() {
    try {
        const response = await axios.get(
            `${indexStore.apiHref}/api/project/${props.projectId}/block/${props.blockId}/shops/coordinates`,
            {
                headers: {
                    'Authorization': 'Basic ' + indexStore.token
                }
            }
        )
        response.data.forEach((coord: ShopCoordinates) => {
            // default type if missing
            if (!coord.type) coord.type = coord.points ? 'polygon' : 'rect'
            
            shopCoordinates.value.set(coord.id, coord)
        })
    } catch (error) {
        // Если координаты не загружены, используем позиции по умолчанию
        props.shops.forEach((shop, index) => {
            const col = index % 4
            const row = Math.floor(index / 4)
            shopCoordinates.value.set(shop.id, {
                id: shop.id,
                type: 'rect',
                x: col * 280 + 20,
                y: row * 200 + 20,
                width: 250,
                height: 150
            })
        })
    }
    pushHistory()
}

function getShopCoordinates(shopId: string): ShopCoordinates {
    const coords = shopCoordinates.value.get(shopId)
    if (coords) return coords
    return {
        id: shopId,
        type: 'rect',
        x: 0,
        y: 0,
        width: 250,
        height: 150
    }
}

function getShop(shopId: string): Shop | undefined {
    return props.shops.find(s => s.id === shopId)
}

function onMouseDown(e: MouseEvent, shopId: string, handle?: string) {
    if (!props.isEditing) {
        selectShop(shopId)
        return
    }

    e.preventDefault()
    const rect = svgElement.value?.getBoundingClientRect()
    if (!rect) return

    dragStart.value = {
        x: (e.clientX - rect.left) / (rect.width / canvasWidth),
        y: (e.clientY - rect.top) / (rect.height / canvasHeight)
    }
    // reset shift lock when starting new drag
    shiftLockOrientation.value = null

    if (handle) {
        resizingShopId.value = shopId
        resizeHandle.value = handle
    } else {
        draggingShopId.value = shopId
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
}

function onVertexMouseDown(e: MouseEvent, shopId: string, index: number) {
    if (!props.isEditing) return
    // If Ctrl is pressed on mousedown, treat it as a delete request for the vertex
    if (e.ctrlKey) {
        const coords = getShopCoordinates(shopId)
        if (coords.type === 'polygon' && coords.points && coords.points.length > 3) {
            e.preventDefault()
            coords.points.splice(index, 1)
            shopCoordinates.value.set(shopId, coords)
            pushHistory()
            hasChanges.value = true
        }
        return
    }

    e.preventDefault()
    const rect = svgElement.value?.getBoundingClientRect()
    if (!rect) return

    dragStart.value = {
        x: (e.clientX - rect.left) / (rect.width / canvasWidth),
        y: (e.clientY - rect.top) / (rect.height / canvasHeight)
    }
    // reset shift lock when beginning to drag a vertex too
    shiftLockOrientation.value = null

    draggingVertex.value = { shopId, index }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
}

function applyShift(deltaX: number, deltaY: number, shift: boolean) {
    if (!shift) {
        shiftLockOrientation.value = null
        return { deltaX, deltaY }
    }
    // only decide orientation once movement is non-trivial
    if (!shiftLockOrientation.value) {
        const magnitude = Math.hypot(deltaX, deltaY)
        if (magnitude > 1) {
            shiftLockOrientation.value = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical'
        }
    }
    if (shiftLockOrientation.value === 'horizontal') {
        deltaY = 0
    } else if (shiftLockOrientation.value === 'vertical') {
        deltaX = 0
    }
    return { deltaX, deltaY }
}

function onMouseMove(e: MouseEvent) {
    if (!svgElement.value) return

    const rect = svgElement.value.getBoundingClientRect()
    const currentX = (e.clientX - rect.left) / (rect.width / canvasWidth)
    const currentY = (e.clientY - rect.top) / (rect.height / canvasHeight)

    let deltaX = currentX - dragStart.value.x
    let deltaY = currentY - dragStart.value.y
    const shifted = applyShift(deltaX, deltaY, e.shiftKey)
    deltaX = shifted.deltaX
    deltaY = shifted.deltaY

    if (draggingVertex.value) {
        const { shopId, index } = draggingVertex.value
        const coords = getShopCoordinates(shopId)
        if (coords.type === 'polygon' && coords.points) {
            // move the specific vertex by the delta (respecting shift-lock)
            const pts = coords.points.map(p => ({ ...p }))
            const original = pts[index]
            const moved = {
                x: Math.max(0, Math.min(canvasWidth, original.x + deltaX)),
                y: Math.max(0, Math.min(canvasHeight, original.y + deltaY))
            }
            pts[index] = moved
            const newCoords = { ...coords, points: pts }
            shopCoordinates.value.set(shopId, newCoords)
        }
        dragStart.value = { x: currentX, y: currentY }
    } else if (draggingShopId.value) {
        const coords = getShopCoordinates(draggingShopId.value)
        if (coords.type === 'rect') {
            const newCoords = {
                ...coords,
                x: Math.max(0, Math.min(canvasWidth - coords.width!, coords.x! + deltaX)),
                y: Math.max(0, Math.min(canvasHeight - coords.height!, coords.y! + deltaY))
            }
            shopCoordinates.value.set(draggingShopId.value, newCoords)
        } else if (coords.type === 'polygon' && coords.points) {
            // move all vertices together but ensure the whole shape stays within canvas
            const xs = coords.points.map(p => p.x)
            const ys = coords.points.map(p => p.y)
            const minX = Math.min(...xs)
            const maxX = Math.max(...xs)
            const minY = Math.min(...ys)
            const maxY = Math.max(...ys)

            const minDX = -minX
            const maxDX = canvasWidth - maxX
            const minDY = -minY
            const maxDY = canvasHeight - maxY

            const finalDX = Math.max(minDX, Math.min(maxDX, deltaX))
            const finalDY = Math.max(minDY, Math.min(maxDY, deltaY))

            const pts = coords.points.map(p => ({
                x: p.x + finalDX,
                y: p.y + finalDY
            }))
            const newCoords = { ...coords, points: pts }
            shopCoordinates.value.set(draggingShopId.value, newCoords)
        }
        dragStart.value = { x: currentX, y: currentY }
    } else if (resizingShopId.value && resizeHandle.value) {
        const coords = getShopCoordinates(resizingShopId.value)
        const newCoords: ShopCoordinates = { ...coords }

        if (coords.type === 'rect') {
            // use deltaX/deltaY which already take shift-lock into account
            if (resizeHandle.value.includes('e')) {
                newCoords.width = Math.max(80, coords.width! + deltaX)
            }
            if (resizeHandle.value.includes('s')) {
                newCoords.height = Math.max(60, coords.height! + deltaY)
            }
            if (resizeHandle.value.includes('w')) {
                const newX = coords.x! + deltaX
                newCoords.width = Math.max(80, coords.width! - deltaX)
                newCoords.x = newX
            }
            if (resizeHandle.value.includes('n')) {
                const newY = coords.y! + deltaY
                newCoords.height = Math.max(60, coords.height! - deltaY)
                newCoords.y = newY
            }
            shopCoordinates.value.set(resizingShopId.value, newCoords)
        }
        dragStart.value = { x: currentX, y: currentY }
    }
}

function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    shiftLockOrientation.value = null

    if (draggingVertex.value) {
        pushHistory()
        hasChanges.value = true
        draggingVertex.value = null
    } else if (draggingShopId.value) {
        pushHistory()
        hasChanges.value = true
        draggingShopId.value = null
    } else if (resizingShopId.value) {
        pushHistory()
        hasChanges.value = true
        resizingShopId.value = null
        resizeHandle.value = null
    }
}

async function saveAllCoordinates() {
    if (!hasChanges.value) return
    
    isSaving.value = true
    try {
        const allCoords = Array.from(shopCoordinates.value.values())
        
        // Save all coordinates
        await Promise.all(
            allCoords.map(coords =>
                axios.post(
                    `${indexStore.apiHref}/api/project/${props.projectId}/block/${props.blockId}/shop/${coords.id}/coordinates`,
                    coords,
                    {
                        headers: {
                            'Authorization': 'Basic ' + indexStore.token
                        }
                    }
                )
            )
        )
        
        hasChanges.value = false
        toasterStore.add({
            title: 'Успешно',
            descr: `Координаты ${allCoords.length} магазинов сохранены`,
            type: 'success'
        })
    } catch (error: any) {
        toasterStore.add({
            title: 'Ошибка',
            descr: error.message || 'Ошибка при сохранении координат',
            type: 'danger'
        })
    } finally {
        isSaving.value = false
    }
}

async function saveCoordinates(shopId: string) {
    try {
        const coords = getShopCoordinates(shopId)
        await axios.post(
            `${indexStore.apiHref}/api/project/${props.projectId}/block/${props.blockId}/shop/${shopId}/coordinates`,
            coords,
            {
                headers: {
                    'Authorization': 'Basic ' + indexStore.token
                }
            }
        )
        emit('updateCoordinates', coords)
    } catch (error: any) {
        toasterStore.add({
            title: 'Ошибка',
            descr: error.message || 'Ошибка при сохранении координат',
            type: 'danger'
        })
    }
}

function selectShop(shopId: string) {
    selectedShopId.value = shopId
    emit('selectShop', shopId)
}

function handleZoom(event: WheelEvent) {
    if (event.ctrlKey && selectedShopId.value) {
        // Ctrl+wheel: scale the selected shop
        event.preventDefault()
        const coords = getShopCoordinates(selectedShopId.value)
        const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1
        const newCoords: ShopCoordinates = { ...coords }

        if (coords.type === 'rect') {
            newCoords.width = Math.max(80, (coords.width ?? 250) * scaleFactor)
            newCoords.height = Math.max(60, (coords.height ?? 150) * scaleFactor)
        } else if (coords.type === 'polygon' && coords.points) {
            // scale polygon around its center
            const xs = coords.points.map(p => p.x)
            const ys = coords.points.map(p => p.y)
            const centerX = (Math.min(...xs) + Math.max(...xs)) / 2
            const centerY = (Math.min(...ys) + Math.max(...ys)) / 2
            newCoords.points = coords.points.map(p => ({
                x: centerX + (p.x - centerX) * scaleFactor,
                y: centerY + (p.y - centerY) * scaleFactor
            }))
        }
        shopCoordinates.value.set(selectedShopId.value, newCoords)
        pushHistory()
        hasChanges.value = true
    } else {
        // Normal wheel: canvas zoom
        const delta = event.deltaY > 0 ? -0.1 : 0.1
        zoomLevel.value = Math.max(0.5, Math.min(3, zoomLevel.value + delta))
    }
}

// history helpers
function pushHistory() {
    const snapshot = Array.from(shopCoordinates.value.values()).map(c => {
        const copy: ShopCoordinates = { ...c }
    
        if (!!c.points) copy.points = c.points.map(p => ({ ...p }))
        return copy
    })
    // remove any future states if undoed
    history.value.splice(historyIndex.value + 1)
    history.value.push(snapshot)
    historyIndex.value = history.value.length - 1
}

function applySnapshot(snapshot: ShopCoordinates[]) {
    shopCoordinates.value.clear()
    snapshot.forEach(c => shopCoordinates.value.set(c.id, c))
}

function undo() {
    if (historyIndex.value > 0) {
        historyIndex.value--
        applySnapshot(history.value[historyIndex.value])
    }
}

function redo() {
    if (historyIndex.value < history.value.length - 1) {
        historyIndex.value++
        applySnapshot(history.value[historyIndex.value])
    }
}

function toggleShape() {
    if (!selectedShopId.value) return
    const coords = getShopCoordinates(selectedShopId.value)
    let newCoords: ShopCoordinates = { ...coords }
    if (coords.type === 'rect') {
        // convert to polygon with rectangle corners
        const x = coords.x ?? 0
        const y = coords.y ?? 0
        const w = coords.width ?? 0
        const h = coords.height ?? 0
        newCoords.type = 'polygon'
        newCoords.points = [
            { x: x, y: y },
            { x: x + w, y: y },
            { x: x + w, y: y + h },
            { x: x, y: y + h }
        ]
        // clear rect props optionally
        delete newCoords.x
        delete newCoords.y
        delete newCoords.width
        delete newCoords.height
    } else {
        // convert polygon to bounding rectangle
        if (coords.points && coords.points.length) {
            const xs = coords.points.map(p => p.x)
            const ys = coords.points.map(p => p.y)
            const minX = Math.min(...xs)
            const minY = Math.min(...ys)
            const maxX = Math.max(...xs)
            const maxY = Math.max(...ys)
            newCoords.type = 'rect'
            newCoords.x = minX
            newCoords.y = minY
            newCoords.width = maxX - minX
            newCoords.height = maxY - minY
            delete newCoords.points
        }
    }
    shopCoordinates.value.set(selectedShopId.value, newCoords)
    pushHistory()
    hasChanges.value = true
}


// distance from point to segment
function pointToSegmentDistance(p: {x:number,y:number}, a: {x:number,y:number}, b: {x:number,y:number}): number {
    const vx = b.x - a.x
    const vy = b.y - a.y
    const wx = p.x - a.x
    const wy = p.y - a.y
    const c1 = vx * wx + vy * wy
    if (c1 <= 0) return Math.hypot(p.x - a.x, p.y - a.y)
    const c2 = vx * vx + vy * vy
    if (c2 <= c1) return Math.hypot(p.x - b.x, p.y - b.y)
    const t = c1 / c2
    const projx = a.x + t * vx
    const projy = a.y + t * vy
    return Math.hypot(p.x - projx, p.y - projy)
}

function getShopStatus(shop: Shop): string {
    if (shop.broned) return 'broned'
    if (shop.reserved) return 'reserved'
    return 'available'
}


function deleteVertex(shopId: string, index: number) {
    const coords = getShopCoordinates(shopId)
    if (coords.type === 'polygon' && coords.points && coords.points.length > 3) {
        // keep at least 3 points for a valid polygon
        coords.points.splice(index, 1)
        shopCoordinates.value.set(shopId, coords)
        pushHistory()
        hasChanges.value = true
    }
}

function onPolygonClick(e: MouseEvent, shopId: string) {
    if (!props.isEditing) return
    
    const rect = svgElement.value?.getBoundingClientRect()
    if (!rect) return
    // Account for zoomLevel when converting screen coords to canvas coords
    const pixelsPerUnitX = rect.width / (canvasWidth * zoomLevel.value)
    const pixelsPerUnitY = rect.height / (canvasHeight * zoomLevel.value)
    const x = (e.clientX - rect.left) / pixelsPerUnitX
    const y = (e.clientY - rect.top) / pixelsPerUnitY
    const coords = getShopCoordinates(shopId)
    
    if (coords.type === 'polygon' && coords.points) {
        // Compute proximity in SCREEN pixels to avoid scale/zoom issues.
        // Convert each vertex to screen coordinates and compare to event client coords.
        const pxTolerance = 10 // pixels on screen
        for (let i = 0; i < coords.points.length; i++) {
            const pt = coords.points[i]
            const screenX = rect.left + pt.x * pixelsPerUnitX
            const screenY = rect.top + pt.y * pixelsPerUnitY
            const distPx = Math.hypot(screenX - e.clientX, screenY - e.clientY)
            if (distPx <= pxTolerance && coords.points.length > 3) {
                // Delete existing point
                coords.points.splice(i, 1)
                shopCoordinates.value.set(shopId, coords)
                pushHistory()
                hasChanges.value = true
                return
            }
        }

        // No nearby vertex, so add a new point on the edge (use canvas coords x,y)
        const pts = coords.points || []
        let bestIdx = pts.length
        let minDist = Infinity
        for (let i = 0; i < pts.length; i++) {
            const p1 = pts[i]
            const p2 = pts[(i + 1) % pts.length]
            const dist = pointToSegmentDistance({ x, y }, p1, p2)
            if (dist < minDist) {
                minDist = dist
                bestIdx = i + 1
            }
        }
        pts.splice(bestIdx, 0, { x, y })
        coords.points = pts
        shopCoordinates.value.set(shopId, coords)
        pushHistory()
        hasChanges.value = true
    }
}

function handlePolygonClickOrSelect(e: MouseEvent, shopId: string) {
    if (e.ctrlKey) {
        onPolygonClick(e, shopId)
    } else {
        selectShop(shopId)
    }
}

const shopsArray = computed(() => {
    return props.shops.map(shop => {
        const raw = getShopCoordinates(shop.id)
        const coords: ShopCoordinates = { ...raw }
        if (coords.type === 'rect') {
            coords.x = coords.x ?? 0
            coords.y = coords.y ?? 0
            coords.width = coords.width ?? 250
            coords.height = coords.height ?? 150
        } else if (coords.type === 'polygon') {
            coords.points = coords.points ?? []
        }
        return { ...shop, coords }
    })
})
</script>

<template>
    <div class="shops-visual-view">
        <div class="canvas-container" @wheel.prevent="handleZoom">
            <svg
                ref="svgElement"
                :width="canvasWidth * zoomLevel"
                :height="canvasHeight * zoomLevel"
                class="canvas"
                @click.self="selectedShopId = null"
            >
                <!-- Grid background -->
                <defs>
                    <pattern id="grid" :width="50" :height="50" patternUnits="userSpaceOnUse">
                        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e0e0e0" stroke-width="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                <!-- Blueprint image background (if available) -->
                <image
                    v-if="blueprintImage"
                    href="/default.png"
                    x="0"
                    y="0"
                    :width="canvasWidth"
                    :height="canvasHeight"
                    opacity="0.3"
                />

                <!-- Shops -->
                <g v-for="item in shopsArray" :key="item.id" class="shop-group">
                    <!-- Shape based on coords type -->
                    <template v-if="item.coords.type === 'polygon' && item.coords.points">
                        <polygon
                            :points="item.coords.points.map(p=>p.x+','+p.y).join(' ')"
                            :class="['shop-rect', getShopStatus(item), { selected: selectedShopId === item.id }]"
                            @mousedown="onMouseDown($event, item.id)"
                            @click.stop="handlePolygonClickOrSelect($event, item.id)"
                        />
                    </template>
                    <template v-else>
                        <rect
                            :x="item.coords.x"
                            :y="item.coords.y"
                            :width="item.coords.width"
                            :height="item.coords.height"
                            :class="['shop-rect', getShopStatus(item), { selected: selectedShopId === item.id }]"
                            @mousedown="onMouseDown($event, item.id)"
                            @click.stop="selectShop(item.id)"
                        />
                    </template>

                    <!-- Shop label -->
                    <text
                        v-if="item.coords.type !== 'polygon'"
                        :x="(item.coords.x ?? 0) + (item.coords.width ?? 0) / 2"
                        :y="(item.coords.y ?? 0) + (item.coords.height ?? 0) / 2 - 10"
                        class="shop-label"
                        text-anchor="middle"
                        pointer-events="none"
                    >
                        {{ item.room_number }}
                    </text>
                    <text
                        v-else
                        :x="item.coords.points ? item.coords.points[0].x + 20 : 0"
                        :y="item.coords.points ? item.coords.points[0].y + 20 : 0"
                        class="shop-label"
                        text-anchor="start"
                        pointer-events="none"
                    >
                        {{ item.room_number }}
                    </text>

                    <!-- Client name -->
                    <text
                        v-if="item.broned"
                        :x="(item.coords.x ?? 0) + (item.coords.width ?? 0) / 2"
                        :y="(item.coords.y ?? 0) + (item.coords.height ?? 0) / 2 + 15"
                        class="shop-client"
                        text-anchor="middle"
                        pointer-events="none"
                    >
                        {{ item.client.split(' ')[0] }}
                    </text>

                    <!-- Resize handles (only in edit mode, for rects) -->
                    <template v-if="isEditing && selectedShopId === item.id && item.coords.type !== 'polygon'">
                        <g class="resize-handles">
                            <circle
                                :cx="(item.coords.x ?? 0) + (item.coords.width ?? 0)"
                                :cy="item.coords.y ?? 0"
                                r="6"
                                class="resize-handle resize-handle-ne"
                                @mousedown="onMouseDown($event, item.id, 'ne')"
                            />
                            <circle
                                :cx="(item.coords.x ?? 0) + (item.coords.width ?? 0)"
                                :cy="(item.coords.y ?? 0) + (item.coords.height ?? 0)"
                                r="6"
                                class="resize-handle resize-handle-se"
                                @mousedown="onMouseDown($event, item.id, 'se')"
                            />
                            <circle
                                :cx="item.coords.x ?? 0"
                                :cy="(item.coords.y ?? 0) + (item.coords.height ?? 0)"
                                r="6"
                                class="resize-handle resize-handle-sw"
                                @mousedown="onMouseDown($event, item.id, 'sw')"
                            />
                            <circle
                                :cx="item.coords.x"
                                :cy="item.coords.y"
                                r="6"
                                class="resize-handle resize-handle-nw"
                                @mousedown="onMouseDown($event, item.id, 'nw')"
                            />
                            <circle
                                :cx="(item.coords.x ?? 0) + (item.coords.width ?? 0)"
                                :cy="(item.coords.y ?? 0) + (item.coords.height ?? 0) / 2"
                                r="5"
                                class="resize-handle resize-handle-e"
                                @mousedown="onMouseDown($event, item.id, 'e')"
                            />
                            <circle
                                :cx="(item.coords.x ?? 0) + (item.coords.width ?? 0) / 2"
                                :cy="(item.coords.y ?? 0) + (item.coords.height ?? 0)"
                                r="5"
                                class="resize-handle resize-handle-s"
                                @mousedown="onMouseDown($event, item.id, 's')"
                            />
                            <circle
                                :cx="item.coords.x ?? 0"
                                :cy="(item.coords.y ?? 0) + (item.coords.height ?? 0) / 2"
                                r="5"
                                class="resize-handle resize-handle-w"
                                @mousedown="onMouseDown($event, item.id, 'w')"
                            />
                            <circle
                                :cx="(item.coords.x ?? 0) + (item.coords.width ?? 0) / 2"
                                :cy="item.coords.y ?? 0"
                                r="5"
                                class="resize-handle resize-handle-n"
                                @mousedown="onMouseDown($event, item.id, 'n')"
                            />
                        </g>
                    </template>
                    <!-- Vertex handles (only in edit mode, for polygons) -->
                    <g v-if="isEditing && selectedShopId === item.id && item.coords.type === 'polygon' && item.coords.points">
                        <circle
                            v-for="(p, idx) in item.coords.points"
                            :key="idx"
                            :cx="p.x"
                            :cy="p.y"
                            r="5"
                            class="vertex-handle"
                            @mousedown="onVertexMouseDown($event, item.id, idx)"
                            :class="{ 'vertex-deletable': item.coords.points && item.coords.points.length > 3 }"
                        />
                    </g>
                </g>
            </svg>
        </div>

        <div class="controls">
            <div v-if="isEditing" class="zoom-controls">
                <button @click="zoomLevel = Math.max(0.5, zoomLevel - 0.1)">−</button>
                <span>{{ Math.round(zoomLevel * 100) }}%</span>
                <button @click="zoomLevel = Math.min(3, zoomLevel + 0.1)">+</button>
            </div>
            <div v-if="isEditing" class="history-controls">
                <button @click="undo" :disabled="historyIndex <= 0">Undo</button>
                <button @click="redo" :disabled="historyIndex >= history.length - 1">Redo</button>
            </div>
            <div v-if="isEditing && selectedShopId" class="shape-toggle">
                <button @click="toggleShape()">Toggle Shape</button>
            </div>
            <div v-if="isEditing" class="save-controls">
                <button 
                    @click="saveAllCoordinates()" 
                    :disabled="!hasChanges || isSaving"
                    class="save-button"
                >
                    {{ isSaving ? 'Сохранение...' : 'Сохранить' }}
                </button>
                <span v-if="hasChanges" class="changes-indicator">● Есть изменения</span>
            </div>
            <small v-if="isEditing" class="edit-info">Кликайте на магазин для выделения, перетаскивайте для перемещения (держите Shift для осевой привязки, Ctrl+клик по ребру – добавить точку)</small>
            <small v-else class="view-info">Кликайте на магазин для просмотра</small>
        </div>
    </div>
</template>

<style scoped lang="scss">
.shops-visual-view {
    display: flex;
    flex-direction: column;
    gap: 10px;

    .canvas-container {
        border: 2px solid #e0e0e0;
        border-radius: 4px;
        background-color: #fafafa;
        overflow: auto;
        max-height: 600px;
    }

    .canvas {
        display: block;
        cursor: grab;
        user-select: none;

        &:active {
            cursor: grabbing;
        }
    }

    .shop-rect {
        stroke: #333;
        stroke-width: 2;
        cursor: pointer;
        transition: all 0.2s ease;

        &.available {
            fill: #69cf4f;
        }

        &.reserved {
            fill: #faed62;
        }

        &.broned {
            fill: #cc6140;
        }

        &.selected {
            stroke: #1e90ff;
            stroke-width: 3;
            filter: drop-shadow(0 0 4px rgba(30, 144, 255, 0.5));
        }

        &:hover:not(.selected) {
            filter: brightness(0.95);
        }
    }

    .shop-label {
        font-size: 14px;
        font-weight: bold;
        fill: #000;
        user-select: none;
    }

    .shop-client {
        font-size: 12px;
        fill: #fff;
        user-select: none;
    }

    .resize-handles {
        .resize-handle {
            fill: #1e90ff;
            stroke: #fff;
            stroke-width: 1;
            cursor: pointer;
            user-select: none;

            &:hover {
                r: 8;
                filter: drop-shadow(0 0 4px rgba(30, 144, 255, 0.7));
            }

            &.resize-handle-ne {
                cursor: nesw-resize;
            }

            &.resize-handle-nw {
                cursor: nwse-resize;
            }

            &.resize-handle-se {
                cursor: nwse-resize;
            }

            &.resize-handle-sw {
                cursor: nesw-resize;
            }

            &.resize-handle-n {
                cursor: ns-resize;
            }

            &.resize-handle-s {
                cursor: ns-resize;
            }

            &.resize-handle-w {
                cursor: ew-resize;
            }

            &.resize-handle-e {
                cursor: ew-resize;
            }
        }
    }

    .controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        background-color: #f5f5f5;
        border-radius: 4px;
        gap: 10px;

        .zoom-controls {
            display: flex;
            align-items: center;
            gap: 10px;

            button {
                padding: 4px 10px;
                background-color: #d65c10;
                color: #fff;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.2s ease;

                &:hover {
                    background-color: #b84a0b;
                }
            }

            span {
                min-width: 50px;
                text-align: center;
                font-weight: bold;
                color: #333;
            }
        }

        .history-controls {
            display: flex;
            gap: 5px;

            button {
                padding: 4px 8px;
                background-color: #1976d2;
                color: #fff;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;

                &:disabled {
                    background-color: #999;
                    cursor: default;
                }

                &:hover:not(:disabled) {
                    background-color: #155a9c;
                }
            }
        }
        .shape-toggle {
            button {
                padding: 4px 10px;
                background-color: #ffa000;
                color: #fff;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;

                &:hover {
                    background-color: #ff8f00;
                }
            }
        }

        .save-controls {
            display: flex;
            align-items: center;
            gap: 10px;

            .save-button {
                padding: 6px 16px;
                background-color: #4caf50;
                color: #fff;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                transition: background-color 0.2s ease;

                &:hover:not(:disabled) {
                    background-color: #45a049;
                    filter: drop-shadow(0 0 4px rgba(76, 175, 80, 0.4));
                }

                &:disabled {
                    background-color: #ccc;
                    cursor: not-allowed;
                    opacity: 0.6;
                }
            }

            .changes-indicator {
                color: #ff9800;
                font-size: 12px;
                font-weight: 500;
            }
        }

        .edit-info,
        .view-info {
            color: #666;
            font-size: 12px;
        }
    }

    .vertex-handle {
        fill: #fff;
        stroke: #1976d2;
        stroke-width: 2;
        cursor: move;

        &:hover {
            r: 7;
        }
        
        &.vertex-deletable:hover {
            fill: #ff4444;
            stroke: #cc0000;
            filter: drop-shadow(0 0 4px rgba(255, 68, 68, 0.6));
        }
    }
}
</style>
