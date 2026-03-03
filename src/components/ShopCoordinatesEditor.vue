<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ShopCoordinates } from '@/models/shop'

interface Props {
    coordinates: ShopCoordinates
}

const props = defineProps<Props>()

const emit = defineEmits<{
    update: [coords: ShopCoordinates]
}>()

const localCoords = ref<ShopCoordinates>({ ...props.coordinates })

watch(
    () => props.coordinates,
    (newCoords) => {
        localCoords.value = { ...newCoords }
    }
)

function updateX(value: number) {
    localCoords.value.x = value
    emit('update', { ...localCoords.value })
}

function updateY(value: number) {
    localCoords.value.y = value
    emit('update', { ...localCoords.value })
}

function updateWidth(value: number) {
    localCoords.value.width = value
    emit('update', { ...localCoords.value })
}

function updateHeight(value: number) {
    localCoords.value.height = value
    emit('update', { ...localCoords.value })
}
</script>

<template>
    <div class="coord-editor">
        <div class="coord-field">
            <label>X:</label>
            <input
                type="number"
                :value="localCoords.x"
                @input="(e) => updateX(parseFloat((e.target as HTMLInputElement).value))"
            />
        </div>
        <div class="coord-field">
            <label>Y:</label>
            <input
                type="number"
                :value="localCoords.y"
                @input="(e) => updateY(parseFloat((e.target as HTMLInputElement).value))"
            />
        </div>
        <div class="coord-field">
            <label>Width:</label>
            <input
                type="number"
                :value="localCoords.width"
                @input="(e) => updateWidth(parseFloat((e.target as HTMLInputElement).value))"
            />
        </div>
        <div class="coord-field">
            <label>Height:</label>
            <input
                type="number"
                :value="localCoords.height"
                @input="(e) => updateHeight(parseFloat((e.target as HTMLInputElement).value))"
            />
        </div>
    </div>
</template>

<style scoped lang="scss">
.coord-editor {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 10px;
    background-color: #f5f5f5;
    border-radius: 4px;

    .coord-field {
        display: flex;
        align-items: center;
        gap: 5px;

        label {
            font-weight: bold;
            min-width: 40px;
        }

        input {
            flex: 1;
            padding: 5px;
            border: 1px solid #ddd;
            border-radius: 3px;
            font-size: 12px;
        }
    }
}
</style>
