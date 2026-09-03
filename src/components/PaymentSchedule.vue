<script setup lang="ts">
import { computed, ref, toRefs } from 'vue'

interface Plan { id?: number | string; date: string; sum: number, currency: string; comment?: string }
interface Actual { id?: number; date: string; sum: number, sum_equal?: number, exchange_rate?: number, currency: string }
interface ActualQueueItem extends Actual {
    remaining: number
}
interface PlanCommentPayload {
    id?: number | string
    date: string
    comment: string
}

const props = defineProps<{
    plannedPayments: Plan[]
    actualPayments: Actual[]
    currencySymbol?: string
    statusColors?: { early?: string; ontime?: string; overdue?: string }
    currencies?: { code: string; name: string; symbol?: string }[]
}>()

const { plannedPayments, actualPayments, currencySymbol, statusColors, currencies } = toRefs(props as any)

const emit = defineEmits<{
    (e: 'create-payment', payload?: any): void
    (e: 'refresh'): void
    (e: 'update-plan-comment', payload: PlanCommentPayload): void
}>()

const today = new Date()

const startOfDay = (d: Date | string) => {
    const dd = new Date(d)
    dd.setHours(0, 0, 0, 0)
    return dd
}

const endOfDay = (d: Date | string) => {
    const dd = new Date(d)
    dd.setHours(23, 59, 59, 999)
    return dd
}

const getPaymentAmount = (payment: any) => {
    const value = payment?.sum_equal ?? payment?.sum
    if (value === undefined || value === null || value === '') return 0
    const normalized = String(value).trim().replace(/\s+/g, '').replace(',', '.')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
}

const rows = computed(() => {
    const plans: Plan[] = (plannedPayments?.value || []).slice().sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const actuals: Actual[] = (actualPayments?.value || []).slice().sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const cumActualByDate = (dateStr: string) => {
        const dEnd = endOfDay(dateStr).getTime()
        return actuals.reduce((s: number, a: any) => (new Date(a.date).getTime() <= dEnd ? s + getPaymentAmount(a) : s), 0)
    }

    const cumActualBeforeDate = (dateStr: string) => {
        const dStart = startOfDay(dateStr).getTime()
        return actuals.reduce((s: number, a: any) => (new Date(a.date).getTime() < dStart ? s + getPaymentAmount(a) : s), 0)
    }

    const actualQueue: ActualQueueItem[] = actuals.map(a => ({ ...a, remaining: getPaymentAmount(a) }))

    const result: any[] = []
    let plannedCumulative = 0
    for (let i = 0; i < plans.length; i++) {
        const p: any = plans[i]
        const plannedPrev = plannedCumulative
        plannedCumulative += Number(p.sum)

        let toFill = Number(p.sum || 0)
        let paidForThisPlan = 0

        // record last used payment date for this plan (for diagnostics)
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
            if (cur.remaining <= 0) actualQueue.shift()
        }

        const remaining = Math.max(0, Number(p.sum) - paidForThisPlan)
        const progress = Number(p.sum) > 0 ? Math.round((paidForThisPlan / Number(p.sum)) * 100) : 0

        // overdueDays: if fully paid -> days between payment completion and planned date
        // if not fully paid -> days between today and planned date (positive => overdue)
        const plannedDate = startOfDay(new Date(p.date))
        let overdueDays = 0
        if (paidForThisPlan >= Number(p.sum)) {
            if (lastUsedDate) {
                const paidDate = startOfDay(new Date(lastUsedDate))
                overdueDays = Math.floor((paidDate.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24))
            } else {
                overdueDays = 0
            }
        } else {
            overdueDays = Math.floor((startOfDay(today).getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24))
        }

        // clamp negative values to 0 (not considered overdue)
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
            comment: p.comment || '',
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
})

const getStatusColor = (status: string) => {
    const defaults = { early: '#007bff', ontime: '#28a745', overdue: '#dc3545', pending: '#6c757d' }
    return (statusColors?.value && (statusColors.value as any)[status]) || defaults[status as keyof typeof defaults]
}

// Russian labels for statuses
const statusLabels: Record<string, string> = {
    pending: 'Ожидается',
    early: 'Ранее',
    ontime: 'В срок',
    overdue: 'Просрочено'
}

