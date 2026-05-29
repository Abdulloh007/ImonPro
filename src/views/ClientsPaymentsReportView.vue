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

interface Currency {
    code: string
    name: string
    symbol: string
}

interface ActualPayment {
    id?: number | string
    sum: number
    sum_equal: number 
    exchange_rate: number
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
    order?: string
    block?: string | number
    float?: string | number
    apartment?: string | number
    apartment_type?: string
    another_phone?: boolean
    apartment_square?: string | number
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
    apartmentInfo: string
    phone: string
    lastPaymentDate: string | null
    overdueDays: number
    overdueUnpaidCount: number
    nextPaymentDate: string | null
    totalPaid: number
    totalRemaining: number
    totalPlanned: number
    paidPercent: number
    currencySymbol: string
    actual: ActualPayment[]
    plan: PlanPayment[]
    serverLabel: string
    serverLink: string
    serverToken: string
    order: string
    client: ClientInfo
    paymentState: string
}

const EasyDataTable = defineAsyncComponent(() => import('vue3-easy-data-table'))

const indexStore = useIndexStore()
const loaderStore = UseLoaderStore()
const toasterStore = useToasterStore()

const debtors = ref<DebtorRow[]>([])
const selectedDebtor = ref<DebtorRow | null>(null)
const selectedServer = ref<string>('')
const selectedClient = ref<string>('')
const clientNameSearch = ref<string>('')
const phoneSearch = ref<string>('')
const paymentSum = ref<number>(0)
const paymentBase = ref<string>('')
const paymentDate = ref<string>('')
const paymentCurrency = ref<Currency>({ code: '972', name: 'Сомони', symbol: 'TJS' })
const isPaymentBlockOpen = ref<boolean>(false)
const isSmsBlockOpen = ref<boolean>(false)
const smsTemplates = ref<{ id: number; name: string; text: string }[]>([])
const smsForm = ref<{ phone: string; message: string }>({ phone: '', message: '' })

const currencies = ref<Currency[]>([
    { code: '840', name: 'Доллар', symbol: '$' },
    { code: '978', name: 'Евро', symbol: '€' },
    { code: '643', name: 'Рубль', symbol: '₽' },
    { code: '392', name: 'Иена', symbol: '¥' },
    { code: '826', name: 'Фунт', symbol: '£' },
    { code: '156', name: 'Юань', symbol: '¥' },
    { code: '972', name: 'Сомони', symbol: 'TJS' }
])

const serverOptions = computed(() => {
    return Array.from(new Set(debtors.value.map(item => item.serverLabel))).sort((a, b) => a.localeCompare(b, 'ru'))
})

const clientOptions = computed(() => {
    const base = selectedServer.value
        ? debtors.value.filter(item => item.serverLabel === selectedServer.value)
        : debtors.value

    return Array.from(new Set(base.map(item => item.clientName))).sort((a, b) => a.localeCompare(b, 'ru'))
})

const filteredDebtors = computed(() => {
    const normalizedPhone = phoneSearch.value.trim().replace(/\D/g, '')
    const normalizedClientName = clientNameSearch.value.trim().toLocaleLowerCase('ru')

    return debtors.value.filter(item => {
        if (selectedServer.value && item.serverLabel !== selectedServer.value) {
            return false
        }

        if (selectedClient.value && item.clientName !== selectedClient.value) {
            return false
        }

        if (normalizedClientName) {
            const itemClientName = String(item.clientName || '').toLocaleLowerCase('ru')
            if (!itemClientName.includes(normalizedClientName)) {
                return false
            }
        }

        if (!normalizedPhone) {
            return true
        }

        const itemPhone = String(item.phone || '').replace(/\D/g, '')
        return itemPhone.includes(normalizedPhone)
    })
})

const totalDebtors = computed(() => filteredDebtors.value.length)
const totalRemainingAmount = computed(() => filteredDebtors.value.reduce((sum, item) => sum + Number(item.totalRemaining || 0), 0))
const totalPaidAmount = computed(() => filteredDebtors.value.reduce((sum, item) => sum + Number(item.totalPaid || 0), 0))

const selectedMonth = ref<string>(new Date().toISOString().slice(0, 7)) // YYYY-MM

function isDateInMonth(dateStr: string | undefined | null, monthStr: string) {
    if (!dateStr) return false
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return false
    const [y, m] = monthStr.split('-').map(Number)
    return d.getFullYear() === y && (d.getMonth() + 1) === m
}

const monthlyPaidAmount = computed(() => {
    const month = selectedMonth.value
    if (!month) return 0
    return debtors.value.reduce((sum, debtor) => {
        const payments = Array.isArray(debtor.actual) ? debtor.actual : []
        const monthFiltered = payments.reduce((s, p) => {
            const value = (p as any).sum_equal ?? (p as any).sum ?? 0
            return s + (isDateInMonth(p.date, month) ? parseNumber(value) : 0)
        }, 0)
        
        return sum + monthFiltered
    }, 0)
})

const monthlyPlannedAmount = computed(() => {
    const month = selectedMonth.value
    if (!month) return 0
    return debtors.value.reduce((sum, debtor) => {
        const plans = Array.isArray(debtor.plan) ? debtor.plan : []
        const monthFiltered = plans.reduce((s, p) => {
            const value = (p as any).sum ?? 0
            return s + (isDateInMonth(p.date, month) ? parseNumber(value) : 0)
        }, 0)
        
        return sum + monthFiltered
    }, 0)
})

const headers: Header[] = [
    { text: 'Клиент', value: 'clientName', sortable: true },
    { text: 'Квартира', value: 'apartmentInfo', sortable: true },
    { text: 'Номер телефона', value: 'phone', sortable: true },
    { text: 'Дата последней оплаты', value: 'lastPaymentDate', sortable: true },
    { text: 'Дней просрочки', value: 'overdueDays', sortable: true },
    { text: 'Просроченные и не оплаченные', value: 'overdueUnpaidCount', sortable: true },
    { text: 'Дата следующей оплаты', value: 'nextPaymentDate', sortable: true },
    { text: 'Pie chart', value: 'paymentState', sortable: false }
]

const paymentBaseOptions = computed(() => {
    const plans = (selectedDebtor.value?.plan || []).filter(plan => parseNumber(plan.paid || 0) < parseNumber(plan.sum || 0))
    return plans.map((plan, index) => {
        const date = formatDate(plan.date)
        const sum = formatMoney(parseNumber(plan.sum || 0))
        const label = `${index + 1}. ${date} - ${sum}`
        return {
            label,
            value: label
        }
    })
})

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

function parseNumber(value: any) {
    if (value === undefined || value === null || value === '') return 0
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0
    const normalized = String(value).trim().replace(/\s+/g, '').replace(',', '.')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
}

function formatApartmentInfo(client?: ClientInfo) {
    const block = client?.block ? `Блок ${client.block}` : 'Блок -'
    const floor = client?.float ? `Этаж ${client.float}` : 'Этаж -'
    const apartmentType = client?.apartment_type || 'Тип -'
    const apartment = client?.apartment ? `Кв. ${client.apartment}` : 'Кв. -'
    const apartmentSquare = client?.apartment_square ? `(${client.apartment_square} м²)` : ''

    return `${block} + ${floor} + ${apartmentType} + ${apartment} + ${apartmentSquare}`
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
        return sortedActuals.reduce((s: number, a: any) => (new Date(a.date).getTime() <= dEnd ? s + parseNumber(a.sum_equal) : s), 0)
    }

    const cumActualBeforeDate = (dateStr: string) => {
        const dStart = startOfDay(dateStr).getTime()
        return sortedActuals.reduce((s: number, a: any) => (new Date(a.date).getTime() < dStart ? s + parseNumber(a.sum_equal) : s), 0)
    }

    const actualQueue = sortedActuals.map(a => ({ ...a, remaining: parseNumber(a.sum_equal) }))

    const result: PaymentRow[] = []
    let plannedCumulative = 0

    for (const p of sortedPlans) {
        const planSum = parseNumber(p.sum)
        plannedCumulative += planSum

        let toFill = planSum
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

        const remaining = Math.max(0, planSum - paidForThisPlan)
        const progress = planSum > 0 ? Math.round((paidForThisPlan / planSum) * 100) : 0

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
            planSum,
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

function mapDebtor(item: ClientPaymentsReportItem, serverLabel: string, serverLink: string, serverToken: string, index: number): DebtorRow | null {
    const actuals = Array.isArray(item.actual)
        ? item.actual.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        : []
    const plans = Array.isArray(item.plan)
        ? item.plan.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        : []

    const paymentRows = buildPaymentRows(plans, actuals)
    const overdueRows = paymentRows.filter(row => row.status === 'overdue' && row.remaining > 0)
    const unpaidRows = paymentRows.filter(row => row.remaining > 0)

    const firstOverdueRow = overdueRows[0] || null
    const nextPaymentRow = firstOverdueRow || unpaidRows[0] || null
    const lastPayment = actuals.length > 0 ? actuals[actuals.length - 1] : null
    const totalPaid = paymentRows.reduce((sum, row) => sum + Number(row.paidForThisPlan || 0), 0)
    const totalRemaining = paymentRows.reduce((sum, row) => sum + Number(row.remaining || 0), 0)
    const totalPlanned = paymentRows.reduce((sum, row) => sum + Number(row.planSum || 0), 0)
    const paidPercent = totalPlanned > 0 ? Math.round((totalPaid / totalPlanned) * 100) : 0
    const currencySymbol = resolveCurrencySymbol(actuals[0]?.currency)

    return {
        id: String(item.client?.id || item.client?.phone || item.client?.name || `${serverLabel}-${index}`),
        clientName: item.client?.name || item.client?.full_name || 'Без имени',
        apartmentInfo: formatApartmentInfo(item.client),
        phone: item.client?.phone || '—',
        lastPaymentDate: lastPayment?.date || null,
        overdueDays: Number(firstOverdueRow?.overdueDays || 0),
        overdueUnpaidCount: overdueRows.length,
        nextPaymentDate: nextPaymentRow?.date || null,
        totalPaid,
        totalRemaining,
        totalPlanned,
        paidPercent,
        currencySymbol,
        actual: actuals,
        plan: plans,
        serverLabel,
        serverLink,
        serverToken,
        order: String(item.client?.order || (item as any)?.order || ''),
        client: item.client || {},
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
    paymentDate.value = new Date().toISOString().slice(0, 10)
    paymentBase.value = ''
    if (paymentBaseOptions.value.length > 0) {
        paymentBase.value = paymentBaseOptions.value[0].value
    }
    isPaymentBlockOpen.value = false
    isSmsBlockOpen.value = false
    smsForm.value.phone = item.phone || ''
    smsForm.value.message = `Уважаемый(ая) ${item.clientName}, напоминаем о необходимости оплаты по Вашему договору. С уважением, IMON GROUP.`
    getSmsTemplates()
}

function closeDetails() {
    selectedDebtor.value = null
}

function togglePaymentBlock() {
    isPaymentBlockOpen.value = !isPaymentBlockOpen.value
}

function toggleSmsBlock() {
    isSmsBlockOpen.value = !isSmsBlockOpen.value
}

function checkFieldsPayment() {
    if (!paymentSum.value || paymentSum.value <= 0) {
        toasterStore.add({
            title: 'Ошибка',
            descr: 'Сумма незаполнена или равна 0',
            type: 'danger'
        })
        return false
    }

    if (!paymentCurrency.value) {
        toasterStore.add({
            title: 'Ошибка',
            descr: 'Валюта незаполнена',
            type: 'danger'
        })
        return false
    }

    if (!selectedDebtor.value?.order) {
        toasterStore.add({
            title: 'Ошибка',
            descr: 'Не найден номер договора для оплаты',
            type: 'danger'
        })
        return false
    }

    if (!paymentBase.value) {
        toasterStore.add({
            title: 'Ошибка',
            descr: 'Выберите основание оплаты',
            type: 'danger'
        })
        return false
    }

    return true
}

function setSelectedTemplate(id: string) {
    const template = smsTemplates.value.find(t => t.id.toString() === id)
    if (template) {
        smsForm.value.message = template.text
    }
}

function onTemplateChange(event: Event) {
    const target = event.target as HTMLSelectElement | null
    if (!target) return
    setSelectedTemplate(target.value)
}

function getSmsTemplates() {
    if (!selectedDebtor.value) return

    axios.get(selectedDebtor.value.serverLink + '/api/sms-templates', {
        headers: {
            Authorization: 'Basic ' + selectedDebtor.value.serverToken
        }
    })
        .then(res => {
            smsTemplates.value = Array.isArray(res.data) ? res.data : []
        })
        .catch(() => {
            smsTemplates.value = []
        })
}

function sendSMS() {
    if (!selectedDebtor.value) return

    if (!smsForm.value.phone || !smsForm.value.message) {
        toasterStore.add({
            title: 'Ошибка',
            descr: 'Заполните телефон и текст сообщения',
            type: 'danger'
        })
        return
    }

    loaderStore.isActive = true
    axios.post(selectedDebtor.value.serverLink + '/api/sms', smsForm.value, {
        headers: {
            Authorization: 'Basic ' + selectedDebtor.value.serverToken
        }
    })
        .then(() => {
            toasterStore.add({
                title: 'Успех',
                descr: 'SMS успешно отправлено',
                type: 'success'
            })
        })
        .catch(err => toasterStore.add({
            title: err?.code || 'Ошибка',
            descr: err?.message || 'Не удалось отправить SMS',
            type: 'danger'
        }))
        .finally(() => {
            loaderStore.isActive = false
        })
}

function createPaymentFromModal() {
    if (!selectedDebtor.value || !checkFieldsPayment()) {
        return
    }

    loaderStore.isActive = true
    axios.post(selectedDebtor.value.serverLink + '/api/income', {
        id: null,
        order: selectedDebtor.value.order,
        date: paymentDate.value ? new Date(paymentDate.value).toISOString() : new Date().toISOString(),
        sum: paymentSum.value,
        currency: paymentCurrency.value,
        base: paymentBase.value,
        client: selectedDebtor.value.client
    }, {
        headers: {
            Authorization: 'Basic ' + selectedDebtor.value.serverToken
        }
    })
        .then(res => {
            paymentSum.value = 0
            paymentBase.value = ''

            const blobData = atob(res?.data?.bill || '')
            if (blobData) {
                const uintArray = new Uint8Array(blobData.length)
                for (let i = 0; i < blobData.length; i++) {
                    uintArray[i] = blobData.charCodeAt(i)
                }

                const blob = new Blob([uintArray], { type: 'application/pdf' })
                const pdfUrl = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = pdfUrl
                a.style.display = 'none'
                a.download = (res?.data?.name || 'bill') + '.pdf'
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(pdfUrl)
            }

            loadReport()
            toasterStore.add({
                title: 'Успех',
                descr: 'Оплата успешно добавлена',
                type: 'success'
            })
        })
        .catch(err => toasterStore.add({
            title: err?.code || 'Ошибка',
            descr: err?.message || 'Не удалось создать оплату',
            type: 'danger'
        }))
        .finally(() => {
            loaderStore.isActive = false
        })
}

function onServerChange() {
    if (!selectedServer.value) {
        return
    }

    if (!clientOptions.value.includes(selectedClient.value)) {
        selectedClient.value = ''
    }
}

function clearFilters() {
    selectedServer.value = ''
    selectedClient.value = ''
    clientNameSearch.value = ''
    phoneSearch.value = ''
}

function downloadExcel() {
    if (!filteredDebtors.value.length) {
        toasterStore.add({
            title: 'Ошибка',
            descr: 'Нет данных для выгрузки',
            type: 'danger'
        })
        return
    }

    const exportRows = filteredDebtors.value.map(item => ({
        Клиент: item.clientName,
        Квартира: item.apartmentInfo,
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
            // servers.map(server => axios.get(indexStore.apiHref + '/api/clients-payments-report', {
                headers: {
                    Authorization: 'Basic ' + server.token
                }
            }))
        )

        const rows = responses.flatMap((response, responseIndex) => {
            const serverInfo = servers[responseIndex]
            const serverLabel = getServerLabel(serverInfo.link)
            const responseData = response.data
            const data: ClientPaymentsReportItem[] = Array.isArray(responseData)
                ? responseData
                : Array.isArray(responseData?.data)
                    ? responseData.data
                    : []
            return data
                .map((item, index) => mapDebtor(item, serverLabel, serverInfo.link, serverInfo.token, index))
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
            .right-slot.report-actions.ip-dfw
                .report-total Найдено: {{ totalDebtors }}
                button.ip-btn.ip-btn_info(type="button" @click="downloadExcel") Excel
                .month-row
                    input(type="month" v-model="selectedMonth")

    section.report-summary
        .ip-container.summary-grid
            .summary-card
                h4 Осталось
                p.summary-value {{ formatMoney(totalRemainingAmount) }}
            .summary-card
                h4 Оплачено
                p.summary-value.success {{ formatMoney(totalPaidAmount) }}
            .summary-card
                h4 Запланировано за месяц
                p.summary-value {{ formatMoney(monthlyPlannedAmount) }}
            .summary-card
                h4 Оплачено за месяц
                p.summary-value.success {{ formatMoney(monthlyPaidAmount) }}

    section.report-filters
        .ip-container.filters-grid
            .ip-filter.ip-dfw
                label(for="serverFilter") Сервер
                select#serverFilter(v-model="selectedServer" @change="onServerChange")
                    option(value="") Все серверы
                    option(v-for="server in serverOptions" :key="server" :value="server") {{ server }}
            .ip-filter.ip-dfw
                label(for="clientFilter") Клиент
                select#clientFilter(v-model="selectedClient")
                    option(value="") Все клиенты
                    option(v-for="client in clientOptions" :key="client" :value="client") {{ client }}
            .ip-filter.ip-dfw
                label(for="clientNameSearch") Поиск по имени клиента
                input#clientNameSearch(type="text" v-model="clientNameSearch" placeholder="Введите имя клиента")
            .ip-filter.ip-dfw
                label(for="phoneSearch") Поиск по номеру
                input#phoneSearch(type="text" v-model="phoneSearch" placeholder="Введите номер")
            .ip-filter.ip-dfw
                button.ip-btn.ip-btn_info(type="button" @click="clearFilters") Сбросить

    section.ip-list
        .ip-container.ip-dfw
            EasyDataTable.report-table(
                v-if="filteredDebtors.length"
                :headers="headers"
                :items="filteredDebtors"
                alternating
                buttons-pagination
                border-cell
                :rows-per-page="100"
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
                template(#item-overdueUnpaidCount="item")
                    span.overdue-badge(:class="{ danger: item.overdueUnpaidCount > 0 }") {{ item.overdueUnpaidCount }}
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
                .meta-item
                    strong Квартира:
                    span {{ selectedDebtor.apartmentInfo }}
            .report-modal__actions
                .action-card
                    .action-card__header
                        h4 Оплата
                        button.action-toggle(type="button" @click="togglePaymentBlock") {{ isPaymentBlockOpen ? 'Свернуть' : 'Развернуть' }}
                    .action-card__content(v-if="isPaymentBlockOpen")
                        .action-grid
                            .ip-inp.ip-dfw
                                label Сумма
                                input(type="number" v-model="paymentSum")
                            .ip-inp.ip-dfw
                                label Валюта
                                select(v-model="paymentCurrency")
                                    option(v-for="currency in currencies" :key="currency.code" :value="currency") {{ currency.name }}
                            .ip-inp.ip-dfw
                                label Основание
                                select(v-model="paymentBase")
                                    option(value="" disabled) Выберите основание
                                    option(v-for="option in paymentBaseOptions" :key="option.value" :value="option.value") {{ option.label }}
                            .ip-inp.ip-dfw
                                label Дата
                                input(type="date" v-model="paymentDate")
                        .action-footer
                            button.ip-btn(type="button" @click="createPaymentFromModal") Добавить оплату

                .action-card
                    .action-card__header
                        h4 SMS
                        button.action-toggle(type="button" @click="toggleSmsBlock") {{ isSmsBlockOpen ? 'Свернуть' : 'Развернуть' }}
                    .action-card__content(v-if="isSmsBlockOpen")
                        .action-grid
                            .ip-inp.ip-dfw
                                label Телефон
                                input(type="text" v-model="smsForm.phone" placeholder="Номер телефона")
                            .ip-inp.ip-dfw
                                label Шаблон
                                select(@change="onTemplateChange")
                                    option(value="" disabled selected) Выберите шаблон
                                    option(v-for="template in smsTemplates" :value="template.id" :key="template.id") {{ template.name }}
                            .ip-inp.ip-dfw.wide
                                label Сообщение
                                textarea(rows="4" v-model="smsForm.message" placeholder="Введите сообщение")
                        .action-footer
                            button.ip-btn.ip-btn_info(type="button" @click="sendSMS") Отправить SMS
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

.report-filters {
    margin-bottom: 16px;
}

.filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
    align-items: end;

    .ip-filter {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;

        label {
            font-size: 13px;
            color: var(--color-muted);
            font-weight: 600;
        }

        input,
        select {
            width: 100%;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            height: 38px;
            padding: 0 10px;
            outline: none;
            background: var(--color-surface);
            color: var(--color-text);
        }

        .ip-btn {
            width: 100%;
            height: 38px;
        }
    }
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 14px;
}

.summary-card {
    background: var(--color-surface);
    border-radius: 12px;
    padding: 14px 16px;
    box-shadow: 0 1px 6px -3px var(--color-border);

    h4 {
        margin: 0 0 8px;
        font-size: 14px;
        color: var(--color-muted);
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
    background: var(--color-surface-alt);
    font-weight: 600;
}

.client-cell {
    display: flex;
    flex-direction: column;
    gap: 4px;

    small {
        color: var(--color-muted);
    }
}

.overdue-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 52px;
    padding: 4px 8px;
    border-radius: 999px;
    background: var(--color-surface-alt);
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
        background: var(--color-surface);
        border-radius: 50%;
    }

    span {
        position: relative;
        z-index: 1;
        font-size: 10px;
        font-weight: 700;
        color: var(--color-text);
    }
}

.pie-text {
    font-size: 12px;
    color: var(--color-text);
}

.ip-empty {
    width: 100%;
    padding: 40px 20px;
    text-align: center;
    color: var(--color-muted);
    background: var(--color-surface);
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
    background: var(--color-surface);
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
        color: var(--color-muted);
    }
}

.report-modal__close {
    border: none;
    background: var(--color-surface-alt);
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
    background: var(--color-surface);
    border-radius: 10px;
    padding: 8px 12px;
}

.report-modal__actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
    margin-bottom: 16px;
}

.action-card {
    background: var(--color-surface);
    border-radius: 12px;
    padding: 12px;

    .action-card__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
    }

    .action-card__content {
        margin-top: 10px;
    }

    h4 {
        margin: 0;
    }
}

.action-toggle {
    border: none;
    background: var(--color-surface-alt);
    color: #2f4cc8;
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 12px;
    cursor: pointer;
}

.action-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;

    .ip-inp {
        display: flex;
        flex-direction: column;
        gap: 6px;

        label {
            font-size: 13px;
            color: var(--color-muted);
            font-weight: 600;
        }

        input,
        select,
        textarea {
            width: 100%;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            padding: 8px 10px;
            background: var(--color-surface);
            color: var(--color-text);
            outline: none;
        }

        textarea {
            resize: vertical;
            min-height: 90px;
        }

        &.wide {
            grid-column: 1 / -1;
        }
    }
}

.action-footer {
    margin-top: 10px;
    display: flex;
    justify-content: flex-end;
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

    .report-modal__actions {
        grid-template-columns: 1fr;
    }

    .action-grid {
        grid-template-columns: 1fr;
    }
}
</style>
