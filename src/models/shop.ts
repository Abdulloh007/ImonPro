export interface ShopCoordinates {
    id: string
    type?: 'rect' | 'polygon'
    x?: number
    y?: number
    width?: number
    height?: number
    points?: Array<{ x: number; y: number }>
    rotation?: number
}

export interface Shop {
    id: string
    float: number
    name: string
    client: string
    reserved: boolean
    broned: boolean
    coordinates?: ShopCoordinates
    room_number: string | number
}
