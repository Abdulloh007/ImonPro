<script setup lang="ts">
import { useIndexStore } from '@/stores'
import { UseLoaderStore } from '@/stores/loader'
import { useToasterStore } from '@/stores/toaster'
import axios from 'axios'
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import type { Header } from 'vue3-easy-data-table'
import 'vue3-easy-data-table/dist/style.css'
import * as XLSX from 'xlsx'
import PaymentSchedule from '@/components/PaymentSchedule.vue'

interface ActualPayment {
    id?: number | string
    sum: number
    date: string
    currency?: any
    base?: string
    method?: string
}

interface PlanPayment {
    id?: number | string
    sum: number
    date: string
    paid?: number
}

interface ClientInfo {
    id?: string
    name?: string
    full_name?: string
    phone?: string
}

interface ClientPaymentsReportItem {
    actual?: ActualPayment[]
    plan?: PlanPayment[]
    client?: ClientInfo
    sum?: number
    price?: number
    quantity?: number
}

interface PaymentRow {
    id?: number | string
    date: string
    planSum: number
    paidForThisPlan: number
    remaining: number
    progress: number
    status: string
    lastUsedDate: string | null
    overdueDays: number
}

interface DebtorRow {
    id: string
    clientName: string
    phone: string
    lastPaymentDate: string | null
    overdueDays: number
    nextPaymentDate: string | null
    totalPaid: number
    totalRemaining: number
    totalPlanned: number
    paidPercent: number
    currencySymbol: string
    actual: ActualPayment[]
    plan: PlanPayment[]
    serverLabel: string
    paymentState: string
}

const EasyDataTable = defineAsyncComponent(() => import('vue3-easy-data-table'))

const indexStore = useIndexStore()
const loaderStore = UseLoaderStore()
const toasterStore = useToasterStore()

const debtors = ref<DebtorRow[]>([])
const selectedDebtor = ref<DebtorRow | null>(null)

const totalDebtors = computed(() => debtors.value.length)
const totalRemainingAmount = computed(() => debtors.value.reduce((sum, item) => sum + Number(item.totalRemaining || 0), 0))
const totalPaidAmount = computed(() => debtors.value.reduce((sum, item) => sum + Number(item.totalPaid || 0), 0))

const headers: Header[] = [
    { text: 'Клиент', value: 'clientName', sortable: true },
    { text: 'Номер телефона', value: 'phone', sortable: true },
    { text: 'Дата последней оплаты', value: 'lastPaymentDate', sortable: true },
    { text: 'Дней просрочки', value: 'overdueDays', sortable: true },
    { text: 'Дата следующей оплаты', value: 'nextPaymentDate', sortable: true },
    { text: 'Pie chart', value: 'paymentState', sortable: false }
]

function startOfDay(value: string | Date) {
    const date = new Date(value)
    date.setHours(0, 0, 0, 0)
    return date
}

function endOfDay(value: string | Date) {
    const date = new Date(value)
    date.setHours(23, 59, 59, 999)
    return date
}

function formatDate(value?: string | null) {
    if (!value) {
        return '—'
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return '—'
    }

    return date.toLocaleDateString('ru-RU')
}

