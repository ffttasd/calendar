// 智能日历应用 - 纯静态版本
// 不依赖任何外部库，纯原生JavaScript实现

// 全局状态管理
class CalendarState {
    constructor() {
        this.currentDate = new Date();
        this.view = 'week'; // 'month', 'week', 'day'
        this.events = this.generateSampleEvents();
        this.selectedEvent = null;
        this.isEventModalOpen = false;
        this.todos = this.loadTodos(); // 加载 TODO 数据
        this.todoViewMode = this.loadTodoViewMode(); // 加载 TODO 视图模式
        
        // 专注模式设置（固定值）
        this.focusSettings = {
            minInterval: 3,      // 最小间隔（分钟）
            maxInterval: 5,      // 最大间隔（分钟）
            restDuration: 10     // 休息提示时长（秒）
        };
        
        // 当前运行的专注会话
        this.activeFocusSession = {
            eventId: null,       // 正在专注的日程ID
            nextAlertTime: null, // 下次提示音时间
            timerId: null,       // 计时器ID
            restTimerId: null    // 休息提示计时器ID
        };
    }

    // 加载 TODO 数据
    loadTodos() {
        const saved = localStorage.getItem('calendarTodos');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load todos:', e);
            }
        }
        return {
            simple: [], // 简洁模式的 TODO 列表
            1: [], // 重要且紧急
            2: [], // 重要但不紧急
            3: [], // 不重要但紧急
            4: [],  // 不重要且不紧急
            history: [] // 历史记录
        };
    }

    // 加载 TODO 视图模式
    loadTodoViewMode() {
        const saved = localStorage.getItem('todoViewMode');
        return saved || 'simple'; // 默认简洁模式
    }

    // 保存 TODO 视图模式
    saveTodoViewMode(mode) {
        localStorage.setItem('todoViewMode', mode);
    }

    // 保存 TODO 数据
    saveTodos() {
        try {
            localStorage.setItem('calendarTodos', JSON.stringify(this.todos));
        } catch (e) {
            console.error('Failed to save todos:', e);
        }
    }

    // 添加 TODO
    addTodo(quadrant, text) {
        const todo = {
            id: Date.now().toString(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };
        this.todos[quadrant].push(todo);
        this.saveTodos();
        return todo;
    }

    // 切换 TODO 完成状态
    toggleTodo(quadrant, todoId) {
        const todo = this.todos[quadrant].find(t => t.id === todoId);
        if (todo) {
            todo.completed = !todo.completed;
            
            // 如果标记为完成，移入历史记录
            if (todo.completed) {
                // 从当前象限移除
                this.todos[quadrant] = this.todos[quadrant].filter(t => t.id !== todoId);
                
                // 添加到历史记录
                if (!this.todos.history) {
                    this.todos.history = [];
                }
                this.todos.history.unshift({
                    ...todo,
                    completedAt: new Date().toISOString(),
                    fromQuadrant: quadrant
                });
            }
            
            this.saveTodos();
        }
    }

    // 删除 TODO
    deleteTodo(quadrant, todoId) {
        this.todos[quadrant] = this.todos[quadrant].filter(t => t.id !== todoId);
        this.saveTodos();
    }

    // 生成示例事件数据
    generateSampleEvents() {
        // 先尝试从localStorage加载
        const saved = localStorage.getItem('calendarEvents');
        if (saved) {
            try {
                const events = JSON.parse(saved);
                // 转换日期字符串为Date对象
                return events.map(event => ({
                    ...event,
                    startTime: new Date(event.startTime),
                    endTime: new Date(event.endTime)
                }));
            } catch (e) {
                console.error('Failed to load events from localStorage:', e);
            }
        }
        
        // 如果没有保存的数据，返回示例数据
        const today = new Date();
        return [
            {
                id: '1',
                title: '团队周会',
                description: '讨论本周工作进展和计划',
                startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0),
                endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0),
                color: '#3b82f6',
                location: '会议室 A',
                focusAlert: false  // 是否启用随机提示音
            },
            {
                id: '2',
                title: '产品评审',
                description: '新产品功能评审会议',
                startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
                endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 30),
                color: '#22c55e',
                location: '会议室 B',
                focusAlert: false
            },
            {
                id: '3',
                title: '客户演示',
                description: '向客户展示产品功能',
                startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 9, 0),
                endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 30),
                color: '#f59e0b',
                location: '线上会议',
                focusAlert: false
            },
            {
                id: '4',
                title: '设计评审',
                description: 'UI/UX设计评审',
                startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 13, 0),
                endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 14, 0),
                color: '#a855f7',
                location: '设计室',
                focusAlert: false
            },
            {
                id: '5',
                title: '代码审查',
                description: '审查代码提交',
                startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 15, 0),
                endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 16, 0),
                color: '#06b6d4',
                location: '开发区',
                focusAlert: false
            }
        ];
    }

    // 保存事件到localStorage
    saveEvents() {
        try {
            const eventsToSave = this.events.map(event => ({
                ...event,
                startTime: event.startTime.toISOString(),
                endTime: event.endTime.toISOString()
            }));
            localStorage.setItem('calendarEvents', JSON.stringify(eventsToSave));
        } catch (e) {
            console.error('Failed to save events to localStorage:', e);
        }
    }
}

// 日期工具函数
class DateUtils {
    // 将分钟数对齐到15分钟的倍数
    static roundToQuarterHour(minutes) {
        return Math.round(minutes / 15) * 15;
    }
    
    static formatDate(date, format = 'YYYY-MM-DD') {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        switch (format) {
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            case 'YYYY年 M月':
                return `${year}年 ${date.getMonth() + 1}月`;
            case 'M月d日':
                return `${date.getMonth() + 1}月${date.getDate()}日`;
            case 'YYYY年 M月d日 EEEE':
                const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                return `${year}年 ${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
            case 'HH:mm':
                return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            default:
                return date.toLocaleDateString('zh-CN');
        }
    }

    static isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    static isSameMonth(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth();
    }

    static isToday(date) {
        return this.isSameDay(date, new Date());
    }

    static startOfMonth(date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    static endOfMonth(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    }

    static startOfWeek(date) {
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // 周一为第一天
        return new Date(date.getFullYear(), date.getMonth(), diff);
    }

    static endOfWeek(date) {
        const startWeek = this.startOfWeek(date);
        return new Date(startWeek.getFullYear(), startWeek.getMonth(), startWeek.getDate() + 6);
    }

    static addMonths(date, months) {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + months);
        return newDate;
    }

    static addWeeks(date, weeks) {
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() + weeks * 7);
        return newDate;
    }

    static addDays(date, days) {
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() + days);
        return newDate;
    }

    static getCalendarDays(date, view) {
        switch (view) {
            case 'month': {
                const monthStart = this.startOfMonth(date);
                const monthEnd = this.endOfMonth(date);
                const calendarStart = this.startOfWeek(monthStart);
                const calendarEnd = this.endOfWeek(monthEnd);
                
                const days = [];
                const current = new Date(calendarStart);
                while (current <= calendarEnd) {
                    days.push(new Date(current));
                    current.setDate(current.getDate() + 1);
                }
                return days;
            }
            case 'week': {
                const weekStart = this.startOfWeek(date);
                const days = [];
                for (let i = 0; i < 7; i++) {
                    const day = new Date(weekStart);
                    day.setDate(weekStart.getDate() + i);
                    days.push(day);
                }
                return days;
            }
            case 'day':
                return [new Date(date)];
            default:
                return [];
        }
    }

    static getViewTitle(date, view) {
        switch (view) {
            case 'month':
                return this.formatDate(date, 'YYYY年 M月');
            case 'week': {
                const weekStart = this.startOfWeek(date);
                const weekEnd = this.endOfWeek(date);
                return `${this.formatDate(weekStart, 'M月d日')} - ${this.formatDate(weekEnd, 'M月d日')}`;
            }
            case 'day':
                return this.formatDate(date, 'YYYY年 M月d日 EEEE');
            default:
                return '';
        }
    }
}

// 事件颜色配置 - 简约固定色
const EVENT_COLORS = [
    { name: '深绿', value: '#2d5f4f' },
    { name: '蓝色', value: '#3b82f6' },
    { name: '紫色', value: '#8b5cf6' },
    { name: '粉色', value: '#ec4899' },
    { name: '橙色', value: '#f59e0b' },
    { name: '红色', value: '#ef4444' },
    { name: '青色', value: '#06b6d4' },
    { name: '灰色', value: '#6b7280' }
];

// Toast 通知系统
class ToastManager {
    static show(message, description = '', type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        toast.innerHTML = `
            <div class="toast-title">${message}</div>
            ${description ? `<div class="toast-description">${description}</div>` : ''}
        `;
        
        container.appendChild(toast);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }
}

// 确认对话框系统
class ConfirmDialog {
    static show(title, message, onConfirm) {
        const dialog = document.getElementById('confirmDialog');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');
        const cancelBtn = document.getElementById('confirmCancelBtn');
        const okBtn = document.getElementById('confirmOkBtn');
        
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        // 显示对话框
        dialog.classList.remove('hidden');
        
        // 移除旧的事件监听器
        const newCancelBtn = cancelBtn.cloneNode(true);
        const newOkBtn = okBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        
        // 关闭对话框的函数
        const closeDialog = () => {
            dialog.classList.add('hidden');
            // 移除键盘事件监听
            document.removeEventListener('keydown', handleKeyDown);
        };
        
        // 确认的函数
        const confirmAction = () => {
            closeDialog();
            if (onConfirm) onConfirm();
        };
        
        // 键盘事件处理
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmAction();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeDialog();
            }
        };
        
        // 添加键盘事件监听
        document.addEventListener('keydown', handleKeyDown);
        
        // 取消按钮
        newCancelBtn.addEventListener('click', () => {
            closeDialog();
        });
        
        // 确定按钮
        newOkBtn.addEventListener('click', () => {
            confirmAction();
        });
        
        // 点击背景关闭
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        });
        
        // 聚焦到确认按钮，方便键盘操作
        setTimeout(() => {
            newOkBtn.focus();
        }, 100);
    }
}

// 主应用类
class CalendarApp {
    constructor() {
        this.state = new CalendarState();
        this.state.view = 'week'; // 默认周视图
        this.audioContext = null; // 音频上下文
        this.audioInitialized = false; // 音频是否已初始化
        this.pendingSounds = []; // 待播放的声音队列
        this.dragState = {
            isDragging: false,
            startDate: null,
            startTime: null,
            endTime: null,
            dragElement: null,
            isDraggingCard: false,
            cardDuration: 0,
            placeholderElement: null, // 保存占位符元素的引用
            isDraggingEvent: false, // 是否正在拖动事件卡片
            draggedEvent: null, // 被拖动的事件
            draggedCard: null, // 被拖动的卡片元素
            startX: 0, // 鼠标起始X位置
            startY: 0, // 鼠标起始Y位置
            hasMoved: false // 是否已经移动
        };
        this.clipboard = null; // 复制的事件
        this.init();
    }

    init() {
        // 添加loading类，隐藏内容避免闪烁
        document.getElementById('app').classList.add('loading');
        
        // 添加用户交互监听器来初始化音频上下文
        const initAudioOnInteraction = () => {
            this.initAudioContext();
            // 移除监听器，只需要初始化一次
            document.removeEventListener('click', initAudioOnInteraction);
            document.removeEventListener('keydown', initAudioOnInteraction);
        };
        document.addEventListener('click', initAudioOnInteraction);
        document.addEventListener('keydown', initAudioOnInteraction);
        
        this.bindEvents();
        this.render();
        this.setupColorPicker();
        this.startTimeLineUpdater();
        this.setupDurationCards();
        this.setupTodoSection(); // 初始化 TODO 区域
        this.setupSettings(); // 初始化设置功能
        this.initAutoBackup(); // 初始化自动备份
        this.startFocusChecker(); // 启动专注模式检查器
        
        // 延迟跳转到当前时间，确保DOM完全渲染（瞬间跳转，不滚动）
        setTimeout(() => {
            this.jumpToCurrentTime();
            // 跳转完成后移除loading类，显示内容
            document.getElementById('app').classList.remove('loading');
        }, 100);
    }

    // 瞬间跳转到当前时间（不使用平滑滚动）
    jumpToCurrentTime() {
        if (this.state.view !== 'week' && this.state.view !== 'day') return;
        
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // 计算当前时间的像素位置（每小时60px）
        const currentPosition = (currentHour * 60 + currentMinute);
        
        // 找到滚动容器 - 更精确的选择器
        let scrollContainer = null;
        
        if (this.state.view === 'day') {
            scrollContainer = document.querySelector('#dayView .flex-1.overflow-y-auto');
        } else if (this.state.view === 'week') {
            scrollContainer = document.querySelector('#weekView .flex-1.overflow-y-auto');
        }
        
        // 如果还没找到，尝试通用选择器
        if (!scrollContainer) {
            scrollContainer = document.querySelector('.calendar-view.active .flex-1.overflow-y-auto');
        }
        
        if (scrollContainer) {
            // 向上偏移150px，让当前时间显示在视口中间偏上
            const offset = 150;
            const targetScroll = Math.max(0, currentPosition - offset);
            
            // 直接设置scrollTop，瞬间跳转，不使用平滑滚动
            scrollContainer.scrollTop = targetScroll;
            
            console.log('Jumped to current time:', currentHour + ':' + String(currentMinute).padStart(2, '0'), 'Position:', targetScroll, 'Container:', scrollContainer);
        } else {
            console.warn('Could not find scroll container for view:', this.state.view);
        }
    }

    // 跳转到指定时间（小时和分钟）
    jumpToTime(hour, minute = 0) {
        if (this.state.view !== 'week' && this.state.view !== 'day') return;
        
        // 计算指定时间的像素位置（每小时60px）
        const targetPosition = (hour * 60 + minute);
        
        // 找到滚动容器 - 更精确的选择器
        let scrollContainer = null;
        
        if (this.state.view === 'day') {
            scrollContainer = document.querySelector('#dayView .flex-1.overflow-y-auto');
        } else if (this.state.view === 'week') {
            scrollContainer = document.querySelector('#weekView .flex-1.overflow-y-auto');
        }
        
        // 如果还没找到，尝试通用选择器
        if (!scrollContainer) {
            scrollContainer = document.querySelector('.calendar-view.active .flex-1.overflow-y-auto');
        }
        
        if (scrollContainer) {
            // 向上偏移150px，让目标时间显示在视口中间偏上
            const offset = 150;
            const targetScroll = Math.max(0, targetPosition - offset);
            
            // 直接设置scrollTop，瞬间跳转，不使用平滑滚动
            scrollContainer.scrollTop = targetScroll;
            
            console.log('Jumped to time:', hour + ':' + String(minute).padStart(2, '0'), 'Position:', targetScroll, 'Container:', scrollContainer);
        } else {
            console.warn('Could not find scroll container for view:', this.state.view);
        }
    }

    bindEvents() {
        // 导航按钮
        document.getElementById('prevBtn').addEventListener('click', () => this.goToPrev());
        document.getElementById('nextBtn').addEventListener('click', () => this.goToNext());
        document.getElementById('todayBtn').addEventListener('click', () => this.goToToday());

        // 视图切换
        document.getElementById('monthViewBtn').addEventListener('click', () => this.setView('month'));
        document.getElementById('weekViewBtn').addEventListener('click', () => this.setView('week'));
        document.getElementById('dayViewBtn').addEventListener('click', () => this.setView('day'));

        // 添加事件按钮
        document.getElementById('addEventBtn').addEventListener('click', () => this.openEventModal());

        // 模态框事件
        document.getElementById('cancelEventBtn').addEventListener('click', () => this.closeEventModal());
        document.getElementById('saveEventBtn').addEventListener('click', () => this.saveEvent());
        document.getElementById('deleteEventBtn').addEventListener('click', () => this.deleteEvent());

        // 点击模态框外部关闭
        document.getElementById('eventModal').addEventListener('click', (e) => {
            if (e.target.id === 'eventModal') {
                this.closeEventModal();
            }
        });

        // 详情面板事件
        document.getElementById('closeEventDetailBtn').addEventListener('click', () => this.closeEventDetail());
        document.getElementById('copyEventDetailBtn').addEventListener('click', () => this.copyFromDetail());
        document.getElementById('editEventDetailBtn').addEventListener('click', () => this.editFromDetail());
        document.getElementById('deleteEventDetailBtn').addEventListener('click', () => this.deleteFromDetail());

        // 点击详情面板外部关闭
        document.addEventListener('click', (e) => {
            const popup = document.getElementById('eventDetailPopup');
            if (!popup.classList.contains('hidden') && 
                !popup.contains(e.target) && 
                !e.target.closest('.positioned-event') &&
                !e.target.closest('.event-item')) {
                this.closeEventDetail();
            }
        });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.state.isEventModalOpen) {
                    this.closeEventModal();
                } else if (!document.getElementById('eventDetailPopup').classList.contains('hidden')) {
                    this.closeEventDetail();
                }
            }
        });

        // 复制粘贴快捷键
        document.addEventListener('keydown', (e) => {
            // Ctrl+C 或 Cmd+C - 复制选中的事件
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && this.state.selectedEvent) {
                e.preventDefault();
                this.copyEvent(this.state.selectedEvent);
            }
            // Ctrl+V 或 Cmd+V - 粘贴事件
            if ((e.ctrlKey || e.metaKey) && e.key === 'v' && this.clipboard) {
                e.preventDefault();
                this.pasteEvent();
            }
        });
        
        // 快速时长按钮
        document.querySelectorAll('.quick-duration-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const duration = parseInt(btn.dataset.duration);
                this.setEventDuration(duration);
            });
        });
    }

    setView(view) {
        this.state.view = view;
        this.updateViewButtons();
        this.render();
        
        // 如果切换到周视图或日视图，立即更新时间线并跳转到合适的时间
        if (view === 'week' || view === 'day') {
            // 使用 requestAnimationFrame 确保DOM完全渲染后再执行跳转
            requestAnimationFrame(() => {
                setTimeout(() => {
                    this.updateCurrentTimeLine();
                    
                    // 跳转到合适的时间位置
                    const isToday = DateUtils.isToday(this.state.currentDate);
                    if (isToday) {
                        this.jumpToCurrentTime();
                    } else {
                        this.jumpToTime(8, 0); // 跳转到早上8点
                    }
                }, 100); // 稍微减少延迟，但确保DOM已渲染
            });
        }
    }

    updateViewButtons() {
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        const viewBtn = document.getElementById(`${this.state.view}ViewBtn`);
        if (viewBtn) viewBtn.classList.add('active');
        
        document.querySelectorAll('.calendar-view').forEach(view => view.classList.remove('active'));
        const calendarView = document.getElementById(`${this.state.view}View`);
        if (calendarView) calendarView.classList.add('active');
    }

    goToPrev() {
        switch (this.state.view) {
            case 'month':
                this.state.currentDate = DateUtils.addMonths(this.state.currentDate, -1);
                break;
            case 'week':
                this.state.currentDate = DateUtils.addWeeks(this.state.currentDate, -1);
                break;
            case 'day':
                this.state.currentDate = DateUtils.addDays(this.state.currentDate, -1);
                break;
        }
        this.render();
    }

    goToNext() {
        switch (this.state.view) {
            case 'month':
                this.state.currentDate = DateUtils.addMonths(this.state.currentDate, 1);
                break;
            case 'week':
                this.state.currentDate = DateUtils.addWeeks(this.state.currentDate, 1);
                break;
            case 'day':
                this.state.currentDate = DateUtils.addDays(this.state.currentDate, 1);
                break;
        }
        this.render();
    }

    goToToday() {
        this.state.currentDate = new Date();
        this.render();
        // 滚动到当前时间
        setTimeout(() => {
            this.jumpToCurrentTime();
        }, 100);
    }

    render() {
        this.updateViewTitle();
        this.updateViewButtons(); // 确保视图按钮状态正确
        this.renderMiniCalendar();
        // this.renderTodayEvents(); // 已移除今日日程功能
        
        switch (this.state.view) {
            case 'month':
                this.renderMonthView();
                break;
            case 'week':
                this.renderWeekView();
                break;
            case 'day':
                this.renderDayView();
                break;
        }
    }

    updateViewTitle() {
        const title = DateUtils.getViewTitle(this.state.currentDate, this.state.view);
        document.getElementById('viewTitle').textContent = title;
    }
    renderMiniCalendar() {
        const miniCalendar = document.getElementById('miniCalendar');
        const currentMonth = new Date(this.state.currentDate.getFullYear(), this.state.currentDate.getMonth(), 1);
        const days = DateUtils.getCalendarDays(currentMonth, 'month');
        
        miniCalendar.innerHTML = `
            <div class="mini-calendar">
                <div class="mini-calendar-header">
                    <button class="mini-calendar-nav" onclick="app.miniCalendarPrev()">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <polyline points="15,18 9,12 15,6"></polyline>
                        </svg>
                    </button>
                    <div class="font-medium">${DateUtils.formatDate(currentMonth, 'YYYY年 M月')}</div>
                    <button class="mini-calendar-nav" onclick="app.miniCalendarNext()">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <polyline points="9,18 15,12 9,6"></polyline>
                        </svg>
                    </button>
                </div>
                <div class="mini-calendar-grid">
                    ${['一', '二', '三', '四', '五', '六', '日'].map(day => 
                        `<div class="text-center text-gray-500 font-medium py-1">${day}</div>`
                    ).join('')}
                    ${days.map(day => {
                        const isCurrentMonth = DateUtils.isSameMonth(day, currentMonth);
                        const isToday = DateUtils.isToday(day);
                        const isSelected = DateUtils.isSameDay(day, this.state.currentDate);
                        
                        let classes = 'mini-calendar-day';
                        if (!isCurrentMonth) classes += ' other-month';
                        if (isToday) classes += ' today';
                        if (isSelected) classes += ' selected';
                        
                        return `<div class="${classes}" onclick="app.selectMiniCalendarDate('${DateUtils.formatDate(day)}')">${day.getDate()}</div>`;
                    }).join('')}
                </div>
            </div>
        `;
    }

    miniCalendarPrev() {
        this.state.currentDate = DateUtils.addMonths(this.state.currentDate, -1);
        this.renderMiniCalendar();
        // 如果在四象限模式，也更新四象限的日历
        if (this.state.todoViewMode === 'quadrant') {
            this.renderMiniCalendarForQuadrant();
        }
    }

    miniCalendarNext() {
        this.state.currentDate = DateUtils.addMonths(this.state.currentDate, 1);
        this.renderMiniCalendar();
        // 如果在四象限模式，也更新四象限的日历
        if (this.state.todoViewMode === 'quadrant') {
            this.renderMiniCalendarForQuadrant();
        }
    }
    
    // 为四象限模式渲染小日历
    renderMiniCalendarForQuadrant() {
        const miniCalendar = document.getElementById('miniCalendarQuadrant');
        if (!miniCalendar) return;
        
        const currentMonth = new Date(this.state.currentDate.getFullYear(), this.state.currentDate.getMonth(), 1);
        const days = DateUtils.getCalendarDays(currentMonth, 'month');
        
        miniCalendar.innerHTML = `
            <div class="mini-calendar">
                <div class="mini-calendar-header">
                    <button class="mini-calendar-nav" onclick="app.miniCalendarPrev()">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <polyline points="15,18 9,12 15,6"></polyline>
                        </svg>
                    </button>
                    <div class="font-medium">${DateUtils.formatDate(currentMonth, 'YYYY年 M月')}</div>
                    <button class="mini-calendar-nav" onclick="app.miniCalendarNext()">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <polyline points="9,18 15,12 9,6"></polyline>
                        </svg>
                    </button>
                </div>
                <div class="mini-calendar-grid">
                    ${['一', '二', '三', '四', '五', '六', '日'].map(day => 
                        `<div class="text-center text-gray-500 font-medium py-1">${day}</div>`
                    ).join('')}
                    ${days.map(day => {
                        const isCurrentMonth = DateUtils.isSameMonth(day, currentMonth);
                        const isToday = DateUtils.isToday(day);
                        const isSelected = DateUtils.isSameDay(day, this.state.currentDate);
                        
                        let classes = 'mini-calendar-day';
                        if (!isCurrentMonth) classes += ' other-month';
                        if (isToday) classes += ' today';
                        if (isSelected) classes += ' selected';
                        
                        return `<div class="${classes}" onclick="app.selectMiniCalendarDate('${DateUtils.formatDate(day)}')">${day.getDate()}</div>`;
                    }).join('')}
                </div>
            </div>
        `;
    }

    selectMiniCalendarDate(dateStr) {
        this.state.currentDate = new Date(dateStr);
        this.render();
        
        // 如果在周视图或日视图，滚动到合适的时间位置
        if (this.state.view === 'week' || this.state.view === 'day') {
            setTimeout(() => {
                const selectedDate = new Date(dateStr);
                const isToday = DateUtils.isToday(selectedDate);
                
                if (isToday) {
                    // 如果选择的是今天，跳转到当前时间
                    this.jumpToCurrentTime();
                } else {
                    // 如果选择的是其他日期，跳转到早上8点
                    this.jumpToTime(8, 0);
                }
            }, 100);
        }
    }

    /* 已移除今日日程功能
    renderTodayEvents() {
        const todayEventsContainer = document.getElementById('todayEvents');
        const today = new Date();
        const todayEvents = this.getEventsForDay(today);
        
        if (todayEvents.length === 0) {
            todayEventsContainer.innerHTML = '<div class="text-sm text-gray-500">今日暂无日程</div>';
            return;
        }
        
        todayEventsContainer.innerHTML = todayEvents.map(event => `
            <div class="event-item cursor-pointer p-3 rounded-lg border-l-4 hover:shadow-md transition-all bg-white"
                 data-event-id="${event.id}"
                 style="border-left-color: ${event.color};">
                <div class="font-medium text-sm text-gray-800 mb-1">${event.title}</div>
                <div class="text-xs text-gray-600 mb-1">${DateUtils.formatDate(event.startTime, 'HH:mm')} - ${DateUtils.formatDate(event.endTime, 'HH:mm')}</div>
                ${event.location ? `<div class="text-xs text-gray-500 flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    ${event.location}
                </div>` : ''}
                <div class="w-2 h-2 rounded-full mt-2" style="background-color: ${event.color};"></div>
            </div>
        `).join('');
        
        // 绑定今日事件点击
        setTimeout(() => {
            const eventItems = todayEventsContainer.querySelectorAll('.event-item');
            eventItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    const eventId = item.dataset.eventId;
                    const event = this.state.events.find(ev => ev.id === eventId);
                    if (event) {
                        this.showEventDetail(event, e);
                    }
                });
            });
        }, 0);
    }
    */

    renderMonthView() {
        const monthGrid = document.getElementById('monthGrid');
        const days = DateUtils.getCalendarDays(this.state.currentDate, 'month');
        const weeks = [];
        
        // 将天数分组为周
        for (let i = 0; i < days.length; i += 7) {
            weeks.push(days.slice(i, i + 7));
        }
        
        monthGrid.innerHTML = `
            <div class="grid grid-rows-6 h-full">
                ${weeks.map(week => `
                    <div class="grid grid-cols-7 flex-1">
                        ${week.map(day => {
                            const events = this.getEventsForDay(day);
                            const isCurrentMonth = DateUtils.isSameMonth(day, this.state.currentDate);
                            const isToday = DateUtils.isToday(day);
                            
                            let cellClasses = 'calendar-cell min-h-120px border-b border-r border-gray-100 p-2 cursor-pointer group relative overflow-y-auto';
                            if (!isCurrentMonth) cellClasses += ' other-month';
                            if (isToday) cellClasses += ' today';
                            
                            return `
                                <div class="${cellClasses}" onclick="app.handleDayClick('${DateUtils.formatDate(day)}')" ondblclick="event.stopPropagation(); app.openEventModal(null, new Date('${DateUtils.formatDate(day)}'))">>
                                    <div class="flex items-center justify-between mb-1">
                                        <span class="day-number ${isToday ? 'today' : ''}">${day.getDate()}</span>
                                        <button class="add-event-btn" onclick="event.stopPropagation(); app.openEventModal(null, new Date('${DateUtils.formatDate(day)}'))">>
                                            <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                        </button>
                                    </div>
                                    <div class="space-y-1">
                                        ${events.slice(0, 4).map(event => `
                                            <div class="event-item" 
                                                 data-event-id="${event.id}"
                                                 style="background-color: ${event.color}20; border-left-color: ${event.color}; color: ${event.color};"
                                                 title="${event.title} - ${event.location || ''}">
                                                <div class="truncate font-medium">${DateUtils.formatDate(event.startTime, 'HH:mm')} ${event.title}</div>
                                            </div>
                                        `).join('')}
                                        ${events.length > 4 ? `<div class="more-events">+${events.length - 4} 更多</div>` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `).join('')}
            </div>
        `;
        
        // 绑定月视图事件点击
        setTimeout(() => {
            const eventItems = monthGrid.querySelectorAll('.event-item');
            eventItems.forEach(item => {
                // 单击 - 显示详情
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const eventId = item.dataset.eventId;
                    const event = this.state.events.find(ev => ev.id === eventId);
                    if (event) {
                        this.showEventDetail(event, e);
                    }
                });
                
                // 双击 - 打开编辑面板
                item.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    const eventId = item.dataset.eventId;
                    const event = this.state.events.find(ev => ev.id === eventId);
                    if (event) {
                        // 关闭详情面板（如果打开）
                        this.closeEventDetail();
                        // 打开编辑模态框
                        this.openEventModal(eventId);
                    }
                });
            });
        }, 0);
    }

