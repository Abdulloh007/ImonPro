export interface Counterparty {
    id: string | null;
    name?: string
    full_name: string;
    address: string;
    passport: string;
    inn: string;
    date_of_issue: string | Date;
    place_of_issue: string;
    phone?: string;
    another_phone?: boolean;
    order?: string | null;
    order_date?: string | null;
}