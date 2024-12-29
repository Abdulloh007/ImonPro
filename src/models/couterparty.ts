export interface Counterparty {
    full_name: string;
    address: string;
    passport: string;
    date_of_issue: string | Date;
    place_of_issue: string;
}