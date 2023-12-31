class Task {
    constructor(title, interval, lastEvent) {
        this.title = title;
        this.interval = interval;
        this.lastEvent = lastEvent;
    }
    nextEvent() {
        const nextEvent = new Date(this.lastEvent);
        switch (this.interval) {
            case 'once': break;
            case 'day':
                nextEvent.setDate(this.lastEvent.getDate() + 1);
                break;
            case 'week':
                nextEvent.setDate(this.lastEvent.getDate() + 7);
                break;
            case 'month':
                nextEvent.setMonth(this.lastEvent.getMonth() + 1);
                break;
            case 'year':
                nextEvent.setFullYear(this.lastEvent.getFullYear() + 1);
                break;
            default:
                nextEvent.setDate(this.lastEvent.getDate() + this.interval);
                break;
        }
        return nextEvent;
    }
    intervalText() {
        switch (this.interval) {
            case 'once':
                return 'once';
                break;
            case 'day':
                return 'every day';
                break;
            case 'week':
                return 'every week';
                break;
            case 'month':
                return 'every month';
                break;
            case 'year':
                return 'every year';
                break;
            default:
                return 'every ' + this.interval + ' days';
                break;
        }
    }
    build() {
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
            nextEventString = 'tomorrow';
        if (days == -1)
            nextEventString = 'yesterday';
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
    encode() {
        return {
            title: this.title,
            interval: this.interval,
            lastEvent: this.lastEvent.getTime()
        };
    }
    static decode(object) {
        return new Task(object.title, object.interval, new Date(object.lastEvent));
    }
}
function daysBetween(date1, date2) {
    date1.setHours(0, 0, 0, 0);
    date2.setHours(0, 0, 0, 0);
    return Math.round((date2.getTime() - date1.getTime()) / (1000 * 3600 * 24));
}
const tasks = [];
function saveTasksToStorage() {
    localStorage.setItem('tasks', JSON.stringify(tasks.map(task => task.encode())));
}
function loadTasksFromStorage() {
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
function removeDialogIfClickBackdrop(dialog, event, callback = null) {
    const rect = dialog.getBoundingClientRect();
    const isDialog = (rect.top <= event.clientY && event.clientY <= rect.top + rect.height && rect.left <= event.clientX && event.clientX <= rect.left + rect.width);
    if (!isDialog) {
        dialog.remove();
        callback === null || callback === void 0 ? void 0 : callback();
    }
}
function openDialogStatusTask(task) {
    const dialog = create('dialog', { '@click': (event) => removeDialogIfClickBackdrop(dialog, event) }, [
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
    ]);
    document.body.append(dialog);
    dialog.showModal();
}
function openDialogEditTask(task) {
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
        const dialog = create('dialog', { 'class': 'edit-task', '@click': (event) => removeDialogIfClickBackdrop(dialog, event, reject) }, [
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
                create('div', { '@click': () => { interval = parseInt($$('.task-interval')[0].value); updateSelectInterval(); } }, [
                    create('span', {}, 'every '), create('input', {
                        'class': 'task-interval',
                        'type': 'number',
                        'value': interval,
                        '@change': function () { interval = parseInt(this.value); }
                    }, ''), create('span', {}, ' days')
                ]),
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
        ]);
        document.body.append(dialog);
        updateSelectInterval();
        dialog.showModal();
    });
}
function setTheme(theme) {
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
function $(id) {
    return document.getElementById(id);
}
function $$(selector) {
    return Array.from(document.querySelectorAll(selector));
}
function create(tag, properties, content) {
    const elem = document.createElement(tag);
    if (properties !== undefined) {
        for (const key in properties) {
            if (key.startsWith('@'))
                elem.addEventListener(key.substring(1), properties[key]);
            else
                elem.setAttribute(key, properties[key]);
        }
    }
    if (content !== undefined) {
        if (typeof (content) === 'string')
            elem.innerHTML = content;
        if (content instanceof HTMLElement)
            elem.append(content);
        if (Array.isArray(content))
            for (const child of content)
                elem.append(child);
    }
    return elem;
}
function clear(elem) {
    elem.innerHTML = '';
}
function onClick(elem, f) {
    elem.addEventListener('click', f);
}
function onMouseDown(elem, f) {
    elem.addEventListener('mousedown', f);
}
function onMouseUp(elem, f) {
    elem.addEventListener('mouseup', f);
}
function onMouseMove(elem, f) {
    elem.addEventListener('mousemove', f);
}
function onWheel(elem, f) {
    elem.addEventListener('wheel', f);
}
function onContextMenu(elem, f) {
    elem.addEventListener('contextmenu', f);
}
function onChange(elem, f) {
    elem.addEventListener('change', f);
}
function onInput(elem, f) {
    elem.addEventListener('input', f);
}
function onRightClick(elem, f) {
    elem.addEventListener('contextmenu', f);
}
function onKeyPress(elem, f) {
    elem.addEventListener('keypress', f);
}
function onKeyDown(elem, f) {
    elem.addEventListener('keydown', f);
}
function onKeyUp(elem, f) {
    elem.addEventListener('keyup', f);
}
function onDrop(elem, f) {
    elem.addEventListener('drop', f);
}
function onDragOver(elem, f) {
    elem.addEventListener('dragover', f);
}
function addClass(elem, c) {
    elem.classList.add(c);
}
function removeClass(elem, c) {
    elem.classList.remove(c);
}
function hasClass(elem, c) {
    return elem.classList.contains(c);
}
function toggleClass(elem, c) {
    hasClass(elem, c) ? removeClass(elem, c) : addClass(elem, c);
}
function setHTML(elem, html) {
    elem.innerHTML = html;
}
function setText(elem, text) {
    elem.innerText = text;
}
function requestGET(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () { resolve(this.responseText); };
        xhr.onerror = reject;
        xhr.open('GET', url);
        xhr.send();
    });
}
function requestPOST(url, data) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () { resolve(this.responseText); };
        xhr.onerror = reject;
        xhr.open('POST', url);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(typeof data === 'string' ? data : JSON.stringify(data));
    });
}
function requestHEAD(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () { resolve(this.status == 200); };
        xhr.onerror = reject;
        xhr.open('HEAD', url);
        xhr.send();
    });
}
function cssVariable(name) {
    return getComputedStyle(document.body).getPropertyValue(name);
}
function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
}
function getCookie(name) {
    const cookies = decodeURIComponent(document.cookie).split(';');
    const needle = `${name}=`;
    for (let c of cookies) {
        while (c.charAt(0) == ' ')
            c = c.substring(1);
        if (c.indexOf(needle) == 0)
            return c.substring(needle.length, c.length);
    }
    return null;
}
