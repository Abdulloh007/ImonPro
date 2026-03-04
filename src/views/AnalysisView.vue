<script setup lang="ts">
import { useIndexStore } from '@/stores'
import { UseLoaderStore } from '@/stores/loader'
import { useToasterStore } from '@/stores/toaster'
import axios from 'axios'
import { computed, onMounted, ref } from 'vue'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Filler,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    Title,
    Tooltip,
    type ChartData,
    type ChartOptions
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, ArcElement, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Filler)

interface CategoryStats {
    key: string
    label: string
    total: number
    sold: number
    reserved: number
    available: number
    remaining: number
    soldSquare: number
}

interface PaymentTotals {
    soldUnits: number
    soldUnitsWithOrder: number
    paidTotal: number
    expectedMonth: number
    expectedTotal: number
}

interface SalesTrend {
    period: string
    soldAmount: number
    paidAmount: number
    expectedAmount: number
}

interface AnalyticsResponse {
    summary: {
        total: number
        sold: number
        reserved: number
        available: number
        remaining: number
        soldSquare: number
    }
    payments: PaymentTotals
    categories: CategoryStats[]
    trends?: SalesTrend[]
}

interface ProjectOption {
    key: string
    projectId: string
    title: string
    serverLink: string
    token: string
    serverLabel: string
}

const indexStore = useIndexStore()
const loaderStore = UseLoaderStore()
const toasterStore = useToasterStore()

const projectOptions = ref<ProjectOption[]>([])
const selectedProjectKey = ref<string>('')

const categories = ref<Record<string, CategoryStats>>({})
const trends = ref<Record<string, SalesTrend>>({})

const paymentTotals = ref<PaymentTotals>({
    soldUnits: 0,
    soldUnitsWithOrder: 0,
    paidTotal: 0,
    expectedMonth: 0,
    expectedTotal: 0
})

const summary = ref({
    total: 0,
    sold: 0,
    reserved: 0,
    available: 0,
    remaining: 0,
    soldSquare: 0
})

const selectedProject = computed(() => projectOptions.value.find(item => item.key === selectedProjectKey.value) || null)
const rowsByCategory = computed(() => Object.values(categories.value))
const rowsByTrend = computed(() => Object.values(trends.value).sort((a, b) => a.period.localeCompare(b.period)))

const generalTotals = computed(() => ({
    total: summary.value.total,
    sold: summary.value.sold,
    reserved: summary.value.reserved,
    available: summary.value.available,
    remaining: summary.value.remaining,
    soldSquare: summary.value.soldSquare,
    soldPercent: summary.value.total > 0 ? (summary.value.sold / summary.value.total) * 100 : 0
}))

const salesDoughnutData = computed<ChartData<'doughnut'>>(() => ({
    labels: ['Продано', 'Осталось', 'Резерв'],
    datasets: [
        {
            data: [generalTotals.value.sold, generalTotals.value.remaining, generalTotals.value.reserved],
            backgroundColor: ['#79AB33', '#D9D9D9', '#FAF2A0']
        }
    ]
}))

const categoryBarData = computed<ChartData<'bar'>>(() => ({
    labels: rowsByCategory.value.map(item => item.label),
    datasets: [
        {
            label: 'Продано',
            data: rowsByCategory.value.map(item => item.sold),
            backgroundColor: '#79AB33'
        },
        {
            label: 'Осталось',
            data: rowsByCategory.value.map(item => item.remaining),
            backgroundColor: '#D65C10'
        }
    ]
}))

const paymentsBarData = computed<ChartData<'bar'>>(() => ({
    labels: ['Оплаты'],
    datasets: [
        {
            label: 'Оплачено',
            data: [paymentTotals.value.paidTotal],
            backgroundColor: '#79AB33'
        },
        {
            label: 'Ожидается в месяце',
            data: [paymentTotals.value.expectedMonth],
            backgroundColor: '#f7b487'
        },
        {
            label: 'Ожидается всего',
            data: [paymentTotals.value.expectedTotal],
            backgroundColor: '#D65C10'
        }
    ]
}))

