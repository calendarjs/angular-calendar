Date.prototype.getWeek = function() {
	var onejan = new Date(this.getFullYear(), 0, 1);
	return Math.ceil((((this.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
};
Date.prototype.getMonthFormatted = function() {
	var month = this.getMonth() + 1;
	return month < 10 ? '0' + month : month;
};
Date.prototype.getDateFormatted = function() {
	var date = this.getDate();
	return date < 10 ? '0' + date : date;
};


angular
	.module('ngCalendar', [])
	.directive('calendar', function($http, $log, $window, $timeout) {

		var linker = function(scope, element, attrs) {
			var config = {
				tmplPostfix: '',
				position: {
					today: new Date(),
					start: new Date(),
					end: new Date(),
					current: {
						date: new Date()
					}
				}
			};

			config.maxWidthSm = parseInt(scope.maxWidthSm || '300');
			config.maxWidthMd = parseInt(scope.maxWidthMd || '1000');

			scope.firstDay = scope.firstDay || 'monday';
			scope.startWith = scope.startWith || 'now';
			scope.tmplPrefix = scope.tmplPrefix || 'tmpl-';


			changeTmplPostfix();
			getDefaultDate();
			changeView();

			scope.$on('cal.nav', function(e, where) {
				if(angular.isObject(where)) {
					if(where.id != attrs.id) {
						return;
					}
					where = where.data;
				}

				if(where == 'today') {
					config.position.current.date.setTime(new Date().getTime());
				} else {
					var offset = where == 'next' ? +1 : -1;
					switch(scope.view) {
						case 'years':
							config.position.current.date.setFullYear(config.position.current.date.getFullYear() + (offset * 12));
							break;
						case 'month':
							config.position.current.date.setMonth(config.position.current.date.getMonth() + offset);
							break;
						case 'week':
							config.position.current.date.setDate(config.position.current.date.getDate() + (offset * 7));
							break;
						case 'day':
							config.position.current.date.setDate(config.position.current.date.getDate() + offset);
							break;
						case 'list':
						case 'year':
							config.position.current.date.setFullYear(config.position.current.date.getFullYear() + offset);
							break;
					}
				}

				changeView();
			});

			scope.$on('cal.setfirstday', function(e, day) {
				if(angular.isObject(day)) {
					if(day.id != attrs.id) {
						return;
					}
					day = day.data;
				}

				if(angular.isString(day) && scope.firstDay != day && (day == 'monday' || day == 'sunday')) {
					scope.firstDay = day;
					changeView();
				}
			});

			scope.$on('cal.navdate', function(e, date) {
				if(angular.isObject(date)) {
					if(date.id != attrs.id) {
						return;
					}
					date = date.data;
				}

				if(angular.isString(date)) {
					scope.startWith = date;
					getDefaultDate();
					changeView();
				}
			});

			angular
				.element($window)
				.bind("resize", function(e) {
					changeTmplPostfix();
					scope.$apply();
				});

			scope.$watch('view', changeView);
			scope.$watch('tmplPrefix', setTemplate);
			scope.$watch(function() {
				return config.tmplPostfix;
			}, setTemplate);

			scope.viewMonth = function(month) {
				scope.view = 'month';
			}

			scope.setClass = function() {
				return 'cal-container' + config.tmplPostfix;
			}

			function changeView() {
				parseCurrentdate();
				initPosition();
				events();
				setTemplate();
			}

			function getDefaultDate() {

				var date = [];

				if(scope.startWith.match(/^[0-9]{2}-[0-9]{2}-[0-9]{4}$/g)) {
					date = scope.startWith.split('-');
				}

				if(scope.startWith.match(/^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/g)) {
					date = scope.startWith.split('/');
				}

				if(scope.startWith.match(/^[0-9]{2}\.[0-9]{2}\.[0-9]{4}$/g)) {
					date = scope.startWith.split('.');
				}

				if(date.length == 3) {
					config.position.current.date.setYear(date[2]);
					config.position.current.date.setMonth(date[1] - 1);
					config.position.current.date.setDate(date[0]);
				}

				if(scope.startWith.match(/^[0-9]{10}$/g)) {
					config.position.current.date.setTime(parseInt(scope.startWith + '000'));
				}

				if(scope.startWith.match(/^[0-9]{13}$/g)) {
					config.position.current.date.setTime(parseInt(scope.startWith));
				}

				if(scope.startWith == 'now') {
					config.position.current.date.setTime(new Date().getTime());
				}
			}

			function parseCurrentdate() {
				config.position.current.year = config.position.current.date.getFullYear();
				config.position.current.month = config.position.current.date.getMonth();
				config.position.current.day = config.position.current.date.getDate();
			}

			function initPosition() {
				var current = config.position.current;

				switch(scope.view) {
					case 'years':
						config.position.start.setTime(new Date(current.year - 6, 0, 1).getTime());
						config.position.end.setTime(new Date(current.year + 6, 0, 1).getTime());
						break;
					case 'month':
						config.position.start.setTime(new Date(current.year, current.month, 1).getTime());
						config.position.end.setTime(new Date(current.year, current.month + 1, 1).getTime());
						break;
					case 'week':
						var first = (scope.firstDay == 'monday') ?
							current.date.getDate() - ((current.date.getDay() + 6) % 7) :
							current.date.getDate() - current.date.getDay();

						config.position.start.setTime(new Date(current.year, current.month, first).getTime());
						config.position.end.setTime(new Date(current.year, current.month, first + 7).getTime());
						break;
					case 'day':
						config.position.start.setTime(new Date(current.year, current.month, current.day).getTime());
						config.position.end.setTime(new Date(current.year, current.month, current.day + 1).getTime());
						break;
					case 'list':
					case 'year':
						config.position.start.setTime(new Date(current.year, 0, 1).getTime());
						config.position.end.setTime(new Date(current.year + 1, 0, 1).getTime());
						break;
				}
			}

			function changeTmplPostfix() {
				var width = parseInt(element[0].offsetWidth);
				if(width > config.maxWidthMd) {
					config.tmplPostfix = '-lg';
				} else if(width > config.maxWidthSm) {
					config.tmplPostfix = '-md';
				} else {
					config.tmplPostfix = '-sm';
				}
			}

			function setTemplate() {
				if(angular.isUndefined(scope.view) || angular.isUndefined(config.tmplPostfix)) {
					return;
				}

				if(scope.view != 'years' && scope.view != 'month'
					&& scope.view != 'week' && scope.view != 'day'
					&& scope.view != 'list' && scope.view != 'year') {
					$log.warn('Calendar: Set default month view because view not found:', scope.view);
					scope.view = 'month';
				}

				var tmpl = scope.tmplRoot + scope.tmplPrefix + scope.view + config.tmplPostfix + '.html';
				if(tmpl != scope.template) {
					element.children(0).html('loading...');
					scope.template = tmpl;
				}
			}

			function events() {
				if(angular.isDefined(scope.src)) {
					scope.events = scope.src;
				} else if(angular.isDefined(scope.srcFunc)) {
					scope.events = scope.srcFunc();
				} else if(angular.isDefined(scope.srcUrl)) {
					$http.get(scope.srcUrl, {
						satrt: 1,
						end: 2
					}).success(function(data) {
						if(angular.isArray(data.result)) {
							scope.events = data.result;
						}
					})
				}
				if(!angular.isArray(scope.events)) {
					scope.events = [];
				}
			}

		};


		return {
			restrict: "A",
			//replace: true,
			link: linker,
			template: '<div class="cal-container" ng-class="setClass()" ng-include="template"></div>',
			scope: {
				view: '=?calView',
				nav: '=?calNav',
				tmplRoot: '=?calTmplRoot',
				tmplPrefix: '=?calTmplPrefix',
				startWith: '=?calStartWith',
				firstDay: '=?calFirstDay',

				src: '=calSrc',
				srcFunc: '&calSrcFunc',
				srcUrl: '@calSrcUrl',

				maxWidthSm: '@calMaxWidthSm',
				maxWidthMd: '@calMaxWidthMd'
			}
		};
	});