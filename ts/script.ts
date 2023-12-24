type Interval = 'once' | 'day' | 'week' | 'month' | 'year' | number;

class Task {
    title: string;
    interval: Interval;
    lastEvent: Date;

    constructor(title: string, interval: number, lastEvent: Date) {
        this.title = title;
        this.interval = interval;
        this.lastEvent = lastEvent;
    }

    nextEvent(): Date {
        const nextEvent = new Date(this.lastEvent);
        switch (this.interval) {
            case 'once': break;
            case 'day': nextEvent.setDate(this.lastEvent.getDate() + 1); break;
            case 'week': nextEvent.setDate(this.lastEvent.getDate() + 7); break;
            case 'month': nextEvent.setMonth(this.lastEvent.getMonth() + 1); break;
            case 'year': nextEvent.setFullYear(this.lastEvent.getFullYear() + 1); break;
            default: nextEvent.setDate(this.lastEvent.getDate() + this.interval); break;
        }
        return nextEvent;
    }

    intervalText(): string {
        switch (this.interval) {
            case 'once': return 'once'; break;
            case 'day': return 'every day'; break;
            case 'week': return 'every week'; break;
            case 'month': return 'every month'; break;
            case 'year': return 'every year'; break;
            default: return 'every ' + this.interval + ' days'; break;
        }
    }

    build(): HTMLElement {
        let task = this;
        let classes = 'task';
        const nextEvent = this.nextEvent();
        let nextEventString = nextEvent.toLocaleDateString();
        const days = daysBetween(new Date(), nextEvent);
        if (days == 0) {
            nextEventString = 'today';
            classes += ' today';
        }
        if (days < 0)
            classes += ' expired';

        if (days == 1)
            nextEventString = 'tomorrow'

        if (days == -1)
            nextEventString = 'yesterday'

        return create('div', {
            'class': classes,
            '@click': () => {
                openDialogStatusTask(task);
            }
        }, [
            create('span', { 'class': 'title' }, this.title),
            create('span', { 'class': 'interval' }, this.intervalText()),
            create('span', { 'class': 'event' }, nextEventString)
        ]);
    }

    encode(): Object {
        return {
            title: this.title,
            interval: this.interval,
            lastEvent: this.lastEvent.getTime()
        };
    }

    static decode(object: { title: string, interval: number, lastEvent: number }): Task {
        return new Task(object.title, object.interval, new Date(object.lastEvent));
    }
}

function daysBetween(date1: Date, date2: Date): number {
    date1.setHours(0, 0, 0, 0);
    date2.setHours(0, 0, 0, 0);
    return Math.round((date2.getTime() - date1.getTime()) / (1000 * 3600 * 24));
}

const tasks = [];

function saveTasksToStorage(): void {
    localStorage.setItem('tasks', JSON.stringify(tasks.map(task => task.encode())));
}

function loadTasksFromStorage(): void {
    tasks.length = 0;
    try {
        const data = JSON.parse(localStorage.getItem('tasks'));
        for (const object of data)
            tasks.push(Task.decode(object));
    }
    catch (error) { }
}

function updateTasks() {
    tasks.sort((a, b) => a.nextEvent().getTime() - b.nextEvent().getTime());

    const div = $('tasks');
    clear(div);
    for (const task of tasks)
        div.append(task.build());
    saveTasksToStorage();
}

function removeDialogIfClickBackdrop(dialog: HTMLDialogElement, event: MouseEvent, callback: Function = null): void {
    const rect = dialog.getBoundingClientRect();
    const isDialog = (rect.top <= event.clientY && event.clientY <= rect.top + rect.height && rect.left <= event.clientX && event.clientX <= rect.left + rect.width);
    if (!isDialog) {
        dialog.remove();
        callback?.();
    }
}

function openDialogStatusTask(task: Task): void {
    const dialog = create('dialog', { '@click': (event: MouseEvent) => removeDialogIfClickBackdrop(dialog, event) }, [
        create('span', { 'class': 'title' }, task.title),
        create('div', { 'class': 'row' }, [
            create('span', { 'class': 'interval' }, task.intervalText()),
            create('span', { 'class': 'event' }, task.lastEvent.toLocaleDateString())
        ]),
        create('div', { 'class': 'column' }, [
            create('button', {
                '@click': () => {
                    task.lastEvent = new Date();
                    updateTasks();
                    dialog.remove();
                }
            }, '🏁'),
            create('button', {
                '@click': () => {
                    dialog.remove();
                    openDialogEditTask(task).then(updateTasks).catch();
                }
            }, '✏️'),
            // create('button', {
            //     '@click': () => {
            //         dialog.remove();
            //     }
            // }, 'cancel'),
        ])
    ]) as HTMLDialogElement;
    document.body.append(dialog);
    dialog.showModal();
}

function openDialogEditTask(task: Task): Promise<Task> {
    return new Promise((resolve, reject) => {
        let title = task.title;
        let interval = task.interval;

        function updateSelectInterval() {
            const options = $$('dialog.edit-task .select-interval > div');
            for (const option of options)
                removeClass(option, 'selected');
            let isSelected = false;
            for (const option of options) {
                if (option.innerText == interval || option.innerText == 'every ' + interval) {
                    addClass(option, 'selected');
                    isSelected = true;
                    break;
                }
            }
            if (!isSelected) {
                addClass(options[options.length - 1], 'selected');
            }
        }

        const dialog = create('dialog', { 'class': 'edit-task', '@click': (event: MouseEvent) => removeDialogIfClickBackdrop(dialog, event, reject) }, [
            create('input', {
                'class': 'task-title',
                'type': 'text',
                'placeholder': 'task description',
                'value': title,
                '@change': function () {
                    title = this.value;
                }
            }),
            create('div', { 'class': 'select-interval' }, [
                create('div', { '@click': () => { interval = 'once'; updateSelectInterval(); } }, 'once'),
                create('div', { '@click': () => { interval = 'day'; updateSelectInterval(); } }, 'every day'),
                create('div', { '@click': () => { interval = 'week'; updateSelectInterval(); } }, 'every week'),
                create('div', { '@click': () => { interval = 'month'; updateSelectInterval(); } }, 'every month'),
                create('div', { '@click': () => { interval = 'year'; updateSelectInterval(); } }, 'every year'),
                create('div', { '@click': () => { interval = parseInt(($$('.task-interval')[0] as HTMLInputElement).value); updateSelectInterval(); } }, [
                    create('span', {}, 'every '), create('input', {
                        'class': 'task-interval',
                        'type': 'number',
                        'value': interval,
                        '@change': function () { interval = parseInt(this.value); }
                    }, ''), create('span', {}, ' days')]),
            ]),
            create('div', { 'class': 'row' }, [
                create('button', {
                    '@click': () => {
                        task.title = title;
                        task.interval = interval;
                        dialog.remove();
                        resolve(task);
                    }
                }, '💾'),
                create('button', {
                    '@click': () => {
                        for (let i = 0; i < tasks.length; ++i) {
                            if (tasks[i] == task) {
                                tasks.splice(i, 1);
                                updateTasks();
                                break;
                            }
                        }
                        dialog.remove();
                        reject();
                    }
                }, '🗑️'),
            ])
        ]) as HTMLDialogElement;

        document.body.append(dialog);
        updateSelectInterval();
        dialog.showModal();
    });
}

function setTheme(theme: 'light' | 'dark') {
    if (theme == null) {
        const storageTheme = localStorage.getItem('theme');
        theme = (storageTheme == 'light' || storageTheme == 'dark') ? storageTheme : 'dark';
    }
    if (theme == 'light') {
        removeClass(document.body, 'dark');
        $('button-theme').innerText = '🌙';
    }
    else {
        addClass(document.body, 'dark');
        $('button-theme').innerText = '☀️';
    }
    localStorage.setItem('theme', theme);
}

function init() {
    setTheme(null);
    loadTasksFromStorage();
    updateTasks();

    onClick($('button-add-task'), () => {
        openDialogEditTask(new Task('', 7, new Date())).then(task => {
            tasks.push(task);
            updateTasks();
        }).catch(() => { });
    });

    onClick($('button-theme'), () => { setTheme(localStorage.getItem('theme') == 'light' ? 'dark' : 'light'); });

    setTimeout(() => document.head.append(create('style', {}, '* { transition: background-color 0.2s, color 0.2s; }')), 100);
}

window.onload = init;