const getStatusLabel = (s: string) => statusLabels[s] || s

// no inline add-payment UI (handled from RoomView)

// Totals and chart-safe data to avoid runtime template errors
const totalPlanned = computed(() => {
    try {
        return rows.value.reduce((s, r) => s + (r.planSum || 0), 0)
    } catch {
        return 0
    }
})

const totalPaid = computed(() => {
    try {
        return rows.value.reduce((s, r) => s + (r.paidForThisPlan || 0), 0)
    } catch {
        return 0
    }
})

const chartData = computed(() => {
    const r = rows.value || []
    return {
        labels: r.map((x: any) => new Date(x.date).toLocaleDateString()),
        planned: r.map((x: any) => x.planSum || 0),
        paid: r.map((x: any) => x.paidForThisPlan || 0)
    }
})

// pie data: Paid vs Remaining (or Overpaid)
const pieData = computed(() => {
    const planned = Number(totalPlanned.value || 0)
    const paid = Number(totalPaid.value || 0)
    if (paid <= planned) {
        return {
            labels: ['Оплачено', 'Остаток'],
            data: [paid, Math.max(0, planned - paid)],
            colors: ['rgba(40,167,69,0.85)', 'rgba(220,53,69,0.85)']
        }
    }
    // overpaid
    return {
        labels: ['Покрытие', 'Переплата'],
        data: [planned, paid - planned],
        colors: ['rgba(0,123,255,0.85)', 'rgba(40,167,69,0.85)']
    }
})

const availableCurrencies = computed(() => {
    try {
        return (currencies?.value && Array.isArray(currencies.value)) ? currencies.value : []
    } catch {
        return []
    }
})

const currencySymbolSafe = computed(() => (currencySymbol?.value) || '')
const commentModal = ref<{
    mode: 'view' | 'edit'
    plan: any
    comment: string
} | null>(null)

function openCommentInfo(plan: any) {
    commentModal.value = {
        mode: 'view',
        plan,
        comment: plan.comment || ''
    }
}

function openCommentEditor(plan: any) {
    commentModal.value = {
        mode: 'edit',
        plan,
        comment: plan.comment || ''
    }
}

function closeCommentModal() {
    commentModal.value = null
}

function formatPlanDateForApi(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return String(value || '').replace(/\D/g, '').slice(0, 8)
    }

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
}

function savePlanComment() {
    if (!commentModal.value) return

    emit('update-plan-comment', {
        id: commentModal.value.plan.id,
        date: formatPlanDateForApi(commentModal.value.plan.date),
        comment: commentModal.value.comment
    })
    closeCommentModal()
}

// Chart.js setup
import { onMounted, onBeforeUnmount, watch } from 'vue'
import Chart from 'chart.js/auto'
const chartRef = ref<HTMLCanvasElement | null>(null)
const chartRef2 = ref<HTMLCanvasElement | null>(null)
let chartInstance: any = null
let planChartInstance: any = null

function createChart() {
    if (!chartRef.value) return
    const ctx = chartRef.value.getContext('2d')
    if (!ctx) return
    const p = pieData.value
    chartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: p.labels,
            datasets: [
                {
                    data: p.data,
                    backgroundColor: p.colors,
                    borderColor: '#fff',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: { mode: 'index' }
            }
        }
    })
}

function createPlanChart() {
    if (!chartRef2.value) return
    const ctx = chartRef2.value.getContext('2d')
    if (!ctx) return
    const c = chartData.value
    planChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: c.labels,
            datasets: [
                {
                    label: 'План',
                    data: c.planned,
                    borderColor: 'rgba(0,123,255,0.9)',
                    backgroundColor: 'rgba(0,123,255,0.1)',
                    tension: 0.3,
                    fill: false,
                    pointRadius: 4,
                    borderWidth: 2
                },
                {
                    label: 'Факт',
                    data: c.paid,
                    borderColor: 'rgba(40,167,69,0.95)',
                    backgroundColor: 'rgba(40,167,69,0.08)',
                    tension: 0.3,
                    fill: false,
                    pointRadius: 4,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { display: true },
                y: { beginAtZero: true }
            },
            plugins: { legend: { position: 'top' } }
        }
    })
}

function updateChart() {
    if (!chartInstance) return createChart()
    const p = pieData.value
    chartInstance.data.labels = p.labels
    chartInstance.data.datasets[0].data = p.data
    chartInstance.data.datasets[0].backgroundColor = p.colors
    chartInstance.update()
}

function updatePlanChart() {
    if (!planChartInstance) return createPlanChart()
    const c = chartData.value
    planChartInstance.data.labels = c.labels
    planChartInstance.data.datasets[0].data = c.planned
    planChartInstance.data.datasets[1].data = c.paid
    planChartInstance.update()
}

onMounted(() => {
    createChart()
    createPlanChart()
})

onBeforeUnmount(() => {
    if (chartInstance) {
        chartInstance.destroy()
        chartInstance = null
    }
    if (planChartInstance) {
        planChartInstance.destroy()
        planChartInstance = null
    }
})

watch(pieData, () => updateChart(), { deep: true })
watch(chartData, () => updatePlanChart(), { deep: true })

// Number formatting helper
const fixedTo = (v: any) => {
    const n = Number(v || 0)
    return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<template lang="pug">
.payment-schedule
    .ps-header
        //- .ps-summary
        //-     .ps-total
        //-         strong План:
        //-         span {{ fixedTo(totalPlanned) }} {{ currencySymbolSafe }}
        //-     .ps-total
        //-         strong Факт:
        //-         span {{ fixedTo(totalPaid) }} {{ currencySymbolSafe }}
        .ps-charts
            .ps-chart-large
                canvas(ref="chartRef")
            .ps-chart-small
                canvas(ref="chartRef2")

    .ps-tables
        .ps-col
            h4.ps-title Плановые платежи
            table.ps-table
                thead
                    tr
                        th №
                        th Дата план
                        th.text-right Сумма план
                        th.text-right Остаток
                        th Прогресс
                        th Просрочено(дн.)
                        th Статус
                        th Действия
                tbody
                    tr(v-for="(r, idx) in rows" :key="r.id || idx")
                        td.idx {{ idx + 1 }}
                        td.date {{ new Date(r.date).toLocaleDateString() }}
                        td.text-right {{ fixedTo(r.planSum) }} {{ currencySymbolSafe }}
                        td.text-right {{ fixedTo(r.remaining) }} {{ currencySymbolSafe }}
                        td
                            .progress-container
                                .progress-bar(:style="{ width: r.progress + '%', background: getStatusColor(r.status) }") {{ r.progress }}%
                        td.text-center {{ r.overdueDays }}
                        td
                            span.status-badge(:style="{ color: getStatusColor(r.status) }") {{ getStatusLabel(r.status) }}
                        td.plan-actions
                            button.plan-action(type="button" title="Комментарий" @click="openCommentInfo(r)")
                                svg(width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true")
                                    circle(cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8")
                                    path(d="M12 11.5V16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round")
                                    path(d="M12 8H12.01" stroke="currentColor" stroke-width="2.2" stroke-linecap="round")
                            button.plan-action(type="button" title="Изменить комментарий" @click="openCommentEditor(r)")
                                svg(width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true")
                                    path(d="M4 6.5C4 5.12 5.12 4 6.5 4H17.5C18.88 4 20 5.12 20 6.5V13.5C20 14.88 18.88 16 17.5 16H9L5 20V16.1C4.42 15.9 4 15.35 4 14.7V6.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round")
                                    path(d="M8 8H16M8 11H13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round")

        .ps-col
            h4.ps-title Фактические платежи
            table.ps-table
                thead
                    tr
                        th №
                        th Дата
                        th.text-right Сумма
                        th.note Примечание
                tbody
                    tr(v-for="(a, i) in actualPayments" :key="a.id || i")
                        td.idx {{ i + 1 }}
                        td.date {{ new Date(a.date).toLocaleDateString() }}
                        td.text-right {{ fixedTo(a.sum) }} {{ a.currency || currencySymbolSafe }} 
                            u
                                i(v-if="a.sum_equal !== undefined && a.sum_equal !== null && a.sum_equal !== a.sum") - {{ fixedTo(a.sum_equal) + "$" }} {{a.exchange_rate ? ' x ' + a.exchange_rate : ''}}
                        td {{ a.base || a.method || '-' }}
    .plan-comment-modal(v-if="commentModal")
        .plan-comment-backdrop(@click="closeCommentModal")
        .plan-comment-dialog
            .plan-comment-header
                h4 {{ commentModal.mode === 'edit' ? 'Комментарий к плану' : 'Комментарий' }}
                button.plan-comment-close(type="button" @click="closeCommentModal") ×
            .plan-comment-body
                textarea(v-if="commentModal.mode === 'edit'" rows="5" v-model="commentModal.comment")
                p.plan-comment-text(v-else) {{ commentModal.comment || 'Комментарий не заполнен' }}
            .plan-comment-footer(v-if="commentModal.mode === 'edit'")
                button.ps-save-btn(type="button" @click="savePlanComment") Сохранить
</template>

<style scoped lang="scss">
.payment-schedule table {
    width: 100%;
    border-collapse: collapse;
}

.payment-schedule th,
.payment-schedule td {
    padding: 8px 10px;
    border-bottom: 1px solid var(--color-border);
    text-align: left;
}

.progress-container {
    width: 120px;
    background: var(--color-surface-alt);
    border-radius: 4px;
    overflow: hidden;
}

.progress-bar {
    height: 18px;
    background: #28a745;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
}


.ps-charts { display:flex; gap:14px; align-items:stretch; margin-bottom:12px }
.ps-chart-large { flex: 0 0 380px; height: 340px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 8px }
.ps-chart-small { flex: 1; height: 340px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 8px }
.ps-charts canvas { width: 100% !important; height: 100% !important }

.ps-chart-wrapper {
    width: 100%;
    height: 220px;
    margin-bottom: 12px
}

.ps-chart-wrapper canvas {
    width: 100% !important;
    height: 100% !important
}

.ps-tables {
    display: flex;
    gap: 20px;
    width: 100%;
}

.ps-col {
    flex: 1;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 12px;
    color: var(--color-text);
}

.ps-title {
    margin: 6px 0 10px;
    font-size: 16px;
    font-weight: 600
}

.ps-table {
    width: 100%
}

.ps-table thead {
    background: var(--color-surface-alt)
}

.ps-table th,
.ps-table td {
    padding: 12px 14px
}

.ps-table td.text-right { white-space: nowrap }

.ps-table tbody tr:hover {
    background: rgba(214, 92, 16, 0.08)
}

.status-badge {
    min-width: 80px;
    text-align: center;
    font-weight: 600;
    background: transparent;
}

.plan-actions {
    white-space: nowrap;
}

.plan-action {
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
    margin-right: 6px;
}

.plan-action:hover {
    background: var(--color-surface-alt);
    color: #d65c10;
}

.plan-comment-modal {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: flex;
    align-items: center;
    justify-content: center;
}

.plan-comment-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(16, 24, 40, 0.55);
}

.plan-comment-dialog {
    position: relative;
    z-index: 1;
    width: min(520px, calc(100vw - 32px));
    background: var(--color-surface);
    color: var(--color-text);
    border-radius: 8px;
    box-shadow: 0 18px 50px rgba(16, 24, 40, 0.22);
    overflow: hidden;
}

.plan-comment-header,
.plan-comment-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid var(--color-border);
}

.plan-comment-footer {
    justify-content: flex-end;
    border-top: 1px solid var(--color-border);
    border-bottom: 0;
}

.plan-comment-header h4 {
    margin: 0;
    font-size: 16px;
}

.plan-comment-close {
    width: 30px;
    height: 30px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    font-size: 22px;
    line-height: 1;
}

.plan-comment-body {
    padding: 16px;
}

.plan-comment-body textarea {
    width: 100%;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 10px 12px;
    resize: vertical;
    font: inherit;
    outline: none;
    background: var(--color-surface-alt);
    color: var(--color-text);
}

.plan-comment-text {
    margin: 0;
    min-height: 64px;
    white-space: pre-wrap;
}

.ps-save-btn {
    border: 0;
    border-radius: 8px;
    padding: 9px 14px;
    background: #d65c10;
    color: #fff;
    cursor: pointer;
    font-weight: 600;
}

@media (max-width: 900px) {
    .ps-charts { flex-direction: column }
    .ps-chart-large, .ps-chart-small { width: 100%; flex: none; height: 260px }
    .ps-tables { flex-direction: column }
    .ps-col { width: 100%; }
}
</style>
