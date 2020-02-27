/*global Handlebars, Router */

var todoList = document.getElementById('todo-list');
var newTodo = document.getElementById('new-todo');
var toggleAll = document.getElementById('toggle-all');
var footer = document.getElementById('footer');
var main = document.getElementById('main');
var todoTemplate = document.getElementById('todo-template').innerHTML;
var footerTemplate = document.getElementById('footer-template').innerHTML;

Handlebars.registerHelper('eq', function (a, b, options) {
	return a === b ? options.fn(this) : options.inverse(this);
});

var ENTER_KEY = 13;
var ESCAPE_KEY = 27;

var util = {
	uuid: function () {
		/*jshint bitwise:false */
		var i, random;
		var uuid = '';

		for (i = 0; i < 32; i++) {
			random = Math.random() * 16 | 0;
			if (i === 8 || i === 12 || i === 16 || i === 20) {
				uuid += '-';
			}
			uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
		}

		return uuid;
	},
	pluralize: function (count, word) {
		return count === 1 ? word : word + 's';
	},
	store: function (namespace, data) {
		if (arguments.length > 1) {
			return localStorage.setItem(namespace, JSON.stringify(data));
		} else {
			var store = localStorage.getItem(namespace);
			return (store && JSON.parse(store)) || [];
		}
	}
};

var App = {
	init: function () {
		this.todos = util.store('todos-jquery');
		this.todoTemplate = Handlebars.compile(todoTemplate);
		this.footerTemplate = Handlebars.compile(footerTemplate);
		this.bindEvents();

		new Router({
			'/:filter': function (filter) {
				this.filter = filter;
				this.render();
			}.bind(this)
		}).init('/all');
	},
	bindEvents: function () {
		newTodo.addEventListener('keyup', this.create.bind(this));
		toggleAll.addEventListener('change', this.toggleAll.bind(this));
		footer.addEventListener('click', function (e) {
			if (e.target.id === 'clear-completed') {
				App.destroyCompleted.call(App);
			}
		});

		todoList.addEventListener('change', function (e) {
			if (e.target.className === 'toggle') {
				App.toggle.call(App, e);
			}
		});
		todoList.addEventListener('dblclick', function (e) {
			if (e.target.tagName === 'LABEL') {
				App.edit.call(App, e);
			}
		});
		todoList.addEventListener('keyup', function (e) {
			if (e.target.className === 'edit') {
				App.editKeyup.call(App, e);
			}
		});
		todoList.addEventListener('focusout', function (e) {
			if (e.target.className === 'edit') {
				App.update.call(App, e);
			}
		});
		todoList.addEventListener('click', function (e) {
			if (e.target.className === 'destroy') {
				App.destroy.call(App, e);
			}
		});
	},
	render: function () {
		var todos = this.getFilteredTodos();
		todoList.innerHTML = this.todoTemplate(todos);
		if (todos.length === 0) {
			main.style.display = 'none';
		} else {
			main.style.display = 'block';
		}
		toggleAll.checked = this.getActiveTodos().length === 0;
		this.renderFooter();
		newTodo.focus();
		util.store('todos-javascript', this.todos);
	},
	renderFooter: function () {
		var todoCount = this.todos.length;
		var activeTodoCount = this.getActiveTodos().length;
		var template = this.footerTemplate({
			activeTodoCount: activeTodoCount,
			activeTodoWord: util.pluralize(activeTodoCount, 'item'),
			completedTodos: todoCount - activeTodoCount,
			filter: this.filter
		});

		if (todoCount > 0) {
			footer.innerHTML = template;
		}
		if (todoCount > 0) {
			footer.style.display = 'block';
			footer.innerHTML = template;
		} else {
			footer.style.display = 'none';
		}
	},
	toggleAll: function (e) {
		var isChecked = e.target.checked == true;

		this.todos.forEach(function (todo) {
			todo.completed = isChecked;
		});

		this.render();
	},
	getActiveTodos: function () {
		return this.todos.filter(function (todo) {
			return !todo.completed;
		});
	},
	getCompletedTodos: function () {
		return this.todos.filter(function (todo) {
			return todo.completed;
		});
	},
	getFilteredTodos: function () {
		if (this.filter === 'active') {
			return this.getActiveTodos();
		}

		if (this.filter === 'completed') {
			return this.getCompletedTodos();
		}

		return this.todos;
	},
	destroyCompleted: function () {
		this.todos = this.getActiveTodos();
		this.filter = 'all';
		this.render();
	},
	// accepts an element from inside the `.item` div and
	// returns the corresponding index in the `todos` array
	indexFromEl: function (el) {
		var id = el.parentNode.getAttribute('data-id');
		var todos = this.todos;
		var i = todos.length;

		while (i--) {
			if (todos[i].id === id) {
				return i;
			}
		}
	},
	create: function (e) {
		var input = e.target;
		var val = input.value.trim();
		if (e.which !== ENTER_KEY || !val) {
			return;
		}

		this.todos.push({
			id: util.uuid(),
			title: val,
			completed: false
		});

		input.value = '';

		this.render();
	},
	toggle: function (e) {
		var i = this.indexFromEl(e.target.parentNode);
		this.todos[i].completed = !this.todos[i].completed;
		this.render();
	},
	edit: function (e) {
		var input = e.target.parentNode.parentNode;
		input.classList = 'editing';
		input = input.children[1];
		input.focus();

		//input.val($input.val()).focus();
	},
	editKeyup: function (e) {
		if (e.which === ENTER_KEY) {
			e.target.blur();
		}

		if (e.which === ESCAPE_KEY) {
			e.target.parentNode.setAttribute('abort', true);
			e.target.blur();
		}
	},
	update: function (e) {
		var el = e.target;
		var val = el.value.trim();

		if (!val) {
			this.destroy(e);
			return;
		}

		if (el.parentNode.getAttribute('abort')) {
			el.setAttribute('abort', false);
		} else {
			this.todos[this.indexFromEl(el)].title = val;
		}

		this.render();
	},
	destroy: function (e) {
		this.todos.splice(this.indexFromEl(e.target), 1);
		this.render();
	}
};

App.init();