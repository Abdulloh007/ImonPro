import type { Counterparty } from "./couterparty"
import type Currency from "./currency"

export interface Apartment {
    id: string
    name: string
    project: string
    block: string
    room_count: number
    room_number: string
    room_square: number
    room_plane: string
    block_plane: string
    client: Counterparty | null
    description: string
    order: string
    currency_code: string
}