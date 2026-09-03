export interface Payment {
    id: number | string;
    date: string;
    sum: number;
    method?: string;
    comment?: string;
}