    renderWeekView() {
        const weekView = document.getElementById('weekView');
        const days = DateUtils.getCalendarDays(this.state.currentDate, 'week');
        const hours = Array.from({ length: 24 }, (_, i) => i);
        
        weekView.innerHTML = `
            <!-- 表头 -->
            <div style="display: grid; grid-template-columns: 4rem repeat(7, 1fr); border-bottom: 1px solid #e5e7eb; background: white; position: sticky; top: 0; z-index: 10;">
                <div></div>
                ${days.map(day => {
                    const isToday = DateUtils.isToday(day);
                    return `
                        <div style="padding: 1rem 0.5rem; text-align: center; border-right: 1px solid #f3f4f6; ${isToday ? 'background: #eff6ff;' : ''}">
                            <div style="font-size: 0.875rem; color: #6b7280;">${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][day.getDay()]}</div>
                            <div style="font-size: 1.125rem; font-weight: 600; ${isToday ? 'color: #2563eb;' : ''}">${day.getDate()}</div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <!-- 内容区 -->
            <div class="flex-1 overflow-y-auto">
                <div style="display: grid; grid-template-columns: 4rem repeat(7, 1fr);">
                    <!-- 时间列 -->
                    <div>
                        ${hours.map(hour => `
                            <div style="height: 60px; position: relative; border-bottom: 1px solid #f3f4f6;">
                                <div style="position: absolute; left: 0; top: -0.5rem; font-size: 0.75rem; color: #6b7280; width: 3.5rem; text-align: right; padding-right: 0.5rem;">
                                    ${String(hour).padStart(2, '0')}:00
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <!-- 日期列 -->
                    ${days.map((day, dayIndex) => `
                        <div style="position: relative; border-right: 1px solid #f3f4f6;" data-date="${DateUtils.formatDate(day)}">
                            <!-- 时间网格 -->
                            ${hours.map(hour => `
                                <div class="time-slot-draggable" 
                                     data-date="${DateUtils.formatDate(day)}"
                                     data-hour="${hour}"
                                     style="height: 60px; border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: background-color 0.15s;"
                                     onmouseover="this.style.backgroundColor='rgba(59, 130, 246, 0.03)'"
                                     onmouseout="if(!this.classList.contains('dragging')) this.style.backgroundColor='transparent'">
                                </div>
                            `).join('')}
                            
                            <!-- 事件 -->
                            ${this.renderEventsForDay(day)}
                            
                            <!-- 当前时间线 -->
                            ${DateUtils.isToday(day) ? this.renderCurrentTimeLineForDay() : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // 绑定拖拽事件
        this.bindDragEvents();
        
        // 绑定事件卡片点击
        this.bindEventClicks();
    }

    renderDayView() {
        const dayView = document.getElementById('dayView');
        const day = this.state.currentDate;
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const isToday = DateUtils.isToday(day);
        
        dayView.innerHTML = `
            <!-- 表头 -->
            <div style="padding: 1rem; text-align: center; border-bottom: 1px solid #e5e7eb; background: white; position: sticky; top: 0; z-index: 10; ${isToday ? 'background: #eff6ff;' : ''}">
                <div style="font-size: 0.875rem; color: #6b7280;">${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][day.getDay()]}</div>
                <div style="font-size: 1.5rem; font-weight: 700; ${isToday ? 'color: #2563eb;' : ''}">${day.getDate()}</div>
            </div>
            
            <!-- 内容区 -->
            <div class="flex-1 overflow-y-auto">
                <div style="display: grid; grid-template-columns: 4rem 1fr;">
                    <!-- 时间列 -->
                    <div>
                        ${hours.map(hour => `
                            <div style="height: 60px; position: relative; border-bottom: 1px solid #f3f4f6;">
                                <div style="position: absolute; left: 0; top: -0.5rem; font-size: 0.75rem; color: #6b7280; width: 3.5rem; text-align: right; padding-right: 0.5rem;">
                                    ${String(hour).padStart(2, '0')}:00
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <!-- 内容列 -->
                    <div style="position: relative;" data-date="${DateUtils.formatDate(day)}">
                        <!-- 时间网格 -->
                        ${hours.map(hour => `
                            <div class="time-slot-draggable" 
                                 data-date="${DateUtils.formatDate(day)}"
                                 data-hour="${hour}"
                                 style="height: 60px; border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: background-color 0.15s;"
                                 onmouseover="this.style.backgroundColor='rgba(59, 130, 246, 0.03)'"
                                 onmouseout="if(!this.classList.contains('dragging')) this.style.backgroundColor='transparent'">
                            </div>
                        `).join('')}
                        
                        <!-- 事件 -->
                        ${this.renderEventsForDay(day)}
                        
                        <!-- 当前时间线 -->
                        ${DateUtils.isToday(day) ? this.renderCurrentTimeLineForDay() : ''}
                    </div>
                </div>
            </div>
        `;
        
        // 绑定拖拽事件
        this.bindDragEvents();
        
        // 绑定事件卡片点击
        this.bindEventClicks();
    }

    renderEventsForDay(day) {
        const events = this.getEventsForDay(day);
        return events.map(event => {
            const startHour = event.startTime.getHours();
            const startMinute = event.startTime.getMinutes();
            const endHour = event.endTime.getHours();
            const endMinute = event.endTime.getMinutes();
            
            // 计算位置：每小时60px高度
            const top = (startHour * 60 + startMinute);
            const height = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute));
            const actualHeight = Math.max(height, 20);
            
            // 根据高度决定显示内容
            let content = '';
            if (actualHeight < 45) {
                // 短事件（< 45分钟）：只显示标题
                content = `<div class="font-medium text-xs truncate">${event.title}</div>`;
            } else if (actualHeight < 60) {
                // 中等事件（45-60分钟）：显示标题和时间
                content = `
                    <div class="font-medium text-xs truncate">${event.title}</div>
                    <div class="text-xs opacity-75 truncate">${DateUtils.formatDate(event.startTime, 'HH:mm')} - ${DateUtils.formatDate(event.endTime, 'HH:mm')}</div>
                `;
            } else {
                // 长事件（> 60分钟）：显示所有信息
                content = `
                    <div class="font-medium text-xs truncate">${event.title}</div>
                    <div class="text-xs opacity-75">${DateUtils.formatDate(event.startTime, 'HH:mm')} - ${DateUtils.formatDate(event.endTime, 'HH:mm')}</div>
                    ${event.location ? `<div class="text-xs opacity-60 truncate">${event.location}</div>` : ''}
                `;
            }
            
            // 添加专注模式图标
            const focusIcon = event.focusAlert ? '<span class="focus-alert-icon">🔔</span>' : '';
            
            return `
                <div class="positioned-event" 
                     data-event-id="${event.id}"
                     style="top: ${top}px; height: ${actualHeight}px; background-color: ${event.color}20; border-left-color: ${event.color}; color: ${event.color}; cursor: grab;">
                    ${focusIcon}
                    ${content}
                </div>
            `;
        }).join('');
    }

    // 渲染当前时间线（周视图 - 已废弃，现在在日视图中使用）
    renderCurrentTimeLine(days) {
        // 周视图现在在每个日期列中单独渲染时间线
        return '';
    }

    // 绑定事件卡片点击
    bindEventClicks() {
        const eventCards = document.querySelectorAll('.positioned-event');
        eventCards.forEach(card => {
            // 单击事件 - 显示详情
            card.addEventListener('click', (e) => {
                if (this.dragState.isDraggingEvent) return; // 如果正在拖动，不触发点击
                e.stopPropagation();
                const eventId = card.dataset.eventId;
                const event = this.state.events.find(ev => ev.id === eventId);
                if (event) {
                    this.showEventDetail(event, e);
                }
            });

            // 双击事件 - 打开编辑面板
            card.addEventListener('dblclick', (e) => {
                if (this.dragState.isDraggingEvent) return; // 如果正在拖动，不触发双击
                e.stopPropagation();
                const eventId = card.dataset.eventId;
                const event = this.state.events.find(ev => ev.id === eventId);
                if (event) {
                    // 关闭详情面板（如果打开）
                    this.closeEventDetail();
                    // 打开编辑模态框
                    this.openEventModal(eventId);
                }
            });

            // 使用鼠标事件实现拖动
            card.addEventListener('mousedown', (e) => this.handleEventMouseDown(e));
        });
    }

    // 启动时间线更新器
    startTimeLineUpdater() {
        // 每秒更新一次当前时间线，确保实时更新
        this.timeLineInterval = setInterval(() => {
            if (this.state.view === 'week' || this.state.view === 'day') {
                this.updateCurrentTimeLine();
            }
        }, 1000); // 改为1秒更新一次，确保实时性
        
        // 页面可见性变化时也更新
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && (this.state.view === 'week' || this.state.view === 'day')) {
                this.updateCurrentTimeLine();
            }
        });
    }

    // 设置时间卡片
    setupDurationCards() {
        const cards = document.querySelectorAll('.duration-card');
        
        cards.forEach(card => {
            // 单击事件 - 在当前时间创建事件
            card.addEventListener('click', (e) => {
                // 如果正在拖拽或刚拖拽完成，不触发点击
                if (this.dragState.isDraggingCard || card.dataset.dragging === 'true') {
                    return;
                }
                
                const duration = parseInt(card.dataset.duration);
                this.createEventAtCurrentTime(duration);
            });
            
            // 拖拽事件
            card.addEventListener('dragstart', (e) => this.handleCardDragStart(e));
            card.addEventListener('dragend', (e) => this.handleCardDragEnd(e));
            
            // 阻止拖拽时的点击事件
            card.addEventListener('mousedown', (e) => {
                card.dataset.mousedown = Date.now();
            });
            
            card.addEventListener('mouseup', (e) => {
                const mousedownTime = parseInt(card.dataset.mousedown || 0);
                const mouseupTime = Date.now();
                
                // 如果按下和释放时间差超过200ms，认为是拖拽而不是点击
                if (mouseupTime - mousedownTime > 200) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        });
    }

    // 在当前时间创建事件
    createEventAtCurrentTime(duration) {
        const now = new Date();
        
        // 如果不在周视图或日视图，先切换到周视图
        if (this.state.view !== 'week' && this.state.view !== 'day') {
            this.setView('week');
            // 等待视图切换完成
            setTimeout(() => {
                this.createEventAtCurrentTime(duration);
            }, 300);
            return;
        }
        
        // 开始时间就是当前时间（不取整）
        const startTime = new Date(now);
        
        // 计算结束时间（先加上持续时间）
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + duration);
        
        // 将结束时间对齐到15分钟的倍数
        const endMinutes = endTime.getMinutes();
        const alignedEndMinutes = DateUtils.roundToQuarterHour(endMinutes);
        endTime.setMinutes(alignedEndMinutes);
        
        // 创建占位符显示在时间线上
        this.createEventPlaceholder(startTime, endTime);
        
        // 打开事件模态框
        this.openEventModal(null, startTime, endTime);
    }

    // 创建事件占位符
    createEventPlaceholder(startTime, endTime) {
        // 找到对应日期的容器
        const dateStr = DateUtils.formatDate(startTime);
        const container = document.querySelector(`[data-date="${dateStr}"]`);
        
        if (!container) return;
        
        // 计算位置
        const startHour = startTime.getHours();
        const startMinute = startTime.getMinutes();
        const endHour = endTime.getHours();
        const endMinute = endTime.getMinutes();
        
        const top = (startHour * 60 + startMinute);
        const height = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute));
        
        // 创建占位符元素
        const placeholder = document.createElement('div');
        placeholder.className = 'event-placeholder';
        placeholder.style.cssText = `
            position: absolute;
            top: ${top}px;
            height: ${height}px;
            left: 0.25rem;
            right: 0.25rem;
            background: rgba(59, 130, 246, 0.15);
            border: 2px dashed #3b82f6;
            border-radius: 0.25rem;
            pointer-events: none;
            z-index: 50;
        `;
        
        placeholder.innerHTML = `
            <div style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: #3b82f6; font-weight: 500;">
                ${DateUtils.formatDate(startTime, 'HH:mm')} - ${DateUtils.formatDate(endTime, 'HH:mm')}
            </div>
        `;
        
        // 保存占位符引用
        this.dragState.placeholderElement = placeholder;
        container.appendChild(placeholder);
        
        // 滚动到占位符位置
        const scrollContainer = container.closest('.overflow-y-auto');
        if (scrollContainer) {
            const offset = 100;
            scrollContainer.scrollTo({
                top: Math.max(0, top - offset),
                behavior: 'smooth'
            });
        }
    }

    // 时间卡片拖拽开始
    handleCardDragStart(e) {
        const card = e.currentTarget;
        const duration = parseInt(card.dataset.duration);
        
        this.dragState.isDraggingCard = true;
        this.dragState.cardDuration = duration;
        
        card.classList.add('dragging');
        
        // 创建拖拽时的克隆元素
        const clone = card.cloneNode(true);
        clone.classList.add('duration-card-clone');
        clone.style.width = card.offsetWidth + 'px';
        clone.style.height = card.offsetHeight + 'px';
        document.body.appendChild(clone);
        
        // 设置拖拽数据
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setDragImage(clone, clone.offsetWidth / 2, clone.offsetHeight / 2);
        
        // 延迟移除克隆元素
        setTimeout(() => {
            if (clone.parentNode) {
                clone.parentNode.removeChild(clone);
            }
        }, 0);
        
        // 标记正在拖拽，防止触发点击事件
        card.dataset.dragging = 'true';
    }

    // 时间卡片拖拽结束
    handleCardDragEnd(e) {
        const card = e.currentTarget;
        card.classList.remove('dragging');
        
        // 延迟重置拖拽状态，确保点击事件不会被触发
        setTimeout(() => {
            this.dragState.isDraggingCard = false;
            this.dragState.cardDuration = 0;
            delete card.dataset.dragging;
        }, 100);
        
        // 移除所有高亮
        document.querySelectorAll('.time-slot-highlight').forEach(slot => {
            slot.classList.remove('time-slot-highlight');
        });
    }

    // 绑定拖拽事件
    bindDragEvents() {
        const timeSlots = document.querySelectorAll('.time-slot-draggable');
        
        timeSlots.forEach(slot => {
            // 鼠标拖拽创建事件
            slot.addEventListener('mousedown', (e) => this.handleDragStart(e));
            
            // 拖放时间卡片和事件卡片
            slot.addEventListener('dragover', (e) => this.handleSlotDragOver(e));
            slot.addEventListener('dragleave', (e) => this.handleSlotDragLeave(e));
            slot.addEventListener('drop', (e) => this.handleSlotDrop(e));
        });
        
        document.addEventListener('mousemove', (e) => this.handleDragMove(e));
        document.addEventListener('mouseup', (e) => this.handleDragEnd(e));
        
        // 事件卡片拖动的鼠标事件
        document.addEventListener('mousemove', (e) => this.handleEventMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleEventMouseUp(e));
    }

    // 时间槽拖放悬停
    handleSlotDragOver(e) {
        if (!this.dragState.isDraggingCard && !this.dragState.isDraggingEvent) return;
        
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        
        const slot = e.currentTarget;
        slot.classList.add('time-slot-highlight');
    }

    // 时间槽拖放离开
    handleSlotDragLeave(e) {
        if (!this.dragState.isDraggingCard && !this.dragState.isDraggingEvent) return;
        
        const slot = e.currentTarget;
        slot.classList.remove('time-slot-highlight');
    }

    // 时间槽拖放放置
    handleSlotDrop(e) {
        console.log('Slot drop - isDraggingCard:', this.dragState.isDraggingCard, 'isDraggingEvent:', this.dragState.isDraggingEvent);
        
        if (this.dragState.isDraggingCard) {
            // 检查是拖拽时间卡片还是 TODO
            if (this.dragState.draggedTodo) {
                this.handleTodoDrop(e);
            } else {
                this.handleCardDrop(e);
            }
        } else if (this.dragState.isDraggingEvent) {
            this.handleEventDrop(e);
        }
    }

    // 事件卡片鼠标按下
    handleEventMouseDown(e) {
        // 只响应左键
        if (e.button !== 0) return;
        
        const card = e.currentTarget;
        const eventId = card.dataset.eventId;
        const event = this.state.events.find(ev => ev.id === eventId);
        
        if (!event) return;
        
        // 记录初始位置
        this.dragState.isDraggingEvent = true;
        this.dragState.draggedEvent = event;
        this.dragState.draggedCard = card;
        this.dragState.startX = e.clientX;
        this.dragState.startY = e.clientY;
        this.dragState.hasMoved = false;
        
        // 改变光标
        card.style.cursor = 'grabbing';
        card.style.opacity = '0.7';
        card.style.zIndex = '1000';
        
        console.log('Mouse down on event:', event.title);
        
        e.preventDefault();
        e.stopPropagation();
    }

    // 事件卡片鼠标移动
    handleEventMouseMove(e) {
        if (!this.dragState.isDraggingEvent || !this.dragState.draggedCard) return;
        
        const deltaX = Math.abs(e.clientX - this.dragState.startX);
        const deltaY = Math.abs(e.clientY - this.dragState.startY);
        
        // 如果移动超过5px，认为是拖动而不是点击
        if (deltaX > 5 || deltaY > 5) {
            this.dragState.hasMoved = true;
        }
        
        if (!this.dragState.hasMoved) return;
        
        // 找到鼠标下的时间槽
        const element = document.elementFromPoint(e.clientX, e.clientY);
        
        // 移除之前的高亮
        document.querySelectorAll('.time-slot-highlight').forEach(slot => {
            slot.classList.remove('time-slot-highlight');
        });
        
        // 高亮当前时间槽
        if (element && element.classList.contains('time-slot-draggable')) {
            element.classList.add('time-slot-highlight');
        }
    }

    // 事件卡片鼠标释放
    handleEventMouseUp(e) {
        if (!this.dragState.isDraggingEvent || !this.dragState.draggedCard) return;
        
        const card = this.dragState.draggedCard;
        const event = this.dragState.draggedEvent;
        
        // 恢复样式
        card.style.cursor = 'grab';
        card.style.opacity = '1';
        card.style.zIndex = '';
        
        // 移除高亮
        document.querySelectorAll('.time-slot-highlight').forEach(slot => {
            slot.classList.remove('time-slot-highlight');
        });
        
        // 如果移动了，处理drop
        if (this.dragState.hasMoved) {
            console.log('Mouse up after drag');
            
            // 找到鼠标下的时间槽
            const element = document.elementFromPoint(e.clientX, e.clientY);
            
            if (element && element.classList.contains('time-slot-draggable')) {
                const date = element.dataset.date;
                const hour = parseInt(element.dataset.hour);
                
                // 计算新的开始时间
                const rect = element.getBoundingClientRect();
                const offsetY = e.clientY - rect.top;
                const minute = Math.floor((offsetY / rect.height) * 60);
                
                // 对齐到15分钟
                const alignedMinute = DateUtils.roundToQuarterHour(minute);
                
                // 计算事件持续时间（毫秒）
                const duration = event.endTime.getTime() - event.startTime.getTime();
                
                // 创建新的开始时间
                const newStartTime = new Date(date);
                newStartTime.setHours(hour, alignedMinute, 0, 0);
                
                // 创建新的结束时间
                const newEndTime = new Date(newStartTime.getTime() + duration);
                
                // 检查是否跨日期移动
                const oldDate = DateUtils.formatDate(event.startTime);
                const newDate = DateUtils.formatDate(newStartTime);
                const isCrossDay = oldDate !== newDate;
                
                // 更新事件
                event.startTime = newStartTime;
                event.endTime = newEndTime;
                
                console.log('Event moved:', event.title, 'to', DateUtils.formatDate(newStartTime, 'HH:mm'), '-', DateUtils.formatDate(newEndTime, 'HH:mm'));
                
                // 保存到localStorage
                this.state.saveEvents();
                
                ToastManager.show('日程已移动', `${event.title} - ${DateUtils.formatDate(newStartTime, 'HH:mm')}`);
                
                // 如果跨日期移动，需要重新渲染事件
                if (isCrossDay) {
                    console.log('Cross-day move detected, re-rendering events only');
                    this.renderEventsOnly();
                } else {
                    // 只更新事件卡片的位置，不重新渲染整个页面
                    this.updateEventCardPosition(card, event);
                }
            }
        }
        
        // 重置拖动状态
        this.dragState.isDraggingEvent = false;
        this.dragState.draggedEvent = null;
        this.dragState.draggedCard = null;
        this.dragState.hasMoved = false;
    }

    // 更新单个事件卡片的位置（不重新渲染整个页面）
    updateEventCardPosition(card, event) {
        const startHour = event.startTime.getHours();
        const startMinute = event.startTime.getMinutes();
        const endHour = event.endTime.getHours();
        const endMinute = event.endTime.getMinutes();
        
        // 计算新位置
        const top = (startHour * 60 + startMinute);
        const height = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute));
        const actualHeight = Math.max(height, 20);
        
        // 更新卡片位置
        card.style.top = `${top}px`;
        card.style.height = `${actualHeight}px`;
        
        // 根据高度决定显示内容
        let content = '';
        if (actualHeight < 45) {
            // 短事件（< 45分钟）：只显示标题
            content = `<div class="font-medium text-xs truncate">${event.title}</div>`;
        } else if (actualHeight < 60) {
            // 中等事件（45-60分钟）：显示标题和时间
            content = `
                <div class="font-medium text-xs truncate">${event.title}</div>
                <div class="text-xs opacity-75 truncate">${DateUtils.formatDate(event.startTime, 'HH:mm')} - ${DateUtils.formatDate(event.endTime, 'HH:mm')}</div>
            `;
        } else {
            // 长事件（> 60分钟）：显示所有信息
            content = `
                <div class="font-medium text-xs truncate">${event.title}</div>
                <div class="text-xs opacity-75">${DateUtils.formatDate(event.startTime, 'HH:mm')} - ${DateUtils.formatDate(event.endTime, 'HH:mm')}</div>
                ${event.location ? `<div class="text-xs opacity-60 truncate">${event.location}</div>` : ''}
            `;
        }
        
        // 更新卡片内容
        card.innerHTML = content;
        
        // 重新绑定事件
        card.addEventListener('click', (e) => {
            if (this.dragState.isDraggingEvent) return;
            e.stopPropagation();
            const eventId = card.dataset.eventId;
            const evt = this.state.events.find(ev => ev.id === eventId);
            if (evt) {
                this.showEventDetail(evt, e);
            }
        });
        card.addEventListener('mousedown', (e) => this.handleEventMouseDown(e));
    }

    // 旧的drag API方法（已废弃）
    handleEventDragStart(e) {
        // 保留以防需要
    }

    handleEventDragEnd(e) {
        // 保留以防需要
    }

    handleEventDrop(e) {
        // 保留以防需要
    }

    // 复制事件
    copyEvent(event) {
        this.clipboard = {
            title: event.title,
            description: event.description,
            location: event.location,
            color: event.color,
            duration: event.endTime - event.startTime
        };
        ToastManager.show('已复制', `${event.title}`);
    }

    // 粘贴事件
    pasteEvent() {
        if (!this.clipboard) return;
        
        // 在当前时间粘贴
        const now = new Date();
        const startTime = new Date(now);
        
        // 对齐到15分钟
        const alignedMinute = DateUtils.roundToQuarterHour(startTime.getMinutes());
        startTime.setMinutes(alignedMinute, 0, 0);
        
        const endTime = new Date(startTime.getTime() + this.clipboard.duration);
        
        // 创建新事件
        const newEvent = {
            id: Date.now().toString(),
            title: this.clipboard.title,
            description: this.clipboard.description,
            location: this.clipboard.location,
            startTime: startTime,
            endTime: endTime,
            color: this.clipboard.color
        };
        
        this.state.events.push(newEvent);
        
        // 保存到localStorage
        this.state.saveEvents();
        
        ToastManager.show('已粘贴', `${newEvent.title} - ${DateUtils.formatDate(startTime, 'HH:mm')}`);
        
        // 如果不在周视图或日视图，切换到周视图
        if (this.state.view !== 'week' && this.state.view !== 'day') {
            this.setView('week');
        } else {
            // 只重新渲染事件，不刷新整个页面
            this.renderEventsOnly();
        }
    }

    // 只重新渲染事件部分（不刷新整个页面）
    renderEventsOnly() {
        if (this.state.view === 'week') {
            const days = DateUtils.getCalendarDays(this.state.currentDate, 'week');
            days.forEach((day, index) => {
                const dateStr = DateUtils.formatDate(day);
                const container = document.querySelector(`[data-date="${dateStr}"]`);
                if (container) {
                    // 移除旧的事件卡片
                    container.querySelectorAll('.positioned-event').forEach(el => el.remove());
                    // 添加新的事件卡片
                    container.insertAdjacentHTML('beforeend', this.renderEventsForDay(day));
                }
            });
            // 重新绑定事件
            this.bindEventClicks();
        } else if (this.state.view === 'day') {
            const day = this.state.currentDate;
            const dateStr = DateUtils.formatDate(day);
            const container = document.querySelector(`[data-date="${dateStr}"]`);
            if (container) {
                // 移除旧的事件卡片
                container.querySelectorAll('.positioned-event').forEach(el => el.remove());
                // 添加新的事件卡片
                container.insertAdjacentHTML('beforeend', this.renderEventsForDay(day));
            }
            // 重新绑定事件
            this.bindEventClicks();
        }
    }

    // 时间卡片放置到时间槽
    handleCardDrop(e) {
        if (!this.dragState.isDraggingCard) return;
        
        e.preventDefault();
        
        const slot = e.currentTarget;
        slot.classList.remove('time-slot-highlight');
        
        const date = slot.dataset.date;
        const hour = parseInt(slot.dataset.hour);
        const duration = this.dragState.cardDuration;
        
        // 计算精确的分钟数（基于鼠标在格子中的位置）
        const rect = slot.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const minute = Math.floor((offsetY / rect.height) * 60);
        
        // 对齐到15分钟的倍数
        const alignedMinute = DateUtils.roundToQuarterHour(minute);
        
        // 创建开始和结束时间
        const startDateTime = new Date(date);
        startDateTime.setHours(hour, alignedMinute, 0, 0);
        
        const endDateTime = new Date(startDateTime);
        endDateTime.setMinutes(endDateTime.getMinutes() + duration);
        
        // 打开事件模态框
        this.openEventModal(null, startDateTime, endDateTime);
    }

    // 开始拖拽
    handleDragStart(e) {
        if (e.button !== 0) return; // 只响应左键
        
        const slot = e.currentTarget;
        const date = slot.dataset.date;
        const hour = parseInt(slot.dataset.hour);
        
        // 计算精确的分钟数（基于鼠标在格子中的位置）
        const rect = slot.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const minute = Math.floor((offsetY / rect.height) * 60);
        
        // 对齐到15分钟的倍数
        const alignedMinute = DateUtils.roundToQuarterHour(minute);
        
        this.dragState.isDragging = true;
        this.dragState.startDate = date;
        this.dragState.startTime = hour * 60 + alignedMinute; // 转换为分钟
        this.dragState.endTime = this.dragState.startTime + 30; // 默认30分钟
        
        // 添加拖拽状态类
        document.body.classList.add('dragging');
        slot.classList.add('dragging');
        
        // 创建拖拽预览元素
        this.createDragPreview(date, this.dragState.startTime, this.dragState.endTime);
        
        e.preventDefault();
    }

    // 拖拽移动
    handleDragMove(e) {
        if (!this.dragState.isDragging) return;
        
        // 查找鼠标下的时间格子
        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (!element || !element.classList.contains('time-slot-draggable')) {
            return;
        }
        
        const date = element.dataset.date;
        const hour = parseInt(element.dataset.hour);
        
        // 只允许在同一天内拖拽
        if (date !== this.dragState.startDate) return;
        
        // 计算当前位置的分钟数
        const rect = element.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const minute = Math.floor((offsetY / rect.height) * 60);
        
        // 对齐到15分钟的倍数
        const alignedMinute = DateUtils.roundToQuarterHour(minute);
        const currentTime = hour * 60 + alignedMinute;
        
        // 更新结束时间（确保至少15分钟）
        if (currentTime > this.dragState.startTime) {
            this.dragState.endTime = Math.max(currentTime, this.dragState.startTime + 15);
        } else {
            // 如果向上拖，调整开始时间
            this.dragState.endTime = this.dragState.startTime;
            this.dragState.startTime = Math.max(0, currentTime);
        }
        
        // 更新预览
        this.updateDragPreview();
    }

    // 结束拖拽
    handleDragEnd(e) {
        if (!this.dragState.isDragging) return;
        
        // 移除拖拽状态类
        document.body.classList.remove('dragging');
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        
        // 不要立即移除预览元素，而是保留它
        // 将预览元素转换为持久化的占位符
        if (this.dragState.dragElement) {
            this.dragState.dragElement.classList.remove('drag-preview');
            this.dragState.dragElement.classList.add('event-placeholder');
            // 保存引用，以便后续删除
            this.dragState.placeholderElement = this.dragState.dragElement;
        }
        
        // 计算开始和结束时间
        const startHour = Math.floor(this.dragState.startTime / 60);
        const startMinute = this.dragState.startTime % 60;
        const endHour = Math.floor(this.dragState.endTime / 60);
        const endMinute = this.dragState.endTime % 60;
        
        // 创建日期时间对象
        const startDateTime = new Date(this.dragState.startDate);
        startDateTime.setHours(startHour, startMinute, 0, 0);
        
        const endDateTime = new Date(this.dragState.startDate);
        endDateTime.setHours(endHour, endMinute, 0, 0);
        
        // 重置拖拽状态（但保留占位符引用）
        this.dragState.isDragging = false;
        this.dragState.dragElement = null;
        
        // 打开事件模态框
        this.openEventModal(null, startDateTime, endDateTime);
    }

    // 创建拖拽预览
    createDragPreview(date, startTime, endTime) {
        const container = document.querySelector(`[data-date="${date}"]`);
        if (!container) return;
        
        const preview = document.createElement('div');
        preview.className = 'drag-preview';
        preview.style.cssText = `
            position: absolute;
            left: 0.25rem;
            right: 0.25rem;
            background: rgba(59, 130, 246, 0.2);
            border: 2px dashed #3b82f6;
            border-radius: 0.25rem;
            pointer-events: none;
            z-index: 50;
            transition: all 0.1s ease;
        `;
        
        this.dragState.dragElement = preview;
        container.appendChild(preview);
        this.updateDragPreview();
    }

    // 更新拖拽预览
    updateDragPreview() {
        if (!this.dragState.dragElement) return;
        
        const top = this.dragState.startTime; // 分钟数直接对应像素（每小时60px）
        const height = this.dragState.endTime - this.dragState.startTime;
        
        this.dragState.dragElement.style.top = `${top}px`;
        this.dragState.dragElement.style.height = `${height}px`;
        
        // 显示时间范围
        const startHour = Math.floor(this.dragState.startTime / 60);
        const startMinute = this.dragState.startTime % 60;
        const endHour = Math.floor(this.dragState.endTime / 60);
        const endMinute = this.dragState.endTime % 60;
        
        this.dragState.dragElement.innerHTML = `
            <div style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: #3b82f6; font-weight: 500;">
                ${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')} - 
                ${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}
            </div>
        `;
    }

    // 更新当前时间线位置
    updateCurrentTimeLine() {
        const timeLines = document.querySelectorAll('.current-time-line');
        if (timeLines.length === 0) return;
        
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const topPosition = (currentHour * 60 + currentMinute);
        
        timeLines.forEach(timeLine => {
            timeLine.style.top = `${topPosition}px`;
            
            // 更新时间标签
            const timeLabel = timeLine.querySelector('.current-time-label');
            if (timeLabel) {
                timeLabel.textContent = DateUtils.formatDate(now, 'HH:mm');
            }
        });
    }
    renderCurrentTimeLineForDay() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const topPosition = (currentHour * 60 + currentMinute); // 每小时60px
        
        return `
            <div class="current-time-line" style="
                position: absolute;
                top: ${topPosition}px;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, #ef4444 0%, #ef4444 90%, transparent 100%);
                z-index: 100;
                pointer-events: none;
            ">
                <div class="current-time-dot" style="
                    position: absolute;
                    left: -4px;
                    top: -3px;
                    width: 8px;
                    height: 8px;
                    background: #ef4444;
                    border-radius: 50%;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                "></div>
                <div class="current-time-label" style="
                    position: absolute;
                    right: 8px;
                    top: -10px;
                    background: #ef4444;
                    color: white;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 10px;
                    font-weight: 500;
                    white-space: nowrap;
                ">${DateUtils.formatDate(now, 'HH:mm')}</div>
            </div>
        `;
    }

    // 关闭详情面板
    closeEventDetail() {
        document.getElementById('eventDetailPopup').classList.add('hidden');
        this.state.selectedEvent = null;
    }

    // 从详情面板编辑
    editFromDetail() {
        console.log('Edit button clicked, selectedEvent:', this.state.selectedEvent);
        if (this.state.selectedEvent) {
            const eventId = this.state.selectedEvent.id;
            this.closeEventDetail();
            this.openEventModal(eventId);
        }
    }

    // 从详情面板复制
    copyFromDetail() {
        if (this.state.selectedEvent) {
            this.copyEvent(this.state.selectedEvent);
        }
    }

    // 从详情面板删除
    deleteFromDetail() {
        if (!this.state.selectedEvent) return;
        
        const eventTitle = this.state.selectedEvent.title;
        ConfirmDialog.show(
            '删除日程',
            `确定要删除"${eventTitle}"吗？`,
            () => {
                const eventId = this.state.selectedEvent.id;
                this.state.events = this.state.events.filter(e => e.id !== eventId);
                
                // 保存到localStorage
                this.state.saveEvents();
                
                ToastManager.show('日程已删除');
                this.closeEventDetail();
                
                // 只移除对应的卡片，不刷新整个页面
                const cardToRemove = document.querySelector(`.positioned-event[data-event-id="${eventId}"]`);
                if (cardToRemove) {
                    cardToRemove.remove();
                }
            }
        );
    }

    // 显示事件详情面板
    showEventDetail(event, clickEvent) {
        const popup = document.getElementById('eventDetailPopup');
        
        // 填充详情
        document.getElementById('eventDetailColor').style.backgroundColor = event.color;
        const titleElement = document.getElementById('eventDetailTitle');
        if (titleElement) {
            titleElement.textContent = event.title;
            
            // 让标题可点击编辑
            titleElement.style.cursor = 'pointer';
            titleElement.title = '点击编辑';
            titleElement.onclick = () => {
                this.closeEventDetail();
                this.openEventModal(event.id);
            };
        }
        
        // 格式化日期
        const dateStr = DateUtils.formatDate(event.startTime, 'YYYY年 M月d日 EEEE');
        const timeStr = `${DateUtils.formatDate(event.startTime, 'HH:mm')} - ${DateUtils.formatDate(event.endTime, 'HH:mm')}`;
        const dateElement = document.getElementById('eventDetailDate');
        const timeElement = document.getElementById('eventDetailTime');
        if (dateElement) dateElement.textContent = dateStr;
        if (timeElement) timeElement.textContent = timeStr;
        
        // 地点
        const locationContainer = document.getElementById('eventDetailLocationContainer');
        const locationElement = document.getElementById('eventDetailLocation');
        if (event.location && locationElement && locationContainer) {
            locationElement.textContent = event.location;
            locationContainer.classList.remove('hidden');
        } else if (locationContainer) {
            locationContainer.classList.add('hidden');
        }
        
        // 描述
        const descriptionContainer = document.getElementById('eventDetailDescriptionContainer');
        const descriptionElement = document.getElementById('eventDetailDescription');
        if (event.description && descriptionElement && descriptionContainer) {
            descriptionElement.textContent = event.description;
            descriptionContainer.classList.remove('hidden');
        } else if (descriptionContainer) {
            descriptionContainer.classList.add('hidden');
        }
        
        // 保存当前事件引用
        this.state.selectedEvent = event;
        
        // 定位面板
        this.positionEventDetail(clickEvent);
        
        // 显示面板
        popup.classList.remove('hidden');
    }

    // 定位详情面板
    positionEventDetail(clickEvent) {
        const popup = document.getElementById('eventDetailPopup');
        const target = clickEvent.currentTarget;
        const rect = target.getBoundingClientRect();
        
        // 计算位置
        let left = rect.right + 10; // 默认显示在右侧
        let top = rect.top;
        
        // 检查是否超出右边界
        const popupWidth = 400;
        if (left + popupWidth > window.innerWidth) {
            left = rect.left - popupWidth - 10; // 显示在左侧
        }
        
        // 检查是否超出底部
        const popupHeight = 300; // 估计高度
        if (top + popupHeight > window.innerHeight) {
            top = window.innerHeight - popupHeight - 20;
        }
        
        // 确保不超出顶部
        top = Math.max(20, top);
        
        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;
    }

    getEventsForDay(day) {
        return this.state.events.filter(event => DateUtils.isSameDay(event.startTime, day));
    }

    handleDayClick(dateStr) {
        const date = new Date(dateStr);
        
        // 设置当前日期为点击的日期
        this.state.currentDate = date;
        
        // 切换到日视图
        this.setView('day');
        
        // 如果点击的是今天，跳转到当前时间线
        // 如果不是今天，跳转到早上8点
        setTimeout(() => {
            const isToday = DateUtils.isToday(date);
            if (isToday) {
                this.jumpToCurrentTime();
            } else {
                this.jumpToTime(8, 0); // 跳转到早上8点
            }
        }, 300); // 稍微延长等待时间，确保视图完全渲染
    }

    handleTimeSlotClick(dateStr, hour) {
        const date = new Date(dateStr);
        date.setHours(hour, 0, 0, 0);
        this.openEventModal(null, date);
    }

    openEventModal(eventId = null, initialDate = null, endDate = null, initialTitle = null) {
        this.state.isEventModalOpen = true;
        this.state.selectedEvent = eventId ? this.state.events.find(e => e.id === eventId) : null;
        
        const modal = document.getElementById('eventModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalColorDot = document.getElementById('modalColorDot');
        const deleteBtn = document.getElementById('deleteEventBtn');
        const saveBtn = document.getElementById('saveEventBtn');
        
        if (this.state.selectedEvent) {
            // 编辑模式
            modalTitle.innerHTML = `
                <div class="w-3 h-3 rounded-full" style="background-color: ${this.state.selectedEvent.color}"></div>
                编辑日程
            `;
            deleteBtn.classList.remove('hidden');
            saveBtn.textContent = '保存';
            this.populateEventForm(this.state.selectedEvent);
        } else {
            // 新建模式
            modalTitle.innerHTML = `
                <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                新建日程
            `;
            deleteBtn.classList.add('hidden');
            saveBtn.textContent = '创建';
            this.resetEventForm(initialDate, endDate, initialTitle);
        }
        
        modal.classList.remove('hidden');
        document.getElementById('eventTitle').focus();
        
        // 绑定折叠按钮事件
        this.setupCollapsibleFields();
    }

    closeEventModal() {
        this.state.isEventModalOpen = false;
        this.state.selectedEvent = null;
        document.getElementById('eventModal').classList.add('hidden');
        
        // 移除占位符元素 - 多重清理策略
        if (this.dragState.placeholderElement) {
            try {
                this.dragState.placeholderElement.remove();
            } catch (e) {
                console.warn('Failed to remove placeholder element:', e);
            }
            this.dragState.placeholderElement = null;
        }
        
        // 清理所有可能残留的占位符元素（备用清理）
        try {
            const allPlaceholders = document.querySelectorAll('.event-placeholder');
            allPlaceholders.forEach(placeholder => {
                placeholder.remove();
            });
        } catch (e) {
            console.warn('Failed to remove all placeholders:', e);
        }
        
        // 重置拖拽状态
        this.dragState.isDragging = false;
        this.dragState.isDraggingCard = false;
        this.dragState.isDraggingEvent = false;
        this.dragState.dragElement = null;
        this.dragState.draggedEvent = null;
        this.dragState.draggedCard = null;
        
        // 移除body上的拖拽类
        document.body.classList.remove('dragging');
        
        // 清理所有时间槽的高亮状态
        document.querySelectorAll('.time-slot-highlight').forEach(slot => {
            slot.classList.remove('time-slot-highlight');
        });
        
        console.log('Event modal closed and all placeholders cleaned');
    }

    populateEventForm(event) {
        document.getElementById('eventTitle').value = event.title;
        document.getElementById('eventDescription').value = event.description || '';
        document.getElementById('eventLocation').value = event.location || '';
        document.getElementById('eventDate').value = DateUtils.formatDate(event.startTime);
        document.getElementById('eventStartTime').value = DateUtils.formatDate(event.startTime, 'HH:mm');
        document.getElementById('eventEndTime').value = DateUtils.formatDate(event.endTime, 'HH:mm');
        
        // 如果有地点或描述，自动展开对应字段
        if (event.location) {
            document.getElementById('locationField').classList.remove('hidden');
            document.getElementById('locationChevron').style.transform = 'rotate(180deg)';
        }
        if (event.description) {
            document.getElementById('descriptionField').classList.remove('hidden');
            document.getElementById('descriptionChevron').style.transform = 'rotate(180deg)';
        }
        
        // 设置颜色选择
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.toggle('selected', option.dataset.color === event.color);
        });
        
        // 设置随机提示音开关
        const focusAlertCheckbox = document.getElementById('focusAlertCheckbox');
        const focusAlertToggle = document.getElementById('focusAlertToggle');
        if (focusAlertCheckbox && focusAlertToggle) {
            const isEnabled = event.focusAlert || false;
            focusAlertCheckbox.checked = isEnabled;
            focusAlertToggle.dataset.enabled = isEnabled.toString();
            
            // 如果启用了专注提示音，应用事件颜色
            if (isEnabled) {
                focusAlertToggle.style.background = `linear-gradient(135deg, ${event.color} 0%, ${event.color} 100%)`;
                focusAlertToggle.style.borderColor = event.color;
                focusAlertToggle.style.boxShadow = `0 4px 12px ${event.color}4D`;
            } else {
                focusAlertToggle.style.background = '#f3f4f6';
                focusAlertToggle.style.borderColor = '#d1d5db';
                focusAlertToggle.style.boxShadow = 'none';
            }
        }
        
        // 更新模态框颜色点和背景色
        const modalColorDot = document.getElementById('modalColorDot');
        if (modalColorDot) {
            modalColorDot.style.backgroundColor = event.color;
        }
        
        // 更新模态框背景色
        const modalContainer = document.getElementById('modalContainer');
        if (modalContainer) {
            const hex = event.color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            modalContainer.style.background = `linear-gradient(rgba(${r}, ${g}, ${b}, 0.08), rgba(${r}, ${g}, ${b}, 0.08)), white`;
        }
        
        // 更新保存按钮颜色
        const saveBtn = document.getElementById('saveEventBtn');
        if (saveBtn) {
            saveBtn.style.backgroundColor = event.color;
            saveBtn.style.borderColor = event.color;
        }
    }

    resetEventForm(initialDate = null, endDate = null, initialTitle = null) {
        const date = initialDate || new Date();
        const end = endDate || new Date(date.getTime() + 60 * 60 * 1000); // 默认1小时后
        
        document.getElementById('eventTitle').value = initialTitle || '';
        document.getElementById('eventDescription').value = '';
        document.getElementById('eventLocation').value = '';
        document.getElementById('eventDate').value = DateUtils.formatDate(date);
        document.getElementById('eventStartTime').value = DateUtils.formatDate(date, 'HH:mm');
        document.getElementById('eventEndTime').value = DateUtils.formatDate(end, 'HH:mm');
        
        // 重置颜色选择（默认第一个颜色）
        const defaultColor = EVENT_COLORS[0].value;
        document.querySelectorAll('.color-option').forEach((option, index) => {
            option.classList.toggle('selected', index === 0);
        });
        
        // 重置随机提示音开关（默认启用）
        const focusAlertCheckbox = document.getElementById('focusAlertCheckbox');
        const focusAlertToggle = document.getElementById('focusAlertToggle');
        if (focusAlertCheckbox && focusAlertToggle) {
            focusAlertCheckbox.checked = true;
            focusAlertToggle.dataset.enabled = 'true';
            // 应用默认颜色样式
            focusAlertToggle.style.background = `linear-gradient(135deg, ${defaultColor} 0%, ${defaultColor} 100%)`;
            focusAlertToggle.style.borderColor = defaultColor;
            focusAlertToggle.style.boxShadow = `0 4px 12px ${defaultColor}4D`;
        }
        
        // 重置保存按钮颜色为默认颜色
        const saveBtn = document.getElementById('saveEventBtn');
        if (saveBtn) {
            saveBtn.style.backgroundColor = defaultColor;
            saveBtn.style.borderColor = defaultColor;
        }
        
        // 重置折叠状态（默认折叠）
        const locationField = document.getElementById('locationField');
        const descriptionField = document.getElementById('descriptionField');
        const locationChevron = document.getElementById('locationChevron');
        const descriptionChevron = document.getElementById('descriptionChevron');
        
        if (locationField) {
            locationField.classList.add('hidden');
            locationChevron.style.transform = 'rotate(0deg)';
        }
        if (descriptionField) {
            descriptionField.classList.add('hidden');
            descriptionChevron.style.transform = 'rotate(0deg)';
        }
        
        // 重置模态框背景色
        const modalContainer = document.getElementById('modalContainer');
        if (modalContainer) {
            // 获取第一个颜色（默认选中的颜色）
            const defaultColor = EVENT_COLORS[0].value;
            const hex = defaultColor.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            modalContainer.style.background = `linear-gradient(rgba(${r}, ${g}, ${b}, 0.08), rgba(${r}, ${g}, ${b}, 0.08)), white`;
        }
    }

    setupColorPicker() {
        const colorPicker = document.getElementById('colorPicker');
        colorPicker.innerHTML = EVENT_COLORS.map((color, index) => `
            <button type="button" 
                    class="color-option ${index === 0 ? 'selected' : ''}" 
                    style="background-color: ${color.value}"
                    data-color="${color.value}"
                    title="${color.name}"
                    onclick="app.selectColor('${color.value}')">
            </button>
        `).join('');
    }

    selectColor(color) {
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.toggle('selected', option.dataset.color === color);
        });
        
        // 更新模态框颜色点
        const modalColorDot = document.getElementById('modalColorDot');
        if (modalColorDot) {
            modalColorDot.style.backgroundColor = color;
        }
        
        // 更新模态框背景色（白色底 + 颜色叠加）
        const modalContainer = document.getElementById('modalContainer');
        if (modalContainer) {
            // 将hex颜色转换为rgb并添加透明度
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            // 白色底 + 颜色叠加（透明度0.08）
            modalContainer.style.background = `linear-gradient(rgba(${r}, ${g}, ${b}, 0.08), rgba(${r}, ${g}, ${b}, 0.08)), white`;
        }
        
        // 更新专注提示音按钮的背景色
        const focusAlertToggle = document.getElementById('focusAlertToggle');
        if (focusAlertToggle && focusAlertToggle.dataset.enabled === 'true') {
            focusAlertToggle.style.background = `linear-gradient(135deg, ${color} 0%, ${color} 100%)`;
            focusAlertToggle.style.borderColor = color;
            focusAlertToggle.style.boxShadow = `0 4px 12px ${color}4D`; // 4D = 30% opacity
        }
        
        // 更新保存按钮的背景色
        const saveBtn = document.getElementById('saveEventBtn');
        if (saveBtn) {
            saveBtn.style.backgroundColor = color;
            saveBtn.style.borderColor = color;
        }
    }

    saveEvent() {
        const title = document.getElementById('eventTitle').value.trim();
        if (!title) {
            ToastManager.show('请输入日程标题', '', 'error');
            return;
        }
        
        const date = document.getElementById('eventDate').value;
        const startTime = document.getElementById('eventStartTime').value;
        const endTime = document.getElementById('eventEndTime').value;
        const description = document.getElementById('eventDescription').value.trim();
        const location = document.getElementById('eventLocation').value.trim();
        const selectedColor = document.querySelector('.color-option.selected');
        const color = selectedColor ? selectedColor.dataset.color : EVENT_COLORS[0].value;
        const focusAlert = document.getElementById('focusAlertCheckbox').checked;
        
        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);
        
        if (startDateTime >= endDateTime) {
            ToastManager.show('结束时间必须晚于开始时间', '', 'error');
            return;
        }
        
        const eventData = {
            title,
            description,
            location,
            startTime: startDateTime,
            endTime: endDateTime,
            color,
            focusAlert
        };
        
        if (this.state.selectedEvent) {
            // 更新事件
            const oldFocusAlert = this.state.selectedEvent.focusAlert;
            Object.assign(this.state.selectedEvent, eventData);
            
            // 如果关闭了专注模式，停止当前会话
            if (oldFocusAlert && !focusAlert && this.state.activeFocusSession.eventId === this.state.selectedEvent.id) {
                // 播放结束提示音然后停止会话
                this.playEndSound();
                this.stopFocusSession();
            }
            
            ToastManager.show('日程更新成功');
        } else {
            // 新建事件
            const newEvent = {
                id: Date.now().toString(),
                ...eventData
            };
            this.state.events.push(newEvent);
            ToastManager.show('日程创建成功', `${title} - ${DateUtils.formatDate(startDateTime)}`);
        }
        
        // 保存到localStorage
        this.state.saveEvents();
        
        // 注意：不在这里清理占位符，让closeEventModal统一处理
        
        this.closeEventModal();
        this.render();
        
        // 如果当前视图是周视图或日视图，跳转到合适的时间位置
        if (this.state.view === 'week' || this.state.view === 'day') {
            setTimeout(() => {
                const isToday = DateUtils.isToday(this.state.currentDate);
                if (isToday) {
                    // 如果当前显示的是今天，跳转到当前时间
                    this.jumpToCurrentTime();
                } else {
                    // 如果显示的是其他日期，跳转到事件开始时间
                    const eventHour = startDateTime.getHours();
                    const eventMinute = startDateTime.getMinutes();
                    this.jumpToTime(eventHour, eventMinute);
                }
            }, 100);
        }
    }

    deleteEvent() {
        if (!this.state.selectedEvent) return;
        
        const eventTitle = this.state.selectedEvent.title;
        ConfirmDialog.show(
            '删除日程',
            `确定要删除"${eventTitle}"吗？`,
            () => {
                const eventId = this.state.selectedEvent.id;
                this.state.events = this.state.events.filter(e => e.id !== eventId);
                
                // 保存到localStorage
                this.state.saveEvents();
                
                ToastManager.show('日程已删除');
                this.closeEventModal();
                
                // 只移除对应的卡片，不刷新整个页面
                const cardToRemove = document.querySelector(`.positioned-event[data-event-id="${eventId}"]`);
                if (cardToRemove) {
                    cardToRemove.remove();
                }
            }
        );
    }
    
    
    // ==================== TODO 区域管理 ====================
    
    setupTodoSection() {
        // 根据当前模式显示对应视图
        this.renderTodoView();
        
        // 绑定切换按钮
        const toggleBtn = document.getElementById('toggleTodoViewBtn');
        toggleBtn.addEventListener('click', () => {
            this.toggleTodoView();
        });
        
        // 绑定历史记录按钮
        const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
        
        toggleHistoryBtn.addEventListener('click', () => {
            this.toggleHistoryView();
        });
        
        // 绑定简洁模式容器点击事件
        const simpleTodoContainer = document.getElementById('simpleTodoContainer');
        simpleTodoContainer.addEventListener('click', (e) => {
            // 如果点击的是 todo 项或其子元素，不触发
            if (e.target.closest('.simple-todo-item') || e.target.closest('.todo-input')) {
                return;
            }
            this.showSimpleTodoInput();
        });
    }
    
    toggleHistoryView() {
        const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
        const isShowingHistory = toggleHistoryBtn.classList.contains('active');
        
        if (isShowingHistory) {
            // 切换回TODO视图
            toggleHistoryBtn.classList.remove('active');
            this.showTodoView();
        } else {
            // 切换到历史记录视图
            toggleHistoryBtn.classList.add('active');
            this.showHistoryView();
        }
    }
    
    showTodoView() {
        if (this.state.todoViewMode === 'simple') {
            // 简洁模式：显示TODO，隐藏历史
            document.getElementById('simpleTodoContainer').classList.remove('hidden');
            document.getElementById('simpleHistoryContainer').classList.add('hidden');
        } else {
            // 四象限模式：显示四象限，隐藏历史
            document.getElementById('quadrantTodoContainer').classList.remove('hidden');
            document.getElementById('quadrantHistoryContainer').classList.add('hidden');
        }
    }
    
    showHistoryView() {
        // 渲染历史记录
        this.renderTodoHistory();
        
        if (this.state.todoViewMode === 'simple') {
            // 简洁模式：隐藏TODO，显示历史
            document.getElementById('simpleTodoContainer').classList.add('hidden');
            document.getElementById('simpleHistoryContainer').classList.remove('hidden');
        } else {
            // 四象限模式：隐藏四象限，显示历史
            document.getElementById('quadrantTodoContainer').classList.add('hidden');
            document.getElementById('quadrantHistoryContainer').classList.remove('hidden');
        }
    }
    
    renderTodoView() {
        const simpleView = document.getElementById('simpleTodoView');
        const quadrantView = document.getElementById('quadrantTodoView');
        const sidebar = document.querySelector('aside');
        const miniCalendarSection = document.getElementById('miniCalendarSection');
        const durationCardsSection = document.getElementById('durationCardsSection');
        
        if (this.state.todoViewMode === 'simple') {
            simpleView.classList.remove('hidden');
            quadrantView.classList.add('hidden');
            sidebar.classList.remove('sidebar-wide');
            // 简洁模式：显示下方的日历和快速创建
            miniCalendarSection.classList.remove('hidden');
            durationCardsSection.classList.remove('hidden');
            this.renderSimpleTodoList();
        } else {
            simpleView.classList.add('hidden');
            quadrantView.classList.remove('hidden');
            sidebar.classList.add('sidebar-wide');
            // 四象限模式：隐藏下方的日历和快速创建（因为已经在四象限区域内显示了）
            miniCalendarSection.classList.add('hidden');
            durationCardsSection.classList.add('hidden');
            this.setupTodoQuadrants();
            // 在四象限模式下也渲染小日历
            this.renderMiniCalendarForQuadrant();
        }
    }
    
    toggleTodoView() {
        // 切换模式
        this.state.todoViewMode = this.state.todoViewMode === 'simple' ? 'quadrant' : 'simple';
        this.state.saveTodoViewMode(this.state.todoViewMode);
        
        // 重置历史记录按钮状态
        const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
        toggleHistoryBtn.classList.remove('active');
        
        // 重新渲染
        this.renderTodoView();
        
        const modeName = this.state.todoViewMode === 'simple' ? '简洁模式' : '四象限模式';
        ToastManager.show('视图已切换', modeName);
    }
    
    // ==================== 简洁模式 TODO ====================
    
    renderSimpleTodoList() {
        const listContainer = document.getElementById('simpleTodoList');
        const todos = this.state.todos.simple || [];
        
        if (todos.length === 0) {
            listContainer.innerHTML = '';
            return;
        }
        
        listContainer.innerHTML = todos.map(todo => `
            <div class="simple-todo-item ${todo.completed ? 'completed' : ''}" 
                 data-todo-id="${todo.id}"
                 draggable="true">
                <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" data-todo-id="${todo.id}"></div>
                <div class="todo-text">${this.escapeHtml(todo.text)}</div>
                <button class="todo-delete" data-todo-id="${todo.id}">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `).join('');
        
        // 绑定复选框事件
        listContainer.querySelectorAll('.todo-checkbox').forEach(checkbox => {
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
                const todoId = checkbox.dataset.todoId;
                this.toggleSimpleTodo(todoId);
            });
        });
        
        // 绑定删除按钮事件
        listContainer.querySelectorAll('.todo-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const todoId = btn.dataset.todoId;
                this.deleteSimpleTodo(todoId);
            });
        });
        
        // 绑定拖拽事件
        listContainer.querySelectorAll('.simple-todo-item').forEach(item => {
            item.addEventListener('dragstart', (e) => this.handleSimpleTodoDragStart(e));
            item.addEventListener('dragend', (e) => this.handleSimpleTodoDragEnd(e));
        });
    }
    
    showSimpleTodoInput() {
        const listContainer = document.getElementById('simpleTodoList');
        
        // 如果已经有输入框，不重复创建
        if (listContainer.querySelector('.todo-input')) {
            return;
        }
        
        const inputWrapper = document.createElement('div');
        inputWrapper.style.cssText = 'margin-bottom: 0.5rem;';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'todo-input';
        input.placeholder = '输入任务...';
        
        inputWrapper.appendChild(input);
        listContainer.insertBefore(inputWrapper, listContainer.firstChild);
        
        input.focus();
        
        // 处理输入
        const handleAdd = () => {
            const text = input.value.trim();
            if (text) {
                this.addSimpleTodo(text);
            } else {
                inputWrapper.remove();
            }
        };
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleAdd();
            } else if (e.key === 'Escape') {
                inputWrapper.remove();
            }
        });
        
        input.addEventListener('blur', () => {
            setTimeout(() => handleAdd(), 100);
        });
    }
    
    addSimpleTodo(text) {
        if (!this.state.todos.simple) {
            this.state.todos.simple = [];
        }
        
        const todo = {
            id: Date.now().toString(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        this.state.todos.simple.push(todo);
        this.state.saveTodos();
        this.renderSimpleTodoList();
    }
    
    toggleSimpleTodo(todoId) {
        const todo = this.state.todos.simple.find(t => t.id === todoId);
        if (todo) {
            todo.completed = !todo.completed;
            
            // 如果标记为完成，移入历史记录
            if (todo.completed) {
                // 从简洁模式列表移除
                this.state.todos.simple = this.state.todos.simple.filter(t => t.id !== todoId);
                
                // 添加到历史记录
                if (!this.state.todos.history) {
                    this.state.todos.history = [];
                }
                this.state.todos.history.unshift({
                    ...todo,
                    completedAt: new Date().toISOString(),
                    fromQuadrant: 'simple'
                });
            }
            
            this.state.saveTodos();
            this.renderSimpleTodoList();
        }
    }
    
    deleteSimpleTodo(todoId) {
        this.state.todos.simple = this.state.todos.simple.filter(t => t.id !== todoId);
        this.state.saveTodos();
        this.renderSimpleTodoList();
    }
    
    // 简洁模式 TODO 拖拽
    handleSimpleTodoDragStart(e) {
        const todoItem = e.currentTarget;
        const todoId = todoItem.dataset.todoId;
        const todo = this.state.todos.simple.find(t => t.id === todoId);
        
        if (!todo) return;
        
        this.dragState.isDraggingCard = true;
        this.dragState.draggedTodo = {
            id: todoId,
            mode: 'simple',
            text: todo.text
        };
        
        todoItem.classList.add('dragging');
        
        // 设置拖拽数据
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', todo.text);
    }
    
    handleSimpleTodoDragEnd(e) {
        const todoItem = e.currentTarget;
        todoItem.classList.remove('dragging');
        
        setTimeout(() => {
            this.dragState.isDraggingCard = false;
            this.dragState.draggedTodo = null;
        }, 100);
    }
    
    // ==================== 四象限 TODO 功能 ====================
    
    setupTodoQuadrants() {
        // 渲染所有象限的 TODO
        for (let i = 1; i <= 4; i++) {
            this.renderTodoList(i);
        }
        
        // 绑定卡片点击事件
        document.querySelectorAll('.quadrant-box').forEach(box => {
            box.addEventListener('click', (e) => {
                // 如果点击的是 todo 项或其子元素，不触发
                if (e.target.closest('.todo-item') || e.target.closest('.todo-input')) {
                    return;
                }
                const quadrant = parseInt(box.dataset.quadrant);
                this.showTodoInput(quadrant);
            });
        });
    }
    
    renderTodoList(quadrant) {
        const listContainer = document.getElementById(`todoList${quadrant}`);
        const todos = this.state.todos[quadrant] || [];
        
        if (todos.length === 0) {
            listContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.7rem; padding: 1rem 0;">暂无任务</div>';
            return;
        }
        
        listContainer.innerHTML = todos.map(todo => `
            <div class="todo-item ${todo.completed ? 'completed' : ''}" 
                 data-todo-id="${todo.id}" 
                 data-quadrant="${quadrant}"
                 draggable="true">
                <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" data-quadrant="${quadrant}" data-todo-id="${todo.id}"></div>
                <div class="todo-text">${this.escapeHtml(todo.text)}</div>
                <button class="todo-delete" data-quadrant="${quadrant}" data-todo-id="${todo.id}">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `).join('');
        
        // 绑定复选框事件
        listContainer.querySelectorAll('.todo-checkbox').forEach(checkbox => {
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
                const quadrant = parseInt(checkbox.dataset.quadrant);
                const todoId = checkbox.dataset.todoId;
                this.state.toggleTodo(quadrant, todoId);
                this.renderTodoList(quadrant);
            });
        });
        
        // 绑定删除按钮事件
        listContainer.querySelectorAll('.todo-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const quadrant = parseInt(btn.dataset.quadrant);
                const todoId = btn.dataset.todoId;
                this.state.deleteTodo(quadrant, todoId);
                this.renderTodoList(quadrant);
            });
        });
        
        // 绑定拖拽事件
        listContainer.querySelectorAll('.todo-item').forEach(item => {
            item.addEventListener('dragstart', (e) => this.handleTodoDragStart(e));
            item.addEventListener('dragend', (e) => this.handleTodoDragEnd(e));
        });
    }
    
    showTodoInput(quadrant) {
        const listContainer = document.getElementById(`todoList${quadrant}`);
        
        // 如果已经有输入框，不重复创建
        if (listContainer.querySelector('.todo-input')) {
            return;
        }
        
        const inputWrapper = document.createElement('div');
        inputWrapper.style.cssText = 'margin-bottom: 0.375rem;';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'todo-input';
        input.placeholder = '输入任务...';
        
        inputWrapper.appendChild(input);
        listContainer.insertBefore(inputWrapper, listContainer.firstChild);
        
        input.focus();
        
        // 处理输入
        const handleAdd = () => {
            const text = input.value.trim();
            if (text) {
                this.state.addTodo(quadrant, text);
                this.renderTodoList(quadrant);
            } else {
                inputWrapper.remove();
            }
        };
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleAdd();
            } else if (e.key === 'Escape') {
                inputWrapper.remove();
            }
        });
        
        input.addEventListener('blur', () => {
            setTimeout(() => handleAdd(), 100);
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // 渲染历史记录
    renderTodoHistory() {
        // 根据当前模式选择容器
        let historyContainer;
        if (this.state.todoViewMode === 'simple') {
            historyContainer = document.getElementById('todoHistoryList');
        } else {
            historyContainer = document.getElementById('todoHistoryListQuadrant');
        }
        
        if (!historyContainer) return;
        
        const history = this.state.todos.history || [];
        
        if (history.length === 0) {
            historyContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.875rem; padding: 3rem 1rem;">暂无历史记录</div>';
            return;
        }
        
        // 只显示最近20条
        const recentHistory = history.slice(0, 20);
        
        historyContainer.innerHTML = recentHistory.map(todo => {
            const completedDate = new Date(todo.completedAt);
            const timeStr = DateUtils.formatDate(completedDate, 'M月d日 HH:mm');
            
            return `
                <div class="history-item" data-todo-id="${todo.id}">
                    <div class="history-checkbox checked"></div>
                    <div class="history-text">${this.escapeHtml(todo.text)}</div>
                    <div class="history-time">${timeStr}</div>
                    <button class="history-delete" data-todo-id="${todo.id}">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');
        
        // 绑定删除按钮事件
        historyContainer.querySelectorAll('.history-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const todoId = btn.dataset.todoId;
                this.deleteHistoryItem(todoId);
            });
        });
    }
    