function formatMoney(value?: number) {
    return Number(value || 0).toLocaleString('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    })
}

function getServers() {
    if (Array.isArray(indexStore.servers) && indexStore.servers.length > 0) {
        return indexStore.servers
    }

    if (indexStore.apiHref && indexStore.token) {
        return [{
            link: indexStore.apiHref,
            token: indexStore.token
        }]
    }

    return []
}

function resolveCurrencySymbol(currency: any) {
    if (currency?.symbol) return currency.symbol

    const code = String(currency?.code || currency || '')
    const map: Record<string, string> = {
        '840': '$',
        '978': '€',
        '643': '₽',
        '392': '¥',
        '826': '£',
        '156': '¥',
        '972': 'TJS'
    }

    return map[code] || ''
}

function getServerLabel(link: string) {
    try {
        return new URL(link).host
    } catch {
        return link
    }
}

function buildPaymentRows(plans: PlanPayment[], actuals: ActualPayment[]) {
    const today = new Date()
    const sortedPlans = (plans || []).slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const sortedActuals = (actuals || []).slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const cumActualByDate = (dateStr: string) => {
        const dEnd = endOfDay(dateStr).getTime()
        return sortedActuals.reduce((s: number, a: any) => (new Date(a.date).getTime() <= dEnd ? s + Number(a.sum) : s), 0)
    }

    const cumActualBeforeDate = (dateStr: string) => {
        const dStart = startOfDay(dateStr).getTime()
        return sortedActuals.reduce((s: number, a: any) => (new Date(a.date).getTime() < dStart ? s + Number(a.sum) : s), 0)
    }

    const actualQueue = sortedActuals.map(a => ({ ...a, remaining: Number(a.sum || 0) }))

    const result: PaymentRow[] = []
    let plannedCumulative = 0

    for (const p of sortedPlans) {
        plannedCumulative += Number(p.sum)

        let toFill = Number(p.sum || 0)
        let paidForThisPlan = 0
        let lastUsedDate: string | null = null

        while (toFill > 0 && actualQueue.length) {
            const cur = actualQueue[0]
            if (cur.remaining <= 0) {
                actualQueue.shift()
                continue
            }

            const alloc = Math.min(toFill, cur.remaining)
            paidForThisPlan += alloc
            cur.remaining -= alloc
            toFill -= alloc
            lastUsedDate = cur.date || lastUsedDate

            if (cur.remaining <= 0) {
                actualQueue.shift()
            }
        }

        const remaining = Math.max(0, Number(p.sum) - paidForThisPlan)
        const progress = Number(p.sum) > 0 ? Math.round((paidForThisPlan / Number(p.sum)) * 100) : 0

        const plannedDate = startOfDay(new Date(p.date))
        let overdueDays = 0

        if (paidForThisPlan >= Number(p.sum)) {
            if (lastUsedDate) {
                const paidDate = startOfDay(new Date(lastUsedDate))
                overdueDays = Math.floor((paidDate.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24))
            }
        } else {
            overdueDays = Math.floor((startOfDay(today).getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24))
        }

        if (overdueDays < 0) overdueDays = 0

        const actualByDate = cumActualByDate(p.date)
        const actualBeforeDate = cumActualBeforeDate(p.date)

        let status = 'pending'
        if (actualBeforeDate >= plannedCumulative) status = 'early'
        else if (actualByDate >= plannedCumulative) status = 'ontime'
        else if (startOfDay(new Date(p.date)).getTime() < startOfDay(today).getTime() && actualByDate < plannedCumulative) status = 'overdue'

        result.push({
            id: p.id,
            date: p.date,
            planSum: Number(p.sum),
            paidForThisPlan,
            remaining,
            progress,
            status,
            lastUsedDate,
            overdueDays
        })
    }

    return result
}

function mapDebtor(item: ClientPaymentsReportItem, serverLabel: string, index: number): DebtorRow | null {
    const actuals = Array.isArray(item.actual)
        ? item.actual.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        : []
    const plans = Array.isArray(item.plan)
        ? item.plan.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        : []

    const paymentRows = buildPaymentRows(plans, actuals)
    const overdueRows = paymentRows.filter(row => row.status === 'overdue' && row.remaining > 0)

    if (overdueRows.length === 0) {
        return null
    }

    const firstOverdueRow = overdueRows[0]
    const lastPayment = actuals.length > 0 ? actuals[actuals.length - 1] : null
    const totalPaid = paymentRows.reduce((sum, row) => sum + Number(row.paidForThisPlan || 0), 0)
    const totalRemaining = paymentRows.reduce((sum, row) => sum + Number(row.remaining || 0), 0)
    const totalPlanned = paymentRows.reduce((sum, row) => sum + Number(row.planSum || 0), 0)
    const paidPercent = totalPlanned > 0 ? Math.round((totalPaid / totalPlanned) * 100) : 0
    const currencySymbol = resolveCurrencySymbol(actuals[0]?.currency)

    return {
        id: String(item.client?.id || item.client?.phone || item.client?.name || `${serverLabel}-${index}`),
        clientName: item.client?.name || item.client?.full_name || 'Без имени',
        phone: item.client?.phone || '—',
        lastPaymentDate: lastPayment?.date || null,
        overdueDays: Number(firstOverdueRow.overdueDays || 0),
        nextPaymentDate: firstOverdueRow.date || null,
        totalPaid,
        totalRemaining,
        totalPlanned,
        paidPercent,
        currencySymbol,
        actual: actuals,
        plan: plans,
        serverLabel,
        paymentState: ''
    }
}

function getPieStyle(item: DebtorRow) {
    const percent = Math.max(0, Math.min(100, Number(item.paidPercent || 0)))
    return {
        background: `conic-gradient(#28a745 0% ${percent}%, #dc3545 ${percent}% 100%)`
    }
}

function openDetails(item: DebtorRow) {
    selectedDebtor.value = item
}

function closeDetails() {
    selectedDebtor.value = null
}

function downloadExcel() {
    if (!debtors.value.length) {
        toasterStore.add({
            title: 'Ошибка',
            descr: 'Нет данных для выгрузки',
            type: 'danger'
        })
        return
    }

    const exportRows = debtors.value.map(item => ({
        Клиент: item.clientName,
        Телефон: item.phone,
        'Дата последней оплаты': formatDate(item.lastPaymentDate),
        'Дней просрочки': item.overdueDays,
        'Дата следующей оплаты': formatDate(item.nextPaymentDate),
        Оплачено: item.totalPaid,
        Осталось: item.totalRemaining,
        Сервер: item.serverLabel
    }))

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Должники')
    XLSX.writeFile(workbook, 'clients-payments-report.xlsx')
}

async function loadReport() {
    const servers = getServers()

    if (servers.length === 0) {
        debtors.value = []
        return
    }

    loaderStore.isActive = true

    try {
        const responses = await Promise.all(
            servers.map(server => axios.get(server.link + '/api/clients-payments-report', {
                headers: {
                    Authorization: 'Basic ' + server.token
                }
            }))
        )

        const rows = responses.flatMap((response, responseIndex) => {
            const serverLabel = getServerLabel(servers[responseIndex].link)
            const data = Array.isArray(response.data) ? response.data : []
            return data
                .map((item, index) => mapDebtor(item, serverLabel, index))
                .filter((row): row is DebtorRow => Boolean(row))
        }).sort((a, b) => b.overdueDays - a.overdueDays)

        debtors.value = rows
    } catch (err: any) {
        debtors.value = []
        toasterStore.add({
            title: err?.code || 'Ошибка',
            descr: err?.message || 'Не удалось загрузить отчет по должникам',
            type: 'danger'
        })
    } finally {
        loaderStore.isActive = false
    }
}

onMounted(() => {
    loadReport()
})
</script>

<template lang="pug">
main.ip-main
    section.header
        .ip-container.ip-dfw.ip-justify-content-between.ip-align-items-center
            .left-slot
                h2.title Должники по оплатам
                .bread-crumbs
                    RouterLink(to="/reports") Все отчеты
            .right-slot.report-actions
                .report-total Найдено: {{ totalDebtors }}
                button.ip-btn.ip-btn_info(type="button" @click="downloadExcel") Excel

    section.report-summary
        .ip-container.summary-grid
            .summary-card
                h4 Осталось
                p.summary-value {{ formatMoney(totalRemainingAmount) }}
            .summary-card
                h4 Оплачено
                p.summary-value.success {{ formatMoney(totalPaidAmount) }}

    section.ip-list
        .ip-container.ip-dfw
            EasyDataTable.report-table(
                v-if="debtors.length"
                :headers="headers"
                :items="debtors"
                alternating
                buttons-pagination
                border-cell
                :rows-per-page="10"
                sort-by="overdueDays"
                sort-type="desc"
                @click-row="openDetails"
            )
                template(#item-clientName="item")
                    .client-cell
                        strong {{ item.clientName }}
                        //small {{ item.serverLabel }}
                template(#item-lastPaymentDate="item")
                    span {{ formatDate(item.lastPaymentDate) }}
                template(#item-overdueDays="item")
                    span.overdue-badge(:class="{ danger: item.overdueDays > 0 }") {{ item.overdueDays }}
                template(#item-nextPaymentDate="item")
                    span {{ formatDate(item.nextPaymentDate) }}
                template(#item-paymentState="item")
                    .pie-cell
                        .pie-mini(:style="getPieStyle(item)")
                            span {{ item.paidPercent }}%
                        .pie-text
                            div Оплачено: {{ formatMoney(item.totalPaid) }} {{ item.currencySymbol }}
                            div Осталось: {{ formatMoney(item.totalRemaining) }} {{ item.currencySymbol }}
            .ip-empty(v-else)
                p Должники с просрочкой не найдены

    .report-modal(v-if="selectedDebtor")
        .report-modal__backdrop(@click="closeDetails")
        .report-modal__container
            .report-modal__header
                .report-modal__title
                    h3 {{ selectedDebtor.clientName }}
                    p {{ selectedDebtor.phone }}
                button.report-modal__close(type="button" @click="closeDetails") ×
            .report-modal__meta
                .meta-item
                    strong Последняя оплата:
                    span {{ formatDate(selectedDebtor.lastPaymentDate) }}
                .meta-item
                    strong Следующая оплата:
                    span {{ formatDate(selectedDebtor.nextPaymentDate) }}
                .meta-item
                    strong Просрочка:
                    span {{ selectedDebtor.overdueDays }} дн.
            PaymentSchedule(
                :plannedPayments="selectedDebtor.plan"
                :actualPayments="selectedDebtor.actual"
                :currencySymbol="selectedDebtor.currencySymbol"
            )
</template>

<style scoped lang="scss">
.report-actions {
    gap: 12px;
}

.report-summary {
    margin-bottom: 16px;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 14px;
}

.summary-card {
    background: #fff;
    border-radius: 12px;
    padding: 14px 16px;
    box-shadow: 0 1px 6px -3px #000;

    h4 {
        margin: 0 0 8px;
        font-size: 14px;
        color: #667085;
    }
}

.summary-value {
    margin: 0;
    font-size: 24px;
    font-weight: 700;

    &.success {
        color: #1f8b4c;
    }
}

.report-total {
    padding: 8px 14px;
    border-radius: 10px;
    background: #f4f4f4;
    font-weight: 600;
}

.client-cell {
    display: flex;
    flex-direction: column;
    gap: 4px;

    small {
        color: #667085;
    }
}

.overdue-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 52px;
    padding: 4px 8px;
    border-radius: 999px;
    background: #f2f4f7;
    font-weight: 700;

    &.danger {
        background: #fee4e2;
        color: #b42318;
    }
}

.pie-cell {
    display: flex;
    align-items: center;
    gap: 10px;
}

.pie-mini {
    width: 48px;
    height: 48px;
    min-width: 48px;
    border-radius: 50%;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;

    &::after {
        content: '';
        position: absolute;
        inset: 8px;
        background: #fff;
        border-radius: 50%;
    }

    span {
        position: relative;
        z-index: 1;
        font-size: 10px;
        font-weight: 700;
    }
}

.pie-text {
    font-size: 12px;
    color: #344054;
}

.ip-empty {
    width: 100%;
    padding: 40px 20px;
    text-align: center;
    color: #666;
    background: #f8f8f8;
    border-radius: 12px;
}

.report-modal {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
}

.report-modal__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(16, 24, 40, 0.55);
}

.report-modal__container {
    position: relative;
    z-index: 1;
    width: min(1200px, calc(100vw - 24px));
    max-height: calc(100vh - 24px);
    overflow: auto;
    background: #fff;
    border-radius: 16px;
    padding: 16px;
}

.report-modal__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
}

.report-modal__title {
    h3 {
        margin: 0 0 4px;
    }

    p {
        margin: 0;
        color: #667085;
    }
}

.report-modal__close {
    border: none;
    background: #f2f4f7;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    font-size: 24px;
    cursor: pointer;
}

.report-modal__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-bottom: 16px;
}

.meta-item {
    display: flex;
    gap: 6px;
    background: #f9fafb;
    border-radius: 10px;
    padding: 8px 12px;
}

:deep(.vue3-easy-data-table__main) {
    cursor: pointer;
}

:deep(.report-table table) {
    min-width: 1100px;
}

@media (max-width: 768px) {
    .pie-cell {
        flex-direction: column;
        align-items: flex-start;
    }

    .report-modal__meta {
        flex-direction: column;
    }
}
</style>
