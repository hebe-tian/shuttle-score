const ShuttleStats = {
    SECTION_TYPES: {
        singles: [
            { value: '', label: '全部' },
            { value: 'ms', label: '男单' },
            { value: 'ws', label: '女单' },
            { value: 'os', label: '无限制单打' }
        ],
        doubles: [
            { value: '', label: '全部' },
            { value: 'md', label: '男双' },
            { value: 'wd', label: '女双' },
            { value: 'xd', label: '混双' },
            { value: 'od', label: '无限制双打' }
        ]
    },
    sections: [
        { id: 'singles', label: '单打统计', type: 'singles', matchType: '', subTab: 'winrate', chart: null },
        { id: 'doubles', label: '双打统计', type: 'doubles', matchType: '', subTab: 'winrate', chart: null }
    ],
    filters: {},

    init() {
        this.loadOrder();
        this.renderSections();
        this.bindDrag();
        this.loadAllData();
    },

    loadOrder() {
        try {
            const saved = localStorage.getItem('shuttle_stats_order');
            if (saved) {
                const order = JSON.parse(saved);
                this.sections.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
            }
        } catch (e) {}
    },

    saveOrder() {
        const order = this.sections.map(s => s.id);
        localStorage.setItem('shuttle_stats_order', JSON.stringify(order));
    },

    renderSections() {
        const container = document.getElementById('stats-sections');
        if (!container) return;

        container.innerHTML = this.sections.map(s => {
            const typeChips = this.SECTION_TYPES[s.id].map(t =>
                `<button class="type-chip ${s.matchType === t.value ? 'active' : ''}" data-section="${s.id}" data-match-type="${t.value}">${t.label}</button>`
            ).join('');

            return `
            <div class="stats-section" id="section-${s.id}" draggable="true" data-section-id="${s.id}">
                <div class="section-header">
                    <span class="section-title">${s.label}</span>
                    <span class="drag-handle" title="拖拽排序">::::</span>
                </div>
                <div class="type-chips">${typeChips}</div>
                <div class="sub-tabs">
                    <button class="sub-tab ${s.subTab === 'winrate' ? 'active' : ''}" data-section="${s.id}" data-tab="winrate">胜率统计</button>
                    <button class="sub-tab ${s.subTab === 'score' ? 'active' : ''}" data-section="${s.id}" data-tab="score">得分统计</button>
                </div>
                <div class="chart-container">
                    <canvas id="chart-${s.id}"></canvas>
                </div>
            </div>
            `;
        }).join('');

        container.querySelectorAll('.type-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const sectionId = btn.dataset.section;
                const matchType = btn.dataset.matchType;
                const section = this.sections.find(s => s.id === sectionId);
                if (section) {
                    section.matchType = matchType;
                    btn.parentElement.querySelectorAll('.type-chip').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.loadSectionData(section);
                }
            });
        });

        container.querySelectorAll('.sub-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const sectionId = btn.dataset.section;
                const tab = btn.dataset.tab;
                const section = this.sections.find(s => s.id === sectionId);
                if (section) {
                    section.subTab = tab;
                    btn.parentElement.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.loadSectionData(section);
                }
            });
        });
    },

    bindDrag() {
        const container = document.getElementById('stats-sections');
        if (!container) return;

        let dragEl = null;

        container.addEventListener('dragstart', (e) => {
            const section = e.target.closest('.stats-section');
            if (!section) return;
            dragEl = section;
            section.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        container.addEventListener('dragend', (e) => {
            const section = e.target.closest('.stats-section');
            if (section) section.classList.remove('dragging');
            container.querySelectorAll('.stats-section').forEach(s => s.classList.remove('drag-over'));
            dragEl = null;
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const target = e.target.closest('.stats-section');
            if (target && target !== dragEl) {
                container.querySelectorAll('.stats-section').forEach(s => s.classList.remove('drag-over'));
                target.classList.add('drag-over');
            }
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            const target = e.target.closest('.stats-section');
            if (!target || !dragEl || target === dragEl) return;

            const allSections = [...container.querySelectorAll('.stats-section')];
            const dragIdx = allSections.indexOf(dragEl);
            const targetIdx = allSections.indexOf(target);

            if (dragIdx < targetIdx) {
                container.insertBefore(dragEl, target.nextSibling);
            } else {
                container.insertBefore(dragEl, target);
            }

            const newOrder = [...container.querySelectorAll('.stats-section')].map(s => s.dataset.sectionId);
            this.sections.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
            this.saveOrder();

            container.querySelectorAll('.stats-section').forEach(s => s.classList.remove('drag-over'));
        });
    },

    async loadAllData() {
        for (const section of this.sections) {
            await this.loadSectionData(section);
        }
    },

    async loadSectionData(section) {
        const typeFilter = section.matchType || section.type;
        const data = { type: typeFilter, ...this.filters };

        if (section.subTab === 'winrate') {
            const res = await ShuttleAPI.stats.winRate(data);
            if (res.ok) this.renderChart(section, res.data || [], 'winrate');
        } else {
            const res = await ShuttleAPI.stats.score(data);
            if (res.ok) this.renderChart(section, res.data || [], 'score');
        }
    },

    renderChart(section, data, type) {
        if (section.chart) {
            section.chart.destroy();
            section.chart = null;
        }

        const canvas = document.getElementById(`chart-${section.id}`);
        if (!canvas) return;

        const labels = data.map(d => d.player_name);
        const colors = data.map((_, i) => {
            const palette = ['#52b788', '#74c69d', '#95d5b2', '#40916c', '#2d6a4f', '#b7e4c7', '#1b4332'];
            return palette[i % palette.length];
        });

        let chartData;
        if (type === 'winrate') {
            chartData = {
                labels,
                datasets: [{
                    label: '胜率 (%)',
                    data: data.map(d => d.win_rate),
                    backgroundColor: colors,
                    borderRadius: 6,
                    minBarLength: 2
                }]
            };
        } else {
            chartData = {
                labels,
                datasets: [
                    {
                        label: '总得分',
                        data: data.map(d => d.total_score),
                        backgroundColor: colors.map(c => c),
                        borderRadius: 6,
                        minBarLength: 2
                    },
                    {
                        label: '场均得分',
                        data: data.map(d => d.avg_score),
                        backgroundColor: colors.map(c => c + '88'),
                        borderRadius: 6,
                        minBarLength: 2
                    }
                ]
            };
        }

        section.chart = new Chart(canvas, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: type === 'score',
                        position: 'top'
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            title: (items) => {
                                return items[0]?.label || '';
                            },
                            label: (ctx) => {
                                if (type === 'winrate') {
                                    return `胜率: ${ctx.raw}%`;
                                }
                                return `${ctx.dataset.label}: ${ctx.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: type === 'winrate' ? 100 : undefined,
                        ticks: {
                            callback: (v) => type === 'winrate' ? v + '%' : v
                        }
                    }
                }
            }
        });
    },

    async applyFilters() {
        this.filters = {};
        const member = document.getElementById('stats-member')?.value.trim();
        const startDate = document.getElementById('stats-start')?.value;
        const endDate = document.getElementById('stats-end')?.value;

        if (member) this.filters.member_name = member;
        if (startDate) this.filters.start_time = Math.floor(new Date(startDate).getTime() / 1000);
        if (endDate) this.filters.end_time = Math.floor(new Date(endDate + 'T23:59:59').getTime() / 1000);

        await this.loadAllData();
    }
};
