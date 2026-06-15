const ShuttleStats = {
    opponentChart: null,
    partnerChart: null,

    opponentFilters: {
        time_range: '30d',
        type: 'all',
        include_unlimited: true
    },
    partnerFilters: {
        time_range: '30d',
        type: 'all',
        include_unlimited: true
    },

    init() {
        this.setupFilters('opponent');
        this.setupFilters('partner');
        this.loadOpponentData();
        this.loadPartnerData();
    },

    setupFilters(chartName) {
        const container = document.getElementById(chartName + '-filters');
        if (!container) return;

        container.querySelectorAll('.filter-group').forEach(group => {
            const filterType = group.dataset.filter;
            const buttons = group.querySelectorAll('.stats-tab, .filter-chip');

            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    buttons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.onFilterChange(chartName, filterType, btn.dataset.value);
                });
            });
        });
    },

    onFilterChange(chartName, filterType, value) {
        const filters = chartName === 'opponent' ? this.opponentFilters : this.partnerFilters;

        if (filterType === 'time') {
            filters.time_range = value;
        } else if (filterType === 'type') {
            filters.type = value;
        } else if (filterType === 'formal') {
            filters.include_unlimited = value === 'include_unlimited';
        }

        if (chartName === 'opponent') {
            this.loadOpponentData();
        } else {
            this.loadPartnerData();
        }
    },

    buildParams(filters) {
        const params = {
            team_id: null,
            time_range: filters.time_range,
            include_unlimited: filters.include_unlimited
        };
        if (filters.type !== 'all') {
            params.type = filters.type;
        }
        return params;
    },

    async loadOpponentData() {
        const params = this.buildParams(this.opponentFilters);
        const res = await ShuttleAPI.stats.opponentWinRate(params);
        this.renderOpponentChart(res.ok ? (res.data || []) : []);
    },

    async loadPartnerData() {
        const params = this.buildParams(this.partnerFilters);
        const res = await ShuttleAPI.stats.partnerWinRate(params);
        this.renderPartnerChart(res.ok ? (res.data || []) : []);
    },

    renderOpponentChart(data) {
        if (this.opponentChart) {
            this.opponentChart.destroy();
            this.opponentChart = null;
        }

        const wrapper = document.getElementById('opponent-chart-wrapper');
        const empty = document.getElementById('opponent-empty');
        const canvas = document.getElementById('opponent-chart');

        if (!data || data.length === 0) {
            wrapper.style.display = 'none';
            empty.style.display = 'block';
            return;
        }

        wrapper.style.display = 'block';
        empty.style.display = 'none';

        const sorted = [...data].sort((a, b) => b.win_rate - a.win_rate);
        const height = Math.max(200, sorted.length * 40);
        wrapper.style.height = height + 'px';

        this.opponentChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: sorted.map(d => d.opponent_name),
                datasets: [{
                    data: sorted.map(d => d.win_rate),
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    barThickness: 24
                }]
            },
            options: this.chartOptions(sorted)
        });
    },

    renderPartnerChart(data) {
        if (this.partnerChart) {
            this.partnerChart.destroy();
            this.partnerChart = null;
        }

        const wrapper = document.getElementById('partner-chart-wrapper');
        const empty = document.getElementById('partner-empty');
        const canvas = document.getElementById('partner-chart');

        if (!data || data.length === 0) {
            wrapper.style.display = 'none';
            empty.style.display = 'block';
            return;
        }

        wrapper.style.display = 'block';
        empty.style.display = 'none';

        const sorted = [...data].sort((a, b) => b.win_rate - a.win_rate);
        const height = Math.max(200, sorted.length * 40);
        wrapper.style.height = height + 'px';

        this.partnerChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: sorted.map(d => d.partner_name),
                datasets: [{
                    data: sorted.map(d => d.win_rate),
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    barThickness: 24
                }]
            },
            options: this.chartOptions(sorted)
        });
    },

    chartOptions(sorted) {
        return {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const item = sorted[ctx.dataIndex];
                            const matchCount = item ? (item.match_count || item.total_matches || 0) : 0;
                            return `${ctx.raw}% (${matchCount}场)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    min: 0,
                    max: 100,
                    ticks: { callback: v => v + '%' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { size: 13 } }
                }
            }
        };
    }
};