const trendLineData = computed<ChartData<'line'>>(() => ({
    labels: rowsByTrend.value.map(item => item.period),
    datasets: [
        {
            label: 'Продажи',
            data: rowsByTrend.value.map(item => item.soldAmount),
            borderColor: '#D65C10',
            backgroundColor: 'rgba(214, 92, 16, 0.2)',
            fill: true,
            tension: 0.35
        },
        {
            label: 'Оплачено',
            data: rowsByTrend.value.map(item => item.paidAmount),
            borderColor: '#79AB33',
            backgroundColor: 'rgba(121, 171, 51, 0.2)',
            fill: true,
            tension: 0.35
        },
        {
            label: 'Ожидается',
            data: rowsByTrend.value.map(item => item.expectedAmount),
            borderColor: '#808080',
            backgroundColor: 'rgba(128, 128, 128, 0.2)',
            fill: true,
            tension: 0.35
        }
    ]
}))

const chartOptionsCommon: ChartOptions<'bar' | 'line' | 'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom'
        }
    }
}

function resetAnalyticsState() {
    categories.value = {}
    trends.value = {}
    paymentTotals.value = {
        soldUnits: 0,
        soldUnitsWithOrder: 0,
        paidTotal: 0,
        expectedMonth: 0,
        expectedTotal: 0
    }
    summary.value = {
        total: 0,
        sold: 0,
        reserved: 0,
        available: 0,
        remaining: 0,
        soldSquare: 0
    }
}

function addSummary(value: AnalyticsResponse['summary']) {
    summary.value.total += Number(value.total || 0)
    summary.value.sold += Number(value.sold || 0)
    summary.value.reserved += Number(value.reserved || 0)
    summary.value.available += Number(value.available || 0)
    summary.value.remaining += Number(value.remaining || 0)
    summary.value.soldSquare += Number(value.soldSquare || 0)
}

function addPayments(value: PaymentTotals) {
    paymentTotals.value.soldUnits += Number(value.soldUnits || 0)
    paymentTotals.value.soldUnitsWithOrder += Number(value.soldUnitsWithOrder || 0)
    paymentTotals.value.paidTotal += Number(value.paidTotal || 0)
    paymentTotals.value.expectedMonth += Number(value.expectedMonth || 0)
    paymentTotals.value.expectedTotal += Number(value.expectedTotal || 0)
}

function addCategories(list: CategoryStats[]) {
    for (const row of list) {
        const key = row.key || row.label
        if (!categories.value[key]) {
            categories.value[key] = {
                key,
                label: row.label,
                total: 0,
                sold: 0,
                reserved: 0,
                available: 0,
                remaining: 0,
                soldSquare: 0
            }
        }

        categories.value[key].total += Number(row.total || 0)
        categories.value[key].sold += Number(row.sold || 0)
        categories.value[key].reserved += Number(row.reserved || 0)
        categories.value[key].available += Number(row.available || 0)
        categories.value[key].remaining += Number(row.remaining || 0)
        categories.value[key].soldSquare += Number(row.soldSquare || 0)
    }
}

function addTrends(list: SalesTrend[]) {
    for (const row of list) {
        const period = row.period
        if (!period) {
            continue
        }

        if (!trends.value[period]) {
            trends.value[period] = {
                period,
                soldAmount: 0,
                paidAmount: 0,
                expectedAmount: 0
            }
        }

        trends.value[period].soldAmount += Number(row.soldAmount || 0)
        trends.value[period].paidAmount += Number(row.paidAmount || 0)
        trends.value[period].expectedAmount += Number(row.expectedAmount || 0)
    }
}

async function loadProjectOptions() {
    const options: ProjectOption[] = []

    for (const server of indexStore.servers) {
        try {
            const response = await axios.get(server.link + '/api/projects', {
                headers: {
                    Authorization: 'Basic ' + server.token
                }
            })

            const projects = Array.isArray(response.data) ? response.data : []
            const serverLabel = server.link.replace(/^https?:\/\//, '')

            for (const project of projects) {
                const projectId = String(project?.id ?? '')
                if (!projectId) {
                    continue
                }

                const title = String(project?.title ?? projectId)
                options.push({
                    key: server.link + '::' + projectId,
                    projectId,
                    title,
                    serverLink: server.link,
                    token: server.token,
                    serverLabel
                })
            }
        } catch (err: any) {
            toasterStore.add({
                title: err?.code || 'Ошибка',
                descr: 'Не удалось загрузить список проектов с сервера ' + server.link,
                type: 'danger'
            })
        }
    }

    projectOptions.value = options.sort((a, b) => a.title.localeCompare(b.title))

    if (!selectedProjectKey.value && projectOptions.value.length > 0) {
        selectedProjectKey.value = projectOptions.value[0].key
    }
}

async function fetchProjectAnalytics(project: ProjectOption): Promise<AnalyticsResponse> {
    const response = await axios.get(project.serverLink + '/api/analytics/overview/' + project.projectId, {
        headers: {
            Authorization: 'Basic ' + project.token
        }
    })

    return response.data as AnalyticsResponse
}

async function loadSelectedProjectAnalytics() {
    const project = selectedProject.value
    if (!project) {
        return
    }

    loaderStore.isActive = true
    resetAnalyticsState()

    try {
        const data = await fetchProjectAnalytics(project)
        addSummary(data.summary)
        addPayments(data.payments)
        addCategories(Array.isArray(data.categories) ? data.categories : [])
        addTrends(Array.isArray(data.trends) ? data.trends : [])
    } catch (err: any) {
        toasterStore.add({
            title: err?.code || 'Ошибка',
            descr: err?.message || 'Ошибка загрузки аналитики проекта. Ожидается endpoint /api/analytics/overview?projectId={id}',
            type: 'danger'
        })
    } finally {
        loaderStore.isActive = false
    }
}

async function onProjectChange() {
    await loadSelectedProjectAnalytics()
}

function formatNumber(value: number): string {
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)
}

onMounted(async () => {
    loaderStore.isActive = true

    try {
        await loadProjectOptions()
    } finally {
        loaderStore.isActive = false
    }

    await loadSelectedProjectAnalytics()
})
</script>

<template lang="pug">
main.ip-main
    section.header
        .ip-container.ip-dfw.ip-justify-content-between.ip-align-items-center
            .left-slot
                h2.title Анализ
                .bread-crumbs
                    RouterLink(to="/reports") Все отчеты
            .right-slot
                .ip-filter.project.ip-dfw
                    label(for="project") Проект
                    select(id="project" v-model="selectedProjectKey" @change="onProjectChange")
                        option(v-if="projectOptions.length === 0" value="") Нет проектов
                        option(v-for="project in projectOptions" :key="project.key" :value="project.key") {{ project.title }} ({{ project.serverLabel }})

    section.content
        .ip-container
            .ip-current-project(v-if="selectedProject")
                span.ip-current-project__label Выбран проект:
                b {{ selectedProject.title }}

            .ip-cards
                .ip-card
                    .ip-card__title Всего объектов
                    .ip-card__value {{ formatNumber(generalTotals.total) }}
                .ip-card
                    .ip-card__title Продано
                    .ip-card__value {{ formatNumber(generalTotals.sold) }}
                .ip-card
                    .ip-card__title Осталось
                    .ip-card__value {{ formatNumber(generalTotals.remaining) }}
                .ip-card
                    .ip-card__title Резерв
                    .ip-card__value {{ formatNumber(generalTotals.reserved) }}
                .ip-card
                    .ip-card__title Доступно
                    .ip-card__value {{ formatNumber(generalTotals.available) }}
                .ip-card
                    .ip-card__title Продажи, %
                    .ip-card__value {{ formatNumber(generalTotals.soldPercent) }}%

            .ip-cards
                .ip-card
                    .ip-card__title Оплачено (из проданных)
                    .ip-card__value {{ formatNumber(paymentTotals.paidTotal) }}
                .ip-card
                    .ip-card__title Ожидается в этом месяце
                    .ip-card__value {{ formatNumber(paymentTotals.expectedMonth) }}
                .ip-card
                    .ip-card__title Ожидается всего
                    .ip-card__value {{ formatNumber(paymentTotals.expectedTotal) }}
                .ip-card
                    .ip-card__title Проданные с договором
                    .ip-card__value {{ formatNumber(paymentTotals.soldUnitsWithOrder) }} / {{ formatNumber(paymentTotals.soldUnits) }}
                .ip-card
                    .ip-card__title Проданная площадь (м²)
                    .ip-card__value {{ formatNumber(generalTotals.soldSquare) }}

            .ip-charts
                .ip-chart
                    .ip-chart__title Статус продаж
                    .ip-chart__canvas
                        Doughnut(:data="salesDoughnutData" :options="chartOptionsCommon")
                .ip-chart
                    .ip-chart__title Оплаты и ожидания
                    .ip-chart__canvas
                        Bar(:data="paymentsBarData" :options="chartOptionsCommon")
                .ip-chart.ip-chart_full
                    .ip-chart__title Продано и остаток по типам объектов
                    .ip-chart__canvas
                        Bar(:data="categoryBarData" :options="chartOptionsCommon")
                .ip-chart.ip-chart_full(v-if="rowsByTrend.length")
                    .ip-chart__title Динамика по периодам
                    .ip-chart__canvas
                        Line(:data="trendLineData" :options="chartOptionsCommon")

            .ip-section
                h3.ip-section__title По категориям
                .ip-table
                    .ip-t__row.ip-head
                        .ip-t__data Категория
                        .ip-t__data Всего
                        .ip-t__data Продано
                        .ip-t__data Осталось
                        .ip-t__data Резерв
                        .ip-t__data Доступно
                        .ip-t__data Продано м²
                    .ip-t__row(v-for="row in rowsByCategory" :key="row.label")
                        .ip-t__data {{ row.label }}
                        .ip-t__data {{ formatNumber(row.total) }}
                        .ip-t__data {{ formatNumber(row.sold) }}
                        .ip-t__data {{ formatNumber(row.remaining) }}
                        .ip-t__data {{ formatNumber(row.reserved) }}
                        .ip-t__data {{ formatNumber(row.available) }}
                        .ip-t__data {{ formatNumber(row.soldSquare) }}
</template>

<style scoped lang="scss">
.content {
    padding-bottom: 20vh;
}

.ip-current-project {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 6px;

    &__label {
        color: #6b6b6b;
    }
}

.ip-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
}

.ip-charts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 16px;
}

.ip-chart {
    background: #f5f5f5;
    border-radius: 8px;
    padding: 12px;

    &_full {
        grid-column: 1 / -1;
    }

    &__title {
        font-weight: 600;
        margin-bottom: 12px;
    }

    &__canvas {
        position: relative;
        height: 300px;
    }
}

.ip-card {
    padding: 12px;
    background: #f5f5f5;
    border-radius: 8px;

    &__title {
        font-size: 14px;
        color: #6b6b6b;
        margin-bottom: 6px;
    }

    &__value {
        font-size: 22px;
        font-weight: 700;
    }
}

.ip-section {
    margin-top: 20px;

    &__title {
        margin-bottom: 10px;
    }
}

.ip-table {
    display: flex;
    flex-direction: column;
    overflow: auto;
    max-width: 100%;

    .ip-t__row {
        display: flex;
        margin-bottom: 5px;
        min-width: 700px;

        &.ip-head {
            position: sticky;
            top: 0;
            z-index: 10;
            box-shadow: 0 1px 6px -3px #000;
        }

        &:nth-child(odd) {
            .ip-t__data {
                background-color: #f7b487;
            }
        }

        .ip-t__data {
            width: 100%;
            padding: 10px;
            background-color: #D9D9D9;
            display: flex;
            justify-content: center;
            align-items: center;

            &:first-child {
                justify-content: flex-start;
                min-width: 170px;
            }

            &:not(:last-child) {
                margin-right: 5px;
            }
        }
    }
}

@media (max-width: 992px) {
    .ip-charts {
        grid-template-columns: 1fr;
    }

    .ip-chart {
        &__canvas {
            height: 280px;
        }
    }
}

@media (max-width: 576px) {
    .ip-card {
        &__value {
            font-size: 18px;
        }
    }

    .ip-chart {
        &__canvas {
            height: 240px;
        }
    }
}
</style>
