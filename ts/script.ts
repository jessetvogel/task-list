type Interval = 'once' | 'day' | 'week' | 'month' | 'year' | number;

class TodoItem {
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
        let todoItem = this;
        let classes = 'todo-item';
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
                openDialogStatusTodoItem(todoItem);
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

    static decode(object: { title: string, interval: number, lastEvent: number }): TodoItem {
        return new TodoItem(object.title, object.interval, new Date(object.lastEvent));
    }
}

function daysBetween(date1: Date, date2: Date): number {
    date1.setHours(0, 0, 0, 0);
    date2.setHours(0, 0, 0, 0);
    return Math.round((date2.getTime() - date1.getTime()) / (1000 * 3600 * 24));
}

const todoItems = [];

function saveTodoItemsToStorage(): void {
    localStorage.setItem('todo-items', JSON.stringify(todoItems.map(todoItem => todoItem.encode())));
}

function loadTodoItemsFromStorage(): void {
    todoItems.length = 0;
    try {
        const data = JSON.parse(localStorage.getItem('todo-items'));
        for (const object of data)
            todoItems.push(TodoItem.decode(object));
    }
    catch (error) { }
}

function updateTodoItems() {
    todoItems.sort((a, b) => a.nextEvent().getTime() - b.nextEvent().getTime());

    const div = $('todo-items');
    clear(div);
    for (const todoItem of todoItems)
        div.append(todoItem.build());
    saveTodoItemsToStorage();
}

function removeDialogIfClickBackdrop(dialog: HTMLDialogElement, event: MouseEvent, callback: Function = null): void {
    const rect = dialog.getBoundingClientRect();
    const isDialog = (rect.top <= event.clientY && event.clientY <= rect.top + rect.height && rect.left <= event.clientX && event.clientX <= rect.left + rect.width);
    if (!isDialog) {
        dialog.remove();
        callback?.();
    }
}

function openDialogStatusTodoItem(todoItem: TodoItem): void {
    const dialog = create('dialog', { '@click': (event: MouseEvent) => removeDialogIfClickBackdrop(dialog, event) }, [
        create('span', { 'class': 'title' }, todoItem.title),
        create('div', { 'class': 'row' }, [
            create('span', { 'class': 'interval' }, todoItem.intervalText()),
            create('span', { 'class': 'event' }, todoItem.lastEvent.toLocaleDateString())
        ]),
        create('div', { 'class': 'column' }, [
            create('button', {
                '@click': () => {
                    todoItem.lastEvent = new Date();
                    updateTodoItems();
                    dialog.remove();
                }
            }, '🏁'),
            create('button', {
                '@click': () => {
                    dialog.remove();
                    openDialogEditTodoItem(todoItem).then(updateTodoItems).catch();
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

function openDialogEditTodoItem(todoItem: TodoItem): Promise<TodoItem> {
    return new Promise((resolve, reject) => {
        let title = todoItem.title;
        let interval = todoItem.interval;

        function updateSelectInterval() {
            const options = $$('dialog.edit-todo-item .select-interval > div');
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

        const dialog = create('dialog', { 'class': 'edit-todo-item', '@click': (event: MouseEvent) => removeDialogIfClickBackdrop(dialog, event, reject) }, [
            create('input', {
                'class': 'todo-item-title',
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
                create('div', { '@click': () => { interval = parseInt(($$('.todo-item-interval')[0] as HTMLInputElement).value); updateSelectInterval(); } }, [
                    create('span', {}, 'every '), create('input', {
                        'class': 'todo-item-interval',
                        'type': 'number',
                        'value': interval,
                        '@change': function () { interval = parseInt(this.value); }
                    }, ''), create('span', {}, ' days')]),
            ]),
            create('div', { 'class': 'row' }, [
                create('button', {
                    '@click': () => {
                        todoItem.title = title;
                        todoItem.interval = interval;
                        dialog.remove();
                        resolve(todoItem);
                    }
                }, '💾'),
                create('button', {
                    '@click': () => {
                        for (let i = 0; i < todoItems.length; ++i) {
                            if (todoItems[i] == todoItem) {
                                todoItems.splice(i, 1);
                                updateTodoItems();
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
    loadTodoItemsFromStorage();
    updateTodoItems();

    onClick($('button-add-item'), () => {
        openDialogEditTodoItem(new TodoItem('', 7, new Date())).then(todoItem => {
            todoItems.push(todoItem);
            updateTodoItems();
        }).catch(() => { });
    });

    onClick($('button-theme'), () => { setTheme(localStorage.getItem('theme') == 'light' ? 'dark' : 'light'); });

    setTimeout(() => document.head.append(create('style', {}, '* { transition: background-color 0.2s, color 0.2s; }')), 100);
}

window.onload = init;