    // 删除历史记录项
    deleteHistoryItem(todoId) {
        this.state.todos.history = this.state.todos.history.filter(t => t.id !== todoId);
        this.state.saveTodos();
        this.renderTodoHistory();
    }
    
    // 设置事件时长
    setEventDuration(minutes) {
        const startTimeInput = document.getElementById('eventStartTime');
        const endTimeInput = document.getElementById('eventEndTime');
        const dateInput = document.getElementById('eventDate');
        
        if (!startTimeInput.value || !dateInput.value) return;
        
        // 解析开始时间
        const [startHour, startMinute] = startTimeInput.value.split(':').map(Number);
        const startDate = new Date(dateInput.value);
        startDate.setHours(startHour, startMinute, 0, 0);
        
        // 计算结束时间
        const endDate = new Date(startDate.getTime() + minutes * 60 * 1000);
        
        // 设置结束时间
        const endHour = String(endDate.getHours()).padStart(2, '0');
        const endMinute = String(endDate.getMinutes()).padStart(2, '0');
        endTimeInput.value = `${endHour}:${endMinute}`;
    }
    
    // ==================== TODO 拖拽功能 ====================
    
    handleTodoDragStart(e) {
        const todoItem = e.currentTarget;
        const todoId = todoItem.dataset.todoId;
        const quadrant = parseInt(todoItem.dataset.quadrant);
        const todo = this.state.todos[quadrant].find(t => t.id === todoId);
        
        if (!todo) return;
        
        this.dragState.isDraggingCard = true;
        this.dragState.draggedTodo = {
            id: todoId,
            quadrant: quadrant,
            text: todo.text
        };
        
        todoItem.classList.add('dragging');
        
        // 设置拖拽数据
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', todo.text);
    }
    
    handleTodoDragEnd(e) {
        const todoItem = e.currentTarget;
        todoItem.classList.remove('dragging');
        
        setTimeout(() => {
            this.dragState.isDraggingCard = false;
            this.dragState.draggedTodo = null;
        }, 100);
        
        // 移除所有高亮
        document.querySelectorAll('.time-slot-highlight').forEach(slot => {
            slot.classList.remove('time-slot-highlight');
        });
    }
    
    handleTodoDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const slot = e.currentTarget;
        const dateStr = slot.dataset.date;
        const hour = parseInt(slot.dataset.hour);
        
        if (!dateStr || isNaN(hour)) return;
        
        const todo = this.dragState.draggedTodo;
        if (!todo) return;
        
        // 创建日期时间
        const startTime = new Date(dateStr);
        startTime.setHours(hour, 0, 0, 0);
        
        // 默认 1 小时时长
        const endTime = new Date(startTime);
        endTime.setHours(hour + 1, 0, 0, 0);
        
        // 打开事件模态框进行编辑，预填充 TODO 文本
        this.openEventModal(null, startTime, endTime, todo.text);
        
        console.log('TODO dropped, opening modal for editing');
    }
    
    // ==================== 设置功能 ====================
    
    setupSettings() {
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsMenu = document.getElementById('settingsMenu');
        const settingsChevron = document.getElementById('settingsChevron');
        const viewBackupsBtn = document.getElementById('viewBackupsBtn');
        const backupsModal = document.getElementById('backupsModal');
        const closeBackupsModalBtn = document.getElementById('closeBackupsModalBtn');
        
        // 切换菜单显示
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsMenu.classList.toggle('hidden');
            settingsBtn.classList.toggle('active');
        });
        
        // 点击外部关闭菜单
        document.addEventListener('click', (e) => {
            if (!settingsMenu.classList.contains('hidden') && 
                !settingsMenu.contains(e.target) && 
                !settingsBtn.contains(e.target)) {
                settingsMenu.classList.add('hidden');
                settingsBtn.classList.remove('active');
            }
        });
        
        // 查看备份数据 - 打开模态框
        viewBackupsBtn.addEventListener('click', () => {
            this.showBackupsModal();
            settingsMenu.classList.add('hidden');
            settingsBtn.classList.remove('active');
        });
        
        // 关闭备份模态框
        closeBackupsModalBtn.addEventListener('click', () => {
            backupsModal.classList.add('hidden');
        });
        
        // 点击模态框外部关闭
        backupsModal.addEventListener('click', (e) => {
            if (e.target === backupsModal) {
                backupsModal.classList.add('hidden');
            }
        });
        
        // ESC 键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !backupsModal.classList.contains('hidden')) {
                backupsModal.classList.add('hidden');
            }
        });
        
        // 导出数据
        document.getElementById('exportDataBtn').addEventListener('click', () => {
            this.exportData();
            settingsMenu.classList.add('hidden');
            settingsBtn.classList.remove('active');
        });
        
        // 导入数据
        document.getElementById('importDataBtn').addEventListener('click', () => {
            this.importData();
            settingsMenu.classList.add('hidden');
            settingsBtn.classList.remove('active');
        });
        
        // 备份设置
        document.getElementById('backupSettingsBtn').addEventListener('click', () => {
            this.showBackupSettings();
            settingsMenu.classList.add('hidden');
            settingsBtn.classList.remove('active');
        });
        
        // 测试音频
        document.getElementById('testAudioBtn').addEventListener('click', () => {
            this.testAudio();
            settingsMenu.classList.add('hidden');
            settingsBtn.classList.remove('active');
        });
        
        // 文件导入处理
        document.getElementById('importFileInput').addEventListener('change', (e) => {
            this.handleImportFile(e);
        });
    }
    
    // 显示备份模态框
    showBackupsModal() {
        const backupsModal = document.getElementById('backupsModal');
        const backupsListContainer = document.getElementById('backupsListContainer');
        const backups = this.getBackupsList();
        
        if (backups.length === 0) {
            backupsListContainer.innerHTML = `
                <div class="no-backups">
                    <div class="no-backups-icon">
                        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                        </svg>
                    </div>
                    <div class="no-backups-title">暂无备份数据</div>
                    <div class="no-backups-desc">启用自动备份后，系统会每天自动保存数据</div>
                </div>
            `;
        } else {
            backupsListContainer.innerHTML = backups.map(backup => `
                <div class="backup-item">
                    <div class="backup-item-header">
                        <div>
                            <div class="backup-item-date">${this.formatBackupDate(backup.date)}</div>
                            <div class="backup-item-time">${this.formatBackupTime(backup.backupDate)}</div>
                        </div>
                    </div>
                    <div class="backup-item-info">
                        <div class="backup-stat">
                            <div class="backup-stat-icon events">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                            </div>
                            <div>
                                <div class="backup-stat-value">${backup.eventsCount}</div>
                                <div class="backup-stat-label">日程</div>
                            </div>
                        </div>
                        <div class="backup-stat">
                            <div class="backup-stat-icon todos">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                                </svg>
                            </div>
                            <div>
                                <div class="backup-stat-value">${backup.todosCount}</div>
                                <div class="backup-stat-label">任务</div>
                            </div>
                        </div>
                    </div>
                    <div class="backup-item-actions">
                        <button class="backup-action-btn" onclick="app.exportBackup('${backup.key}')">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                            </svg>
                            导出
                        </button>
                        <button class="backup-action-btn" onclick="app.restoreBackup('${backup.key}')">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                            </svg>
                            恢复
                        </button>
                        <button class="backup-action-btn delete" onclick="app.deleteBackup('${backup.key}')" title="删除备份">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        backupsModal.classList.remove('hidden');
    }
    
    // 显示备份列表（已废弃，改用模态框）
    showBackupsList() {
        // 保留以防需要
    }
    
    // 获取备份列表
    getBackupsList() {
        const backups = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('backup_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    const dateStr = key.replace('backup_', '');
                    
                    backups.push({
                        key: key,
                        date: dateStr,
                        eventsCount: data.events ? data.events.length : 0,
                        todosCount: this.countTodos(data.todos),
                        backupDate: new Date(data.backupDate)
                    });
                } catch (e) {
                    console.error('Failed to parse backup:', key, e);
                }
            }
        }
        
        // 按日期降序排序
        backups.sort((a, b) => b.backupDate - a.backupDate);
        
        return backups;
    }
    
    // 计算 TODO 总数
    countTodos(todos) {
        if (!todos) return 0;
        let count = 0;
        for (let quadrant in todos) {
            count += todos[quadrant].length;
        }
        return count;
    }
    
    // 格式化备份日期
    formatBackupDate(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (DateUtils.isSameDay(date, today)) {
            return '今天';
        } else if (DateUtils.isSameDay(date, yesterday)) {
            return '昨天';
        } else {
            return DateUtils.formatDate(date, 'M月d日');
        }
    }
    
    // 格式化备份时间
    formatBackupTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    // 导出备份
    exportBackup(backupKey) {
        try {
            const data = localStorage.getItem(backupKey);
            if (!data) {
                ToastManager.show('备份不存在', '', 'error');
                return;
            }
            
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const dateStr = backupKey.replace('backup_', '');
            const a = document.createElement('a');
            a.href = url;
            a.download = `calendar-backup-${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            ToastManager.show('备份导出成功', '文件已下载');
        } catch (error) {
            console.error('Export backup error:', error);
            ToastManager.show('导出失败', '', 'error');
        }
    }
    
    // 恢复备份
    restoreBackup(backupKey) {
        try {
            const data = JSON.parse(localStorage.getItem(backupKey));
            if (!data) {
                ToastManager.show('备份不存在', '', 'error');
                return;
            }
            
            const dateStr = backupKey.replace('backup_', '');
            
            ConfirmDialog.show(
                '恢复备份',
                `确定要恢复 ${this.formatBackupDate(dateStr)} 的备份吗？当前数据将被覆盖。`,
                () => {
                    // 恢复事件数据
                    this.state.events = data.events.map(event => ({
                        ...event,
                        startTime: new Date(event.startTime),
                        endTime: new Date(event.endTime)
                    }));
                    
                    // 恢复 TODO 数据
                    this.state.todos = data.todos;
                    
                    // 保存到 localStorage
                    this.state.saveEvents();
                    this.state.saveTodos();
                    
                    // 重新渲染
                    this.render();
                    this.renderTodoView();
                    
                    // 关闭模态框
                    document.getElementById('backupsModal').classList.add('hidden');
                    
                    ToastManager.show('备份恢复成功', `已恢复 ${data.events.length} 个日程`);
                }
            );
        } catch (error) {
            console.error('Restore backup error:', error);
            ToastManager.show('恢复失败', '', 'error');
        }
    }
    
    // 删除备份
    deleteBackup(backupKey) {
        const dateStr = backupKey.replace('backup_', '');
        
        ConfirmDialog.show(
            '删除备份',
            `确定要删除 ${this.formatBackupDate(dateStr)} 的备份吗？`,
            () => {
                localStorage.removeItem(backupKey);
                this.showBackupsModal(); // 刷新模态框
                ToastManager.show('备份已删除');
            }
        );
    }
    
    // 导出数据
    exportData() {
        const data = {
            events: this.state.events.map(event => ({
                ...event,
                startTime: event.startTime.toISOString(),
                endTime: event.endTime.toISOString()
            })),
            todos: this.state.todos,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `calendar-backup-${DateUtils.formatDate(new Date())}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        ToastManager.show('数据导出成功', '文件已下载');
    }
    
    // 导入数据
    importData() {
        document.getElementById('importFileInput').click();
    }
    
    // 处理导入文件
    handleImportFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                // 验证数据格式
                if (!data.events || !data.todos) {
                    throw new Error('无效的数据格式');
                }
                
                // 确认导入
                ConfirmDialog.show(
                    '导入数据',
                    '导入将覆盖当前所有数据，确定继续吗？',
                    () => {
                        // 恢复事件数据
                        this.state.events = data.events.map(event => ({
                            ...event,
                            startTime: new Date(event.startTime),
                            endTime: new Date(event.endTime)
                        }));
                        
                        // 恢复 TODO 数据
                        this.state.todos = data.todos;
                        
                        // 保存到 localStorage
                        this.state.saveEvents();
                        this.state.saveTodos();
                        
                        // 重新渲染
                        this.render();
                        this.renderTodoView();
                        
                        ToastManager.show('数据导入成功', `已恢复 ${data.events.length} 个日程`);
                    }
                );
            } catch (error) {
                console.error('Import error:', error);
                ToastManager.show('导入失败', '文件格式错误', 'error');
            }
            
            // 清空文件输入
            e.target.value = '';
        };
        
        reader.readAsText(file);
    }
    
    // 显示备份设置
    showBackupSettings() {
        const backupEnabled = localStorage.getItem('autoBackupEnabled') !== 'false';
        
        ConfirmDialog.show(
            '自动备份设置',
            `当前状态: ${backupEnabled ? '已启用' : '已禁用'}\n\n自动备份会在每天首次打开应用时保存数据，保留最近7天的备份。\n\n${backupEnabled ? '点击确定关闭自动备份' : '点击确定启用自动备份'}`,
            () => {
                const newState = !backupEnabled;
                localStorage.setItem('autoBackupEnabled', newState);
                
                if (newState) {
                    ToastManager.show('自动备份已启用', '将保留最近7天的数据');
                    this.performAutoBackup(); // 立即执行一次备份
                } else {
                    ToastManager.show('自动备份已关闭');
                }
            }
        );
    }
    
    // 初始化自动备份
    initAutoBackup() {
        const backupEnabled = localStorage.getItem('autoBackupEnabled') !== 'false';
        if (!backupEnabled) return;
        
        const today = DateUtils.formatDate(new Date());
        const lastBackupDate = localStorage.getItem('lastBackupDate');
        
        // 如果今天还没有备份，执行备份
        if (lastBackupDate !== today) {
            this.performAutoBackup();
        }
    }
    
    // 执行自动备份
    performAutoBackup() {
        const today = DateUtils.formatDate(new Date());
        
        // 准备备份数据
        const data = {
            events: this.state.events.map(event => ({
                ...event,
                startTime: event.startTime.toISOString(),
                endTime: event.endTime.toISOString()
            })),
            todos: this.state.todos,
            backupDate: new Date().toISOString(),
            version: '1.0'
        };
        
        // 保存到 localStorage（使用日期作为键）
        const backupKey = `backup_${today}`;
        localStorage.setItem(backupKey, JSON.stringify(data));
        localStorage.setItem('lastBackupDate', today);
        
        // 清理7天前的备份
        this.cleanOldBackups();
        
        console.log('Auto backup completed:', today);
    }
    
    // 清理旧备份
    cleanOldBackups() {
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        // 遍历 localStorage，删除7天前的备份
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('backup_')) {
                const dateStr = key.replace('backup_', '');
                const backupDate = new Date(dateStr);
                
                if (backupDate < sevenDaysAgo) {
                    localStorage.removeItem(key);
                    console.log('Removed old backup:', key);
                }
            }
        }
    }
    
    // ==================== 专注模式功能 ====================
    
    // 检查并启动专注会话
    checkAndStartFocusSessions() {
        const now = new Date();
        
        // 查找当前时间段内启用了专注模式的日程
        const activeFocusEvents = this.state.events.filter(event => {
            return event.focusAlert && 
                   event.startTime <= now && 
                   event.endTime > now;
        });
        
        // 如果有启用专注模式的日程，且当前没有运行的会话
        if (activeFocusEvents.length > 0 && !this.state.activeFocusSession.eventId) {
            // 启动第一个日程的专注会话
            this.startFocusSession(activeFocusEvents[0]);
        }
        
        // 如果当前会话的日程已结束，停止会话
        if (this.state.activeFocusSession.eventId) {
            const currentEvent = this.state.events.find(e => e.id === this.state.activeFocusSession.eventId);
            if (!currentEvent || currentEvent.endTime <= now) {
                // 添加标记防止重复播放结束提示音
                if (!this.state.activeFocusSession.hasPlayedEndSound) {
                    console.log('Focus session ended, playing end sound');
                    this.playEndSound();
                    this.state.activeFocusSession.hasPlayedEndSound = true;
                }
                // 停止会话
                this.stopFocusSession();
            }
        }
    }
    
    // 启动专注会话
    startFocusSession(event) {
        console.log('Starting focus session for:', event.title);
        
        // 如果已经有相同的会话在运行，不需要重新启动
        if (this.state.activeFocusSession.eventId === event.id) {
            console.log('Focus session already running for this event');
            return;
        }
        
        // 停止之前的会话（如果有且不同）
        if (this.state.activeFocusSession.eventId && this.state.activeFocusSession.eventId !== event.id) {
            this.playEndSound();
            this.stopFocusSession();
        }
        
        // 播放开始提示音
        this.playStartSound();
        
        // 设置新会话
        this.state.activeFocusSession.eventId = event.id;
        this.state.activeFocusSession.hasPlayedEndSound = false; // 初始化结束提示音标记
        
        // 计算下次提示时间
        this.scheduleNextAlert();
    }
    
    // 停止专注会话
    stopFocusSession() {
        console.log('Stopping focus session');
        
        // 清除计时器
        if (this.state.activeFocusSession.timerId) {
            clearTimeout(this.state.activeFocusSession.timerId);
            this.state.activeFocusSession.timerId = null;
        }
        
        if (this.state.activeFocusSession.restTimerId) {
            clearTimeout(this.state.activeFocusSession.restTimerId);
            this.state.activeFocusSession.restTimerId = null;
        }
        
        // 重置会话
        this.state.activeFocusSession.eventId = null;
        this.state.activeFocusSession.nextAlertTime = null;
        this.state.activeFocusSession.hasPlayedEndSound = false; // 重置结束提示音标记
        
        // 隐藏休息提示框（如果显示中）
        const restAlert = document.getElementById('focusRestAlert');
        if (restAlert) {
            restAlert.classList.add('hidden');
        }
    }
    
    // 安排下次提示
    scheduleNextAlert() {
        const now = new Date();
        const event = this.state.events.find(e => e.id === this.state.activeFocusSession.eventId);
        
        if (!event) {
            // 播放结束提示音然后停止会话
            this.playEndSound();
            this.stopFocusSession();
            return;
        }
        
        // 生成3-5分钟内的随机时间（毫秒）
        const minMs = this.state.focusSettings.minInterval * 60 * 1000;
        const maxMs = this.state.focusSettings.maxInterval * 60 * 1000;
        const randomMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
        
        // 计算下次提示时间
        const nextAlertTime = new Date(now.getTime() + randomMs);
        
        // 检查是否超过日程结束时间
        if (nextAlertTime >= event.endTime) {
            console.log('Next alert would be after event end, waiting for event to end naturally');
            // 💡 修复死循环：时间不够安排下次休息时，不要提前停止会话，也不要发声。
            // 保持专注会话为 active 状态，让每秒检查器在时间真正结束时去处理。
            return;
        }
        
        this.state.activeFocusSession.nextAlertTime = nextAlertTime;
        
        console.log('Next alert scheduled at:', nextAlertTime.toLocaleTimeString(), 'in', Math.round(randomMs / 1000), 'seconds');
        
        // 设置计时器
        this.state.activeFocusSession.timerId = setTimeout(() => {
            this.triggerFocusAlert();
        }, randomMs);
    }
    
    // 触发专注提示
    triggerFocusAlert() {
        console.log('Focus alert triggered!');
        
        // 播放提示音
        this.playAlertSound();
        
        // 显示休息提示框
        this.showRestAlert();
        
        // 10秒后安排下次提示
        this.state.activeFocusSession.restTimerId = setTimeout(() => {
            this.hideRestAlert();
            this.scheduleNextAlert();
        }, this.state.focusSettings.restDuration * 1000);
    }
    
    // 播放提示音
    // 初始化音频上下文（需要用户交互后才能使用）
    initAudioContext() {
        console.log('Initializing audio context...');
        
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('AudioContext created, state:', this.audioContext.state);
                
                // 如果音频上下文被暂停，尝试恢复
                if (this.audioContext.state === 'suspended') {
                    console.log('AudioContext suspended, attempting to resume...');
                    this.audioContext.resume().then(() => {
                        console.log('AudioContext resumed successfully');
                        this.audioInitialized = true;
                        this.playPendingSounds();
                    });
                } else {
                    this.audioInitialized = true;
                    this.playPendingSounds();
                }
                
            } catch (error) {
                console.error('Failed to create AudioContext:', error);
            }
        } else {
            console.log('AudioContext already exists, state:', this.audioContext.state);
            if (!this.audioInitialized) {
                this.audioInitialized = true;
                this.playPendingSounds();
            }
        }
        return this.audioContext;
    }

    // 播放待播放的声音队列
    playPendingSounds() {
        console.log('Playing pending sounds, queue length:', this.pendingSounds.length);
        while (this.pendingSounds.length > 0) {
            const soundType = this.pendingSounds.shift();
            console.log('Playing pending sound:', soundType);
            this.playSound(soundType);
        }
    }

    // 统一的声音播放方法
    playSound(type) {
        console.log('Attempting to play sound:', type, 'Audio initialized:', this.audioInitialized);
        
        if (!this.audioInitialized) {
            // 如果音频还没初始化，加入待播放队列
            console.log('Audio not initialized, adding to pending queue');
            this.pendingSounds.push(type);
            return;
        }

        try {
            const audioContext = this.audioContext;
            if (!audioContext) {
                console.warn('AudioContext not available');
                return;
            }
            
            if (audioContext.state !== 'running') {
                console.warn('AudioContext state:', audioContext.state);
                // 尝试恢复音频上下文
                audioContext.resume().then(() => {
                    console.log('AudioContext resumed, retrying sound');
                    this.playSound(type);
                });
                return;
            }
            
            console.log('Playing sound:', type);
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // 根据类型设置不同的音调
            switch (type) {
                case 'start':
                    // 开始提示音：上升音调
                    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
                    oscillator.frequency.linearRampToValueAtTime(1000, audioContext.currentTime + 0.4);
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.4);
                    break;
                    
                case 'end':
                    // 结束提示音：下降音调
                    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
                    oscillator.frequency.linearRampToValueAtTime(400, audioContext.currentTime + 0.5);
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.5);
                    break;
                    
                case 'alert':
                default:
                    // 中间提醒音：固定音调
                    oscillator.frequency.value = 800;
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.3);
                    break;
            }
            
            oscillator.type = 'sine';
            
        } catch (error) {
            console.error('Failed to play sound:', error);
        }
    }

    playAlertSound() {
        this.playSound('alert');
    }

    playStartSound() {
        this.playSound('alert');
    }

    playEndSound() {
        this.playSound('alert');
    }

    // 测试音频功能
    testAudio() {
        console.log('Testing audio functionality...');
        
        // 确保音频上下文已初始化
        this.initAudioContext();
        
        // 播放提示音
        setTimeout(() => {
            console.log('Playing alert sound...');
            this.playAlertSound();
        }, 100);
        
        // 显示提示信息
        ToastManager.show('音频测试', '播放提示音', 'success');
    }
    
    // 显示休息提示框
    showRestAlert() {
        console.log('Attempting to show rest alert...');
        
        const restAlert = document.getElementById('focusRestAlert');
        const countdown = document.getElementById('restCountdown');
        
        console.log('Rest alert element:', restAlert);
        console.log('Countdown element:', countdown);
        
        if (!restAlert) {
            console.error('focusRestAlert element not found!');
            return;
        }
        
        if (!countdown) {
            console.error('restCountdown element not found!');
            return;
        }
        
        // 确保元素可见
        restAlert.classList.remove('hidden');
        restAlert.style.display = 'flex'; // 强制显示
        
        console.log('Rest alert should now be visible');
        
        // 倒计时动画
        let seconds = this.state.focusSettings.restDuration;
        countdown.textContent = seconds;
        
        const countdownInterval = setInterval(() => {
            seconds--;
            if (seconds > 0) {
                countdown.textContent = seconds;
            } else {
                clearInterval(countdownInterval);
            }
        }, 1000);
        
        // 保存interval ID以便清理
        this.state.activeFocusSession.countdownInterval = countdownInterval;
    }
    
    // 隐藏休息提示框
    hideRestAlert() {
        console.log('Hiding rest alert...');
        
        const restAlert = document.getElementById('focusRestAlert');
        if (restAlert) {
            restAlert.classList.add('hidden');
            restAlert.style.display = 'none'; // 强制隐藏
            console.log('Rest alert hidden');
            
            // ✅ 休息结束，播放提示音（上升音调，暗示重新开始专注）
            this.playStartSound();
        } else {
            console.error('focusRestAlert element not found when trying to hide!');
        }
        
        // 清除倒计时
        if (this.state.activeFocusSession.countdownInterval) {
            clearInterval(this.state.activeFocusSession.countdownInterval);
            this.state.activeFocusSession.countdownInterval = null;
        }
    }
    
    // 启动专注模式检查器
    startFocusChecker() {
        // 每秒检查一次是否需要启动专注会话
        this.focusCheckerInterval = setInterval(() => {
            this.checkAndStartFocusSessions();
        }, 1000);
        
        // 立即执行一次检查
        this.checkAndStartFocusSessions();
        
        console.log('Focus checker started');
    }
    
    // 设置可折叠字段
    setupCollapsibleFields() {
        // 地点折叠
        const toggleLocationBtn = document.getElementById('toggleLocationBtn');
        const locationField = document.getElementById('locationField');
        const locationChevron = document.getElementById('locationChevron');
        
        if (toggleLocationBtn) {
            // 移除旧的事件监听器
            const newToggleLocationBtn = toggleLocationBtn.cloneNode(true);
            toggleLocationBtn.parentNode.replaceChild(newToggleLocationBtn, toggleLocationBtn);
            
            newToggleLocationBtn.addEventListener('click', () => {
                locationField.classList.toggle('hidden');
                const isExpanded = !locationField.classList.contains('hidden');
                locationChevron.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
                
                // 如果展开，聚焦到输入框
                if (isExpanded) {
                    setTimeout(() => document.getElementById('eventLocation').focus(), 100);
                }
            });
        }
        
        // 描述折叠
        const toggleDescriptionBtn = document.getElementById('toggleDescriptionBtn');
        const descriptionField = document.getElementById('descriptionField');
        const descriptionChevron = document.getElementById('descriptionChevron');
        
        if (toggleDescriptionBtn) {
            // 移除旧的事件监听器
            const newToggleDescriptionBtn = toggleDescriptionBtn.cloneNode(true);
            toggleDescriptionBtn.parentNode.replaceChild(newToggleDescriptionBtn, toggleDescriptionBtn);
            
            newToggleDescriptionBtn.addEventListener('click', () => {
                descriptionField.classList.toggle('hidden');
                const isExpanded = !descriptionField.classList.contains('hidden');
                descriptionChevron.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
                
                // 如果展开，聚焦到输入框
                if (isExpanded) {
                    setTimeout(() => document.getElementById('eventDescription').focus(), 100);
                }
            });
        }
        
        // 专注提示音切换按钮
        const focusAlertToggle = document.getElementById('focusAlertToggle');
        const focusAlertCheckbox = document.getElementById('focusAlertCheckbox');
        
        if (focusAlertToggle && focusAlertCheckbox) {
            // 移除旧的事件监听器
            const newFocusAlertToggle = focusAlertToggle.cloneNode(true);
            focusAlertToggle.parentNode.replaceChild(newFocusAlertToggle, focusAlertToggle);
            
            newFocusAlertToggle.addEventListener('click', () => {
                const isEnabled = newFocusAlertToggle.dataset.enabled === 'true';
                const newState = !isEnabled;
                
                newFocusAlertToggle.dataset.enabled = newState.toString();
                focusAlertCheckbox.checked = newState;
                
                // 获取当前选中的颜色
                const selectedColor = document.querySelector('.color-option.selected');
                const color = selectedColor ? selectedColor.dataset.color : EVENT_COLORS[0].value;
                
                // 根据状态更新样式
                if (newState) {
                    // 启用状态：使用选中的标签颜色
                    newFocusAlertToggle.style.background = `linear-gradient(135deg, ${color} 0%, ${color} 100%)`;
                    newFocusAlertToggle.style.borderColor = color;
                    newFocusAlertToggle.style.boxShadow = `0 4px 12px ${color}4D`; // 4D = 30% opacity
                } else {
                    // 禁用状态：恢复默认灰色
                    newFocusAlertToggle.style.background = '#f3f4f6';
                    newFocusAlertToggle.style.borderColor = '#d1d5db';
                    newFocusAlertToggle.style.boxShadow = 'none';
                }
                
                console.log('Focus alert toggled:', newState);
            });
        }
    }
}

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new CalendarApp();
    
    // 暴露给Unity的接口
    window.CalendarAPI = {
        // 获取所有事件
        getEvents: () => app.state.events,
        
        // 添加事件
        addEvent: (eventData) => {
            const newEvent = {
                id: Date.now().toString(),
                title: eventData.title || '新事件',
                description: eventData.description || '',
                location: eventData.location || '',
                startTime: new Date(eventData.startTime),
                endTime: new Date(eventData.endTime),
                color: eventData.color || EVENT_COLORS[0].value
            };
            app.state.events.push(newEvent);
            app.render();
            return newEvent.id;
        },
        
        // 更新事件
        updateEvent: (eventId, updates) => {
            const event = app.state.events.find(e => e.id === eventId);
            if (event) {
                Object.assign(event, updates);
                if (updates.startTime) event.startTime = new Date(updates.startTime);
                if (updates.endTime) event.endTime = new Date(updates.endTime);
                app.render();
                return true;
            }
            return false;
        },
        
        // 删除事件
        deleteEvent: (eventId) => {
            const index = app.state.events.findIndex(e => e.id === eventId);
            if (index !== -1) {
                app.state.events.splice(index, 1);
                app.render();
                return true;
            }
            return false;
        },
        
        // 设置当前日期
        setCurrentDate: (date) => {
            app.state.currentDate = new Date(date);
            app.render();
        },
        
        // 设置视图
        setView: (view) => {
            if (['month', 'week', 'day'].includes(view)) {
                app.setView(view);
            }
        },
        
        // 获取当前状态
        getState: () => ({
            currentDate: app.state.currentDate,
            view: app.state.view,
            eventsCount: app.state.events.length
        })
    };
    
    console.log('智能日历应用已初始化');
    console.log('Unity接口已暴露到 window.CalendarAPI');
});
