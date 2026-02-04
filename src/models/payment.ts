export interface Payment {
    id: number;
    date: string;
    sum: number;
    method?: string;
}