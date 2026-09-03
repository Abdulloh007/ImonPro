<script setup lang="ts">
import { useIndexStore } from '@/stores'
import { UseLoaderStore } from '@/stores/loader'
import { useToasterStore } from '@/stores/toaster'
import axios from '@/lib/httpClient'
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import type { Header } from 'vue3-easy-data-table'
import 'vue3-easy-data-table/dist/style.css'
import * as XLSX from 'xlsx'
import PaymentSchedule from '@/components/PaymentSchedule.vue'
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import receiptTemplateUrl from '@/assets/templates/pko-template.docx?inline'

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
    comment?: string
}

interface ClientInfo {
    id?: string
    name?: string
    full_name?: string
    phone?: string
    order?: string
    order_id?: string | number
    order_number?: string | number
    contract?: string | number | { id?: string | number; number?: string | number; name?: string | number }
    contract_id?: string | number
    contract_number?: string | number
    block?: string | number
    float?: string | number
    apartment?: string | number
    apartment_type?: string
    type?: string
    dweller?: boolean
    another_phone?: boolean
    apartment_square?: string | number
}

interface ClientPaymentsReportItem {
    actual?: ActualPayment[]
    plan?: PlanPayment[]
    client?: ClientInfo
    order?: string | number | { id?: string | number; number?: string | number; name?: string | number }
    order_id?: string | number
    order_number?: string | number
    contract?: string | number | { id?: string | number; number?: string | number; name?: string | number }
    contract_id?: string | number
    contract_number?: string | number
    type?: string
    dweller?: boolean
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
    objectType: string
    dweller: boolean
    client: ClientInfo
    paymentState: string
}

interface PaymentReceipt {
    receiptNumber: string
    createdAt: string
    paymentDate: string
    clientName: string
    phone: string
    order: string
    objectType: string
    objectInfo: string
    base: string
    sum: number
    currency: Currency
    serverLabel: string
}

type PdfMakeInstance = typeof import('pdfmake/build/pdfmake')

let pdfMakePromise: Promise<PdfMakeInstance> | null = null

async function getPdfMake() {
    if (!pdfMakePromise) {
        pdfMakePromise = Promise.all([
            import('pdfmake/build/pdfmake'),
            import('pdfmake/build/vfs_fonts')
        ]).then(([pdfMakeModule, pdfFontsModule]) => {
            const pdfMake = pdfMakeModule.default || pdfMakeModule
            const pdfFonts = pdfFontsModule.default || pdfFontsModule
            pdfMake.addVirtualFileSystem(pdfFonts)
            return pdfMake
        })
    }

    return pdfMakePromise
}

const EasyDataTable = defineAsyncComponent(() => import('vue3-easy-data-table'))

const indexStore = useIndexStore()
const loaderStore = UseLoaderStore()
const toasterStore = useToasterStore()

const debtors = ref<DebtorRow[]>([])
const selectedDebtor = ref<DebtorRow | null>(null)
const selectedServer = ref<string>('')
const selectedClient = ref<string>('')
const selectedObjectType = ref<string>('')
const clientNameSearch = ref<string>('')
const phoneSearch = ref<string>('')
const paymentSum = ref<number>(0)
const paymentBase = ref<string>('')
const paymentDate = ref<string>('')
const paymentCurrency = ref<Currency>({ code: '972', name: 'Сомони', symbol: 'TJS' })
const isPaymentBlockOpen = ref<boolean>(false)
const isSmsBlockOpen = ref<boolean>(false)
const lastPaymentReceipt = ref<PaymentReceipt | null>(null)
const isReceiptGenerating = ref<boolean>(false)
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

const objectTypeOptions = computed(() => {
    const base = selectedServer.value
        ? debtors.value.filter(item => item.serverLabel === selectedServer.value)
        : debtors.value

    return Array.from(new Set(base.map(item => item.objectType).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru'))
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

        if (selectedObjectType.value && item.objectType !== selectedObjectType.value) {
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
    { text: 'Тип объекта', value: 'objectType', sortable: true },
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
            value: String(plan.id || label)
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

function formatReceiptDate(value?: string | null) {
    if (!value) {
        return new Date().toLocaleDateString('ru-RU')
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return new Date().toLocaleDateString('ru-RU')
    }

    return date.toLocaleDateString('ru-RU')
}

function parseNumber(value: any) {
    if (value === undefined || value === null || value === '') return 0
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0
    const normalized = String(value).trim().replace(/\s+/g, '').replace(',', '.')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
}

function normalizeOrderValue(value: unknown): string {
    if (value === undefined || value === null) return ''

    if (typeof value === 'string' || typeof value === 'number') {
        return String(value).trim()
    }

    if (typeof value === 'object') {
        const order = value as { id?: unknown; number?: unknown; name?: unknown; ref?: unknown; value?: unknown }
        return [
            order.id,
            order.number,
            order.name,
            order.ref,
            order.value
        ].map(normalizeOrderValue).find(Boolean) || ''
    }

    return ''
}

function resolveOrder(item: ClientPaymentsReportItem) {
    const client = item.client || {}

    return [
        client.order,
        client.order_id,
        client.order_number,
        client.contract,
        client.contract_id,
        client.contract_number,
        item.order,
        item.order_id,
        item.order_number,
        item.contract,
        item.contract_id,
        item.contract_number
    ].map(normalizeOrderValue).find(Boolean) || ''
}

function formatApartmentInfo(client?: ClientInfo) {
    const block = client?.block ? `Блок ${client.block}` : 'Блок -'
    const floor = client?.float ? `Этаж ${client.float}` : 'Этаж -'
    const apartmentType = client?.apartment_type || 'Тип -'
    const apartment = client?.apartment ? `Кв. ${client.apartment}` : 'Кв. -'
    const apartmentSquare = client?.apartment_square ? `(${client.apartment_square} м²)` : ''

    return `${block} + ${floor} + ${apartmentType} + ${apartment} + ${apartmentSquare}`
}

function resolveObjectType(client?: ClientInfo) {
    const rawType = String(client?.apartment_type || '').trim()
    const normalized = rawType.toLocaleLowerCase('ru')

    if (!rawType) return 'объект'
    if (normalized.includes('кварт') || normalized.includes('манзил')) return 'манзил'
    if (normalized.includes('магаз') || normalized.includes('мағоз') || normalized.includes('store') || normalized.includes('shop')) return 'мағоза'
    if (normalized.includes('парков') || normalized.includes('parking') || normalized.includes('тавақ')) return 'таваққуфгоҳ'
    if (normalized.includes('клад') || normalized.includes('storage') || normalized.includes('анбор')) return 'анбор'
    if (normalized.includes('офис') || normalized.includes('office')) return 'офис'

    return rawType
}

function resolveTajikObjectName(type?: string) {
    const normalized = String(type || '').trim().toLocaleLowerCase('ru')

    if (normalized.includes('магаз') || normalized.includes('мағоз') || normalized.includes('shop') || normalized.includes('store')) return 'мағоза'
    if (normalized.includes('клад') || normalized.includes('анбор') || normalized.includes('storage')) return 'анбор'
    if (normalized.includes('парков') || normalized.includes('тавақ') || normalized.includes('parking')) return 'таваққуфгоҳ'
    if (normalized.includes('пентхаус')) return 'пентхаус'
    if (normalized.includes('подвал') || normalized.includes('таҳхона')) return 'ҳуҷраи таҳхона'
    if (normalized.includes('кварт') || normalized.includes('манзил') || normalized.includes('ҳуҷра')) return 'манзил'

    return type || 'объект'
}

function buildObjectAgreementText(debtor: DebtorRow) {
    const client = debtor.client || {}
    const objectName = resolveTajikObjectName(debtor.objectType || client.type || client.apartment_type)
    const objectNumber = String(client.apartment || '').trim()
    const block = String(client.block || '').trim()
    const parts = [`Шартномаи ${objectName}`]

    if (objectNumber) {
        parts.push(`№ ${objectNumber}`)
    }

    if (block) {
        parts.push(`блок ${block}`)
    }

    if (!objectNumber && !block && debtor.apartmentInfo) {
        parts.push(debtor.apartmentInfo)
    }

    return parts.join(', ')
}

function buildReceiptDocxFileName(receipt: PaymentReceipt) {
    const safeOrder = receipt.order.replace(/[\\/:*?"<>|]/g, '-')
    const safeDate = receipt.paymentDate.slice(0, 10)
    return `kvitansiya-${safeOrder || receipt.receiptNumber}-${safeDate}.docx`
}

function createPaymentReceipt(paymentId?: string | number): PaymentReceipt | null {
    if (!selectedDebtor.value) return null

    const paymentDateIso = paymentDate.value ? new Date(paymentDate.value).toISOString() : new Date().toISOString()
    const objectType = selectedDebtor.value.objectType || resolveObjectType(selectedDebtor.value.client)
    const base = buildObjectAgreementText(selectedDebtor.value)

    return {
        receiptNumber: String(paymentId || Date.now()),
        createdAt: new Date().toISOString(),
        paymentDate: paymentDateIso,
        clientName: selectedDebtor.value.clientName,
        phone: selectedDebtor.value.phone,
        order: selectedDebtor.value.order,
        objectType,
        objectInfo: selectedDebtor.value.apartmentInfo,
        base,
        sum: paymentSum.value,
        currency: paymentCurrency.value,
        serverLabel: selectedDebtor.value.serverLabel
    }
}

function receiptRow(label: string, value: string): Content {
    return {
        columns: [
            { text: label, width: 145, color: '#667085' },
            { text: value || '-', width: '*', bold: true }
        ],
        columnGap: 12,
        margin: [0, 0, 0, 8]
    }
}

function buildReceiptDocument(receipt: PaymentReceipt): TDocumentDefinitions {
    const amount = `${formatMoney(receipt.sum)} ${receipt.currency?.symbol || ''}`.trim()

    return {
        pageSize: 'A4',
        pageMargins: [48, 46, 48, 46],
        defaultStyle: {
            font: 'Roboto',
            fontSize: 10,
            lineHeight: 1.2
        },
        content: [
            {
                columns: [
                    {
                        stack: [
                            { text: 'IMON GROUP', style: 'brand' },
                            { text: 'Квитансияи пардохт', style: 'title' }
                        ]
                    },
                    {
                        stack: [
                            { text: `№ ${receipt.receiptNumber}`, alignment: 'right', bold: true },
                            { text: `Сана: ${formatReceiptDate(receipt.paymentDate)}`, alignment: 'right' }
                        ],
                        width: 160
                    }
                ],
                margin: [0, 0, 0, 24]
            },
            {
                table: {
                    widths: ['*'],
                    body: [[{
                        stack: [
                            receiptRow('Пардохткунанда', receipt.clientName),
                            receiptRow('Телефон', receipt.phone),
                            receiptRow('Рақами шартнома', receipt.order),
                            receiptRow('Намуди объект', receipt.objectType),
                            receiptRow('Маълумоти объект', receipt.objectInfo),
                            receiptRow('Асос', receipt.base),
                            receiptRow('Маблағ', amount),
                            receiptRow('Асъор', receipt.currency?.name || receipt.currency?.symbol || ''),
                            receiptRow('Сервер', receipt.serverLabel)
                        ],
                        margin: [16, 16, 16, 10]
                    }]]
                },
                layout: {
                    hLineColor: () => '#d0d5dd',
                    vLineColor: () => '#d0d5dd',
                    paddingLeft: () => 0,
                    paddingRight: () => 0,
                    paddingTop: () => 0,
                    paddingBottom: () => 0
                }
            },
            {
                columns: [
                    {
                        stack: [
                            { text: 'Имзои қабулкунанда', color: '#667085', margin: [0, 0, 0, 18] },
                            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 1, lineColor: '#344054' }] }
                        ]
                    },
                    {
                        stack: [
                            { text: 'Имзои пардохткунанда', color: '#667085', margin: [0, 0, 0, 18] },
                            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 1, lineColor: '#344054' }] }
                        ]
                    }
                ],
                columnGap: 64,
                margin: [0, 36, 0, 0]
            },
            {
                text: `Квитансия дар санаи ${formatReceiptDate(receipt.createdAt)} аз тарафи барномаи Imon PRO тартиб дода шуд.`,
                color: '#667085',
                fontSize: 9,
                margin: [0, 36, 0, 0]
            }
        ],
        styles: {
            brand: {
                fontSize: 12,
                bold: true,
                color: '#1d2939',
                margin: [0, 0, 0, 4]
            },
            title: {
                fontSize: 20,
                bold: true,
                color: '#101828'
            }
        }
    }
}

function amountToTajikWords(value: number) {
    const ones = ['', 'як', 'ду', 'се', 'чор', 'панҷ', 'шаш', 'ҳафт', 'ҳашт', 'нуҳ']
    const teens = ['даҳ', 'ёздаҳ', 'дувоздаҳ', 'сездаҳ', 'чордаҳ', 'понздаҳ', 'шонздаҳ', 'ҳабдаҳ', 'ҳаждаҳ', 'нуздаҳ']
    const tens = ['', '', 'бист', 'сӣ', 'чил', 'панҷоҳ', 'шаст', 'ҳафтод', 'ҳаштод', 'навад']
    const hundreds = ['', 'сад', 'дусад', 'сесад', 'чорсад', 'панҷсад', 'шашсад', 'ҳафтсад', 'ҳаштсад', 'нуҳсад']

    const chunkToWords = (num: number) => {
        const result: string[] = []
        const h = Math.floor(num / 100)
        const rest = num % 100

        if (h) result.push(hundreds[h])
        if (rest >= 10 && rest < 20) {
            result.push(teens[rest - 10])
        } else {
            const t = Math.floor(rest / 10)
            const o = rest % 10
            if (t) result.push(tens[t])
            if (o) result.push(ones[o])
        }

        return result.join('у ')
    }

    const integer = Math.floor(Math.abs(value || 0))
    if (integer === 0) return 'сифр'

    const millions = Math.floor(integer / 1000000)
    const thousands = Math.floor((integer % 1000000) / 1000)
    const rest = integer % 1000
    const parts: string[] = []

    if (millions) parts.push(`${chunkToWords(millions)} миллион`)
    if (thousands) parts.push(`${chunkToWords(thousands)} ҳазор`)
    if (rest) parts.push(chunkToWords(rest))

    return parts.join(' ')
}

function formatReceiptDateTajik(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return formatReceiptDate(value)

    const months = [
        'январи', 'феврали', 'марти', 'апрели', 'майи', 'июни',
        'июли', 'августи', 'сентябри', 'октябри', 'ноябри', 'декабри'
    ]

    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} с`
}

function formatAmountWordsTajik(value: number, currency?: Currency) {
    const absoluteValue = Math.abs(Number(value) || 0)
    const roundedMinorUnits = Math.round(absoluteValue * 100)
    const integer = Math.floor(roundedMinorUnits / 100)
    const minor = roundedMinorUnits % 100
    const currencyUnits: Record<string, { major: string; minor: string }> = {
        '972': { major: 'сомонӣ', minor: 'дирам' },
        '840': { major: 'доллари ИМА', minor: 'сент' },
        '978': { major: 'евро', minor: 'сент' },
        '643': { major: 'рубл', minor: 'копейка' },
        '392': { major: 'иена', minor: 'сен' }
    }
    const units = currencyUnits[String(currency?.code || '')] || {
        major: currency?.name || currency?.symbol || '',
        minor: 'воҳид'
    }
    const words = amountToTajikWords(integer)
    const capitalizedWords = words.charAt(0).toLocaleUpperCase('tg') + words.slice(1)

    return `${capitalizedWords} ${units.major} ${String(minor).padStart(2, '0')} ${units.minor}`.trim()
}

async function generateReceiptDocx(receipt: PaymentReceipt) {
    const templateResponse = await fetch(receiptTemplateUrl)
    if (!templateResponse.ok) {
        throw new Error(`Не удалось загрузить шаблон квитанции: ${templateResponse.status}`)
    }

    const template = await templateResponse.arrayBuffer()
    const document = new Docxtemplater(new PizZip(template), {
        delimiters: { start: '{{', end: '}}' },
        linebreaks: true,
        paragraphLoop: true,
        nullGetter: () => ''
    })
    const currency = receipt.currency?.symbol || receipt.currency?.code || ''

    document.render({
        documentNumber: receipt.receiptNumber,
        date: formatReceiptDateTajik(receipt.paymentDate),
        clientName: receipt.clientName,
        base: receipt.base,
        amount: formatMoney(receipt.sum).replace(/\u00a0/g, ' '),
        currency: currency ? ` ${currency}` : '',
        amountWords: formatAmountWordsTajik(receipt.sum, receipt.currency)
    })

    return document.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    })
}

async function handleReceiptDocx(receipt = lastPaymentReceipt.value) {
    if (!receipt || isReceiptGenerating.value) return

    isReceiptGenerating.value = true
    try {
        const blob = await generateReceiptDocx(receipt)
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = buildReceiptDocxFileName(receipt)
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    } catch (error: any) {
        console.error('[receipt] DOCX generation failed', error)
        toasterStore.add({
            title: 'Ошибка',
            descr: error?.message || 'Не удалось сформировать квитанцию Word',
            type: 'danger'
        })
    } finally {
        isReceiptGenerating.value = false
    }
}

function koCell(text: string, options: Record<string, unknown> = {}): Content {
    return {
        text: text || ' ',
        fontSize: 8,
        ...options
    }
}

function koTable(body: Content[][], widths: Array<string | number> = ['*']): Content {
    return {
        table: {
            widths,
            body
        },
        layout: {
            hLineWidth: () => 0.4,
            vLineWidth: () => 0.4,
            hLineColor: () => '#000000',
            vLineColor: () => '#000000',
            paddingLeft: () => 2,
            paddingRight: () => 2,
            paddingTop: () => 2,
            paddingBottom: () => 2
        }
    }
}

function koLine(label: string, value: string): Content {
    return koTable([[
        koCell(label),
        koCell(value || ' ', { bold: true })
    ]], [62, '*'])
}

function koSignature(label: string): Content {
    return {
        stack: [
            { text: label, fontSize: 8, margin: [0, 0, 0, 8] },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 92, y2: 0, lineWidth: 0.4, lineColor: '#000000' }] }
        ],
        margin: [0, 8, 0, 0]
    }
}

function buildKoReceiptDocument(receipt: PaymentReceipt): TDocumentDefinitions {
    const amount = `${formatMoney(receipt.sum)} ${receipt.currency?.symbol || ''}`.trim()
    const amountWords = `${amountToTajikWords(receipt.sum)} ${receipt.currency?.symbol || ''}`.trim()
    const documentDate = formatReceiptDate(receipt.paymentDate)
    const organization = 'IMON GROUP'
    const department = receipt.serverLabel || '-'

    return {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [28.35, 28.35, 28.35, 28.35],
        defaultStyle: {
            font: 'Roboto',
            fontSize: 9,
            lineHeight: 1.05
        },
        content: [
            {
                columns: [
                    {
                        stack: [
                            {
                                columns: [
                                    { text: 'Ташкилот', fontSize: 7, width: 42 },
                                    { text: organization, fontSize: 9, bold: true, decoration: 'underline', width: '*' }
                                ],
                                margin: [0, 0, 0, 3]
                            },
                            {
                                columns: [
                                    { text: 'Воҳид', fontSize: 7, width: 42 },
                                    { text: department, fontSize: 8, decoration: 'underline', width: '*' }
                                ],
                                margin: [0, 0, 0, 5]
                            },
                            { text: 'ПРИХОДНЫЙ КАССОВЫЙ ОРДЕР', style: 'koTitle' },
                            koTable([
                                [
                                    koCell('Рақами ҳуҷҷат', { alignment: 'center', bold: true }),
                                    koCell('Сана', { alignment: 'center', bold: true }),
                                    koCell('Дебет', { alignment: 'center', bold: true }),
                                    koCell('Кредит', { alignment: 'center', bold: true })
                                ],
                                [
                                    koCell(receipt.receiptNumber, { alignment: 'center' }),
                                    koCell(documentDate, { alignment: 'center' }),
                                    koCell('50', { alignment: 'center' }),
                                    koCell('62', { alignment: 'center' })
                                ]
                            ], ['*', 44, 31, 31]),
                            { text: ' ', fontSize: 3 },
                            koLine('Қабул шуд аз', receipt.clientName),
                            koLine('Асос', receipt.base),
                            koLine('Объект', `${receipt.objectType}: ${receipt.objectInfo}`),
                            koLine('Маблағ', amount),
                            koLine('Бо ҳарф', amountWords),
                            koLine('Замима', `Шартнома № ${receipt.order || '-'}`),
                            {
                                columns: [
                                    koSignature('Сармуҳосиб'),
                                    koSignature('Кассир')
                                ],
                                columnGap: 18,
                                margin: [0, 8, 0, 0]
                            }
                        ],
                        width: 360
                    },
                    {
                        canvas: [
                            { type: 'line', x1: 4, y1: 0, x2: 4, y2: 785, lineWidth: 0.5, lineColor: '#000000', dash: { length: 2, space: 2 } }
                        ],
                        width: 8
                    },
                    {
                        stack: [
                            { text: 'КВИТАНСИЯ', style: 'stubTitle' },
                            { text: `ба ПКО № ${receipt.receiptNumber}`, fontSize: 8, alignment: 'center', margin: [0, 0, 0, 4] },
                            koLine('Сана', documentDate),
                            koLine('Аз', receipt.clientName),
                            koLine('Асос', receipt.base),
                            koLine('Маблағ', amount),
                            koLine('Бо ҳарф', amountWords),
                            koLine('Шартнома', receipt.order || '-'),
                            {
                                columns: [
                                    { text: 'Кассир', fontSize: 8, width: 34 },
                                    { canvas: [{ type: 'line', x1: 0, y1: 9, x2: 60, y2: 9, lineWidth: 0.4, lineColor: '#000000' }], width: '*' }
                                ],
                                margin: [0, 10, 0, 0]
                            }
                        ],
                        width: 145
                    }
                ],
                columnGap: 4
            }
        ],
        styles: {
            koTitle: {
                fontSize: 14,
                bold: true,
                alignment: 'center',
                margin: [0, 2, 0, 6]
            },
            stubTitle: {
                fontSize: 11,
                bold: true,
                alignment: 'center',
                margin: [0, 0, 0, 4]
            }
        }
    }
}

function formatKoDate(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return formatReceiptDate(value)

    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }) + ' г.'
}

function amountToRussianWords(value: number, currencySymbol: string) {
    const ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять']
    const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать']
    const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто']
    const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот']
    const integer = Math.floor(Math.abs(value || 0))
    const cents = Math.round((Math.abs(value || 0) - integer) * 100)

    const chunkToWords = (num: number) => {
        const result: string[] = []
        const h = Math.floor(num / 100)
        const rest = num % 100
        if (h) result.push(hundreds[h])
        if (rest >= 10 && rest < 20) {
            result.push(teens[rest - 10])
        } else {
            const t = Math.floor(rest / 10)
            const o = rest % 10
            if (t) result.push(tens[t])
            if (o) result.push(ones[o])
        }
        return result.join(' ')
    }

    const thousands = Math.floor(integer / 1000)
    const rest = integer % 1000
    const parts: string[] = []
    if (thousands) parts.push(`${chunkToWords(thousands)} тысяч`)
    if (rest) parts.push(chunkToWords(rest))
    if (!parts.length) parts.push('ноль')

    const currencyName = currencySymbol === 'USD' || currencySymbol === '$'
        ? 'долларов'
        : currencySymbol === 'TJS'
            ? 'сомони'
            : currencySymbol || ''

    return `${parts.join(' ')} ${currencyName} ${String(cents).padStart(2, '0')} центов`
}

function buildExactKoReceiptDocument(receipt: PaymentReceipt): TDocumentDefinitions {
    const dateText = formatKoDate(receipt.paymentDate)
    const amount = `${formatMoney(receipt.sum)} ${receipt.currency?.symbol || ''}`.trim()
    const amountWords = ''
    const orderNumber = receipt.receiptNumber || '657'
    const organization = 'ҶДММ "Асри Мо"'
    const projectName = receipt.objectInfo.split('+').pop()?.trim() || 'ЖК Panorama'

    const text = (value: string, x: number, y: number, options: Record<string, unknown> = {}): Content => ({
        text: value,
        absolutePosition: { x, y },
        fontSize: 9,
        color: '#111827',
        ...options
    })

    const line = (x1: number, y1: number, x2: number, y2: number, options: Record<string, unknown> = {}): Content => ({
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: x2 - x1, y2: y2 - y1, lineWidth: 0.45, lineColor: '#111827', ...options }],
        absolutePosition: { x: x1, y: y1 }
    })

    const table = (x: number, y: number, widths: number[], body: Content[][], heights?: number[]): Content => ({
        table: { widths, heights, body },
        layout: {
            hLineWidth: () => 0.45,
            vLineWidth: () => 0.45,
            hLineColor: () => '#111827',
            vLineColor: () => '#111827',
            paddingLeft: () => 2,
            paddingRight: () => 2,
            paddingTop: () => 1,
            paddingBottom: () => 1
        },
        absolutePosition: { x, y }
    })

    const cell = (value: string, options: Record<string, unknown> = {}): Content => ({
        text: value,
        fontSize: 7,
        alignment: 'center',
        ...options
    })

    return {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [0, 0, 0, 0],
        defaultStyle: {
            font: 'Roboto',
            fontSize: 10,
            lineHeight: 1.05
        },
        content: [
            text('Шакли КО-1', 343, 6, { fontSize: 7 }),
            text(organization, 35, 94, { bold: true, fontSize: 8 }),
            line(34, 108, 262, 108),
            text('(корхона, ташкилот)', 120, 111, { fontSize: 5 }),
            line(34, 129, 262, 129),
            text('ОРДЕРИ ДАРОМАДИ ХАЗИНАВИ', 52, 146, { bold: true, fontSize: 10.5 }),
            text('Формаи', 287, 82, { fontSize: 8 }),
            table(323, 49, [63], [
                [cell(' ', { fontSize: 7 })],
                [cell('0310001', { bold: true, fontSize: 10 })],
                [cell(' ')],
                [cell(' ')]
            ], [20, 24, 24, 21]),
            table(211, 139, [94, 62], [
                [cell('рақами ҳуҷҷат', { fontSize: 7 }), cell('рузи ташкил', { fontSize: 7 })],
                [cell(orderNumber, { fontSize: 7 }), cell(formatReceiptDate(receipt.paymentDate), { fontSize: 7 })]
            ], [20, 13]),
            table(34, 178, [50, 32, 50, 38, 58, 40, 24], [
                [
                    cell('Дебет', { rowSpan: 2, margin: [0, 17, 0, 0] }),
                    cell('Кредит', { colSpan: 3, fontSize: 7 }),
                    cell(''),
                    cell(''),
                    cell('Маблағ', { rowSpan: 2, margin: [0, 17, 0, 0], fontSize: 7 }),
                    cell('Рамзи\nтаъиноти\nмақсаднок', { rowSpan: 2, fontSize: 5 }),
                    cell('', { rowSpan: 2 })
                ],
                [
                    cell(''),
                    cell(''),
                    cell('Ҳисоби муросилоти,\nҳисоби иловаги', { fontSize: 4.5 }),
                    cell('Рамзи\nҳисоби\nтаҳлилӣ', { fontSize: 5 }),
                    cell(''),
                    cell(''),
                    cell('')
                ],
                [
                    cell('50'),
                    cell(''),
                    cell('62.01,62.02', { fontSize: 6.5 }),
                    cell(''),
                    cell(amount, { fontSize: 6.5 }),
                    cell(''),
                    cell('')
                ]
            ], [21, 34, 21]),
            text('Қабул шуд:', 35, 267, { fontSize: 8 }),
            text(receipt.clientName, 88, 267, { bold: true, fontSize: 8, width: 260 }),
            text('Асос:', 35, 293, { fontSize: 8 }),
            text(receipt.base, 35, 307, { fontSize: 8, width: 225 }),
            text(projectName, 270, 307, { fontSize: 8 }),
            text('Маблағ:', 35, 338, { fontSize: 8 }),
            text(amountWords, 35, 352, { fontSize: 8, width: 335 }),
            text('В том числе:   НДС (Без НДС) 0-00 USD', 35, 378, { fontSize: 7.5 }),
            text('Замима:', 35, 402, { fontSize: 7.5 }),
            text('Заказ покупателя 119 от 24.03.2026', 90, 402, { fontSize: 7.5 }),
            text('Сармуҳосиб', 35, 426, { bold: true, fontSize: 8 }),
            line(124, 433, 184, 433),
            text('имзо', 148, 437, { fontSize: 5 }),
            line(240, 433, 360, 433),
            text('Хазинадор', 35, 449, { bold: true, fontSize: 8 }),
            line(124, 456, 184, 456),
            text('имзо', 148, 460, { fontSize: 5 }),
            line(240, 456, 360, 456),
            line(395, 16, 395, 445, { dash: { length: 2, space: 4 } }),
            text('х\nа\nт\nт\nи\n\nб\nу\nр\nи\nш', 390, 190, { fontSize: 4, lineHeight: 0.75, width: 10, alignment: 'center' }),
            text(organization, 445, 20, { bold: true, fontSize: 8, alignment: 'center', width: 115 }),
            line(402, 36, 560, 36),
            text('(корхона, ташкилот)', 452, 39, { fontSize: 5 }),
            text('Р А С И Д', 455, 52, { bold: true, fontSize: 12, characterSpacing: 3 }),
            text(`ба ордери даромади хазинави № ${orderNumber}`, 410, 82, { fontSize: 7.5, alignment: 'right', width: 150 }),
            line(402, 101, 560, 101),
            text('аз', 452, 121, { fontSize: 8 }),
            text(dateText, 474, 121, { bold: true, decoration: 'underline', fontSize: 8 }),
            line(402, 136, 560, 136),
            text('Қабул карда шудааст аз', 402, 156, { fontSize: 7.5 }),
            text(receipt.clientName, 402, 171, { bold: true, fontSize: 8, width: 155 }),
            text('Асос:', 402, 235, { fontSize: 7.5 }),
            text(receipt.base, 402, 249, { fontSize: 8, width: 150 }),
            text('Маблағ', 402, 319, { fontSize: 7.5 }),
            text(amount, 456, 319, { bold: true, fontSize: 8 }),
            line(402, 333, 560, 333),
            text('(рақами)', 461, 336, { fontSize: 5 }),
            text(amountWords, 402, 350, { fontSize: 7.5, width: 150 }),
            text(dateText, 456, 344, { bold: true, decoration: 'underline', fontSize: 8 }),
            line(512, 353, 560, 353),
            text('Ҷ.М.', 402, 366, { bold: true, fontSize: 9 }),
            text('Сармуҳосиб', 402, 407, { bold: true, fontSize: 8 }),
            line(480, 414, 560, 414),
            text('имзо', 518, 418, { fontSize: 5 }),
            text('Хазинадор', 402, 430, { bold: true, fontSize: 8 }),
            line(480, 437, 560, 437),
            text('имзо', 518, 441, { fontSize: 5 })
        ]
    }
}

async function handleReceiptPdf(action: 'open' | 'download' | 'print', receipt = lastPaymentReceipt.value) {
    if (!receipt) return

    const pdfMake = await getPdfMake()
    const pdf = pdfMake.createPdf(buildExactKoReceiptDocument(receipt))

    if (action === 'download') {
        pdf.download(buildReceiptDocxFileName(receipt).replace(/\.docx$/, '.pdf'))
        return
    }

    if (action === 'print') {
        pdf.print()
        return
    }

    pdf.open()
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
    const order = resolveOrder(item)
    const objectType = String(item.type || item.client?.type || item.client?.apartment_type || 'Не указан')
    const dweller = Boolean(item.dweller ?? item.client?.dweller ?? false)

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
        order,
        objectType,
        dweller,
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
    lastPaymentReceipt.value = null
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

function updatePlanComment(payload: { id?: number | string; date: string; comment: string }) {
    if (!selectedDebtor.value) return

    loaderStore.isActive = true
    axios.post(selectedDebtor.value.serverLink + '/api/payment-plan', {
        id: payload.id,
        date: payload.date,
        comment: payload.comment
    }, {
        headers: {
            Authorization: 'Basic ' + selectedDebtor.value.serverToken
        }
    })
        .then(() => {
            selectedDebtor.value!.plan = selectedDebtor.value!.plan.map(plan => (
                (payload.id ? String(plan.id || '') === String(payload.id) : plan.date === payload.date)
                    ? { ...plan, comment: payload.comment }
                    : plan
            ))
            toasterStore.add({
                title: 'Успех',
                descr: 'Комментарий сохранен',
                type: 'success'
            })
            loadReport()
        })
        .catch(err => toasterStore.add({
            title: err?.code || 'Ошибка',
            descr: err?.message || 'Не удалось сохранить комментарий',
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
            const receipt = createPaymentReceipt(res?.data?.id || res?.data?.number || res?.data?.name)
            if (receipt) {
                lastPaymentReceipt.value = receipt
                void handleReceiptDocx(receipt)
            }

            paymentSum.value = 0
            paymentBase.value = ''

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

    if (!objectTypeOptions.value.includes(selectedObjectType.value)) {
        selectedObjectType.value = ''
    }
}

function clearFilters() {
    selectedServer.value = ''
    selectedClient.value = ''
    selectedObjectType.value = ''
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
                label(for="objectTypeFilter") Тип объекта
                select#objectTypeFilter(v-model="selectedObjectType")
                    option(value="") Все типы
                    option(v-for="type in objectTypeOptions" :key="type" :value="type") {{ type }}
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
                        strong
                            span.dweller-badge(v-if="item.dweller" title="Жилец") Ж
                            span {{ item.clientName }}
                        //small {{ item.serverLabel }}
                template(#item-objectType="item")
                    span.object-type-badge(:class="{ dweller: item.dweller }") {{ item.objectType }}
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
                .meta-item
                    strong Тип объекта:
                    span
                        span.object-type-badge(:class="{ dweller: selectedDebtor.dweller }") {{ selectedDebtor.objectType }}
                        span.dweller-note(v-if="selectedDebtor.dweller") Жилец
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
                        .receipt-actions(v-if="lastPaymentReceipt")
                            button.ip-btn.ip-btn_info(
                                type="button"
                                :disabled="isReceiptGenerating"
                                @click="handleReceiptDocx()"
                            ) {{ isReceiptGenerating ? 'Формирование...' : 'Скачать квитанцию Word' }}

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
                @update-plan-comment="updatePlanComment"
            )
</template>

<style scoped lang="scss">
.report-actions {
    gap: 12px;
}

.receipt-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
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

.dweller-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    margin-right: 6px;
    border-radius: 50%;
    background: #d65c10;
    color: #fff;
    font-size: 11px;
    font-weight: 800;
    vertical-align: middle;
}

.object-type-badge {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 3px 8px;
    border-radius: 999px;
    background: var(--color-surface-alt);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    font-size: 12px;
    font-weight: 700;

    &.dweller {
        background: rgba(214, 92, 16, 0.14);
        border-color: rgba(214, 92, 16, 0.45);
        color: #d65c10;
    }
}

.dweller-note {
    margin-left: 8px;
    color: #d65c10;
    font-weight: 700;
}

:deep(.report-table) {
    --easy-table-border: var(--color-border);
    --easy-table-row-border: var(--color-border);
    --easy-table-header-background-color: var(--color-surface-alt);
    --easy-table-header-font-color: var(--color-text);
    --easy-table-body-row-background-color: var(--color-surface);
    --easy-table-body-row-font-color: var(--color-text);
    --easy-table-body-even-row-background-color: var(--color-surface-alt);
    --easy-table-body-row-hover-background-color: rgba(214, 92, 16, 0.08);
    --easy-table-footer-background-color: var(--color-surface);
    --easy-table-footer-font-color: var(--color-text);
    --easy-table-scrollbar-track-color: var(--color-surface-alt);
    --easy-table-scrollbar-color: var(--color-border);
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
