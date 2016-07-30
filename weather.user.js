// ==UserScript==
// @id             iitc-plugin-weather
// @name           IITC plugin: Weather Map
// @category       Layer
// @version        0.1.1.20160726.001
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      https://github.com/Hurqalia/weather_map/raw/master/weather.meta.js
// @downloadURL    https://github.com/Hurqalia/weather_map/raw/master/weather.user.js
// @installURL     https://github.com/Hurqalia/weather_map/raw/master/weather.user.js
// @description    [hurqalia22-2016-07-26-001] Weather Map
// @include        https://www.ingress.com/intel*
// @include        http://www.ingress.com/intel*
// @match          https://www.ingress.com/intel*
// @match          http://www.ingress.com/intel*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
	if(typeof window.plugin !== 'function') window.plugin = function() {};
	plugin_info.buildName = 'hurqalia22';
	plugin_info.dateTimeVersion = '20160726.001';
	plugin_info.pluginId = 'weather';

	// PLUGIN START ////////////////////////////////////////////////////////

	// use own namespace for plugin

	window.plugin.weather = function() {};
	window.plugin.weather.prefs_country      = '';
	window.plugin.weather.datas_country      = {};
	window.plugin.weather.datas_counters     = {};
	window.plugin.weather.collected          = 0;
	window.plugin.weather.cells_count        = 0;
	window.plugin.weather.datas_cells_count  = 0;
	window.plugin.weather.load_cells_count   = 0;
	window.plugin.weather.timeline_count     = 0;
	window.plugin.weather.timeline_interval  = 0;
	window.plugin.weather.cp_count           = 0;
	window.plugin.weather.selected_cp        = null;
	window.plugin.weather.in_progress        = false;
	window.plugin.weather.cells_failed       = [];
  	window.plugin.weather.weatherLayer       = null;
	window.plugin.weather.weatherLegendLayer = null;

	// preferences

	window.plugin.weather.preferences =  {
		KEYS_PREFS_COUNTRY  : 'plugin-weather-pref-country',
		KEYS_DATAS_COUNTRY  : 'plugin-weather-datas-country',
		URL_LIST_COUNTRY    : 'https://raw.githubusercontent.com/Hurqalia/weather_map/master/countries.prefs',
		URL_DATAS_COUNTRY   : 'https://raw.githubusercontent.com/Hurqalia/weather_map/master/countries/',
		is_country_selected : false,
		is_country_loaded   : false,
		current_key         : '',
		current_url         : '',
		result              : null,
		options_list        : [],
		country_datas       : {},
		checkPrefs: function() {
			var t = this;
			t.is_country_selected = false;
			t.is_country_loaded   = false;

			t.loadPrefsCountry();

			return (t.is_country_selected && t.is_country_loaded) ? true : false;
		},
		loadPrefsCountry: function() {
			var t = this;
			t.current_key = t.KEYS_PREFS_COUNTRY;
			var prefs = t.loadStorage();

			if (prefs !== null && prefs !== '' && prefs !== 'undefined') {
				window.plugin.weather.prefs_country = prefs;
				t.is_country_selected = true;
				t.loadDatasCountry();
			}
		},
		savePrefsCountry: function(tld) {
			var t = this;
			t.current_key = t.KEYS_PREFS_COUNTRY;
			t.saveStorage(tld);
		},
		loadDatasCountry: function() {
			var t = this;
			t.current_key = t.KEYS_DATAS_COUNTRY;

			var prefs = t.loadStorage();
			if (prefs === null || prefs === '' || prefs === 'undefined') {
				if(! t.getDatasCountry()) {
					return;
				}
				t.saveDatasCountry(t.country_datas);
			} else {
					try {
						t.country_datas = JSON.parse(prefs);
					} catch(err) {
						alert('Sorry, cannot get country datas from server, try later');
					}
			}

			window.plugin.weather.datas_country = t.country_datas;
			t.is_country_loaded = true;
		},
		saveDatasCountry: function(datas) {
			var t = this;
			t.current_key = t.KEYS_DATAS_COUNTRY;
			t.saveStorage(JSON.stringify(datas));
		},
		loadStorage: function() {
			var t = this;
			if (localStorage[t.current_key]) {
				return localStorage[t.current_key];
			}
			return null;
		},
		saveStorage: function(datas) {
			var t = this;
			localStorage[t.current_key] = datas;
		},
		getListCountry: function() {
			var t = this;
			t.current_url  = t.URL_LIST_COUNTRY;
			t.options_list = [];
			t.getDatas(
				function(d) {
					try {
						t.options_list = JSON.parse(d);
					} catch(err) {
						alert('Sorry, cannot get country list from server, try later');
					}
				},
				function(r) {
					alert('Sorry, cannot get country list from server, try later');
				}
			);
			return (t.options_list.length > 0) ? true : false;
		},
		getDatasCountry: function() {
			var t = this;
			t.current_url       = t.URL_DATAS_COUNTRY + window.plugin.weather.prefs_country + '.json';
			t.country_datas     = {};
			t.is_country_loaded = true;
			t.getDatas(
				function(d) {
					try {
						t.country_datas = JSON.parse(d);
						t.is_country_loaded = true;
					} catch(err) {
						alert('Sorry, cannot get country datas from server, try later');
					}
				},
				function(r) {
					alert('Sorry, cannot get country datas from server, try later');
					return;
				}
			);
			return (Object.keys(t.country_datas).length > 0) ? true : false;
		},
		getDatas: function( callbackSuccess, callbackError) {
			var t = this;
			t.result = $.ajax({
				url     : t.current_url,
				type    : 'GET',
				async   : false,
				success : function(s) {
					callbackSuccess(s);
				},
				error   : function(e) {
					callbackError(e);
				},
				beforeSend: function(r) {
				}
			});
		},
		openDialog: function() {
			var t = this;

			if (! t.getListCountry()) {
				return false;
			}

			var content = '<p>';

			if (window.plugin.weather.prefs_country === '') {
				content += 'First time, you need to configure Weather map.<br/>';
			}
			content += 'You have to select which country you want to see.<br/>';
			content += '</p>';

			var select_options = '<option value="none">Choose your country</option>';

			$.each(t.options_list, function(i, record) {
				var tld = Object.keys(record);
				var selected = (window.plugin.weather.prefs_country == tld) ? 'selected' : '';
				select_options += '<option value="' + tld + '" ' + selected +' >' + record[tld] + '</option>';
			});

			content += '<select id="country_selector">' + select_options + '</select>';

			dialog({
				width:'400px',
				html: content,
				id: 'plugin-weather-country-box',
				dialogClass: '',
				title: 'Weather Map Configurator',
				buttons:{
					'OK' : function() {
						if ( $('#country_selector').val() === 'none') {
							return false;
						}

						window.plugin.weather.prefs_country = $('#country_selector').val();

						if (! t.getDatasCountry()) {
							$(this).dialog('close');
							return;
						}

						window.plugin.weather.datas_country = t.country_datas;

						t.savePrefsCountry(window.plugin.weather.prefs_country);
						t.saveDatasCountry(window.plugin.weather.datas_country);

						$(this).dialog('close');
					},
					'Cancel' : function() {
						$(this).dialog('close');
					}
				}
           		});
		}
	};

	// draw cell

	window.plugin.weather.drawCell = function(r, corners, center, name, history) {

		if (typeof r !== "undefined" && r !== null) {
			var game_score = [];
			if (history) {
				game_score[0] = r.scoreHistory[window.plugin.weather.selected_cp][1];
				game_score[1] = r.scoreHistory[window.plugin.weather.selected_cp][2];
			} else {
				game_score = r.result.gameScore;
			}

			var color  = '';
			if (parseInt(game_score[0]) > parseInt(game_score[1])) {
				color = 'green';
				window.plugin.weather.datas_counters.teams.ENL.cell_count++;
				window.plugin.weather.datas_counters.teams.ENL.total += parseInt(game_score[0]);
			} else {
				color = 'blue';
				window.plugin.weather.datas_counters.teams.RES.cell_count++;
				window.plugin.weather.datas_counters.teams.RES.total += parseInt(game_score[1]);
			}

			var frcell = L.geodesicPolyline([corners[0],corners[1],corners[2], corners[3]], {fill: true, color: color, opacity: 0.8, weight: 1, clickable: false, data : name });

			window.plugin.weather.weatherLayer.addLayer(frcell);

			var content = name + "<br/>RES : " + game_score[1] + "<br/>ENL : " + game_score[0];

			var marker = L.marker(center, {
				icon: L.divIcon({
					className: 'cell-content-name',
					iconAnchor: [100,10],
					iconSize: [200,10],
					html: content,
				})
			});

			window.plugin.weather.weatherLegendLayer.addLayer(marker);
			window.plugin.weather.drawCounter();
		}

		if ((window.plugin.weather.collected + window.plugin.weather.cells_failed.length) == window.plugin.weather.cells_count) {
			window.plugin.weather.drawSummary();
			window.plugin.weather.in_progress = false;
		}
	};

	// draw summary

	window.plugin.weather.drawSummary = function() {
		var best      = (parseInt(window.plugin.weather.datas_counters.teams.ENL.cell_count) > parseInt(window.plugin.weather.datas_counters.teams.RES.cell_count)) ? parseInt(window.plugin.weather.datas_counters.teams.ENL.cell_count) : parseInt(window.plugin.weather.datas_counters.teams.RES.cell_count);
		var best_cell = (parseInt(window.plugin.weather.datas_counters.teams.ENL.cell_count) > parseInt(window.plugin.weather.datas_counters.teams.RES.cell_count)) ? 'ENL' : 'RES';

		var perc   =  Math.round(((best * 100) / window.plugin.weather.datas_cells_count) * 100) / 100;

		var summbox = 'Weather Map Summary' ;
		summbox += '<table>' + 
			'<tr><td>Country Cells count</td><td> : ' + window.plugin.weather.datas_cells_count + '</td></tr>' +
			'<tr><td>ENL Cells count</td><td> : ' + window.plugin.weather.datas_counters.teams.ENL.cell_count + '</td></tr>' +
			'<tr><td>RES Cells count</td><td> : ' + window.plugin.weather.datas_counters.teams.RES.cell_count + '</td></tr>' +
			'<tr><td colspan=2>' + perc + '% of territory occupied by ' + best_cell + '</td></tr>' +
			'<tr><td>ENL Total MU</td><td> : ' + window.plugin.weather.datas_counters.teams.ENL.total + ' MU</td></tr>' +
			'<tr><td>RES Total MU</td><td> : ' + window.plugin.weather.datas_counters.teams.RES.total + ' MU</td></tr>' +
			'</table>';

		if (window.plugin.weather.cells_failed.length > 0) {
			summbox += window.plugin.weather.cells_failed.length + " cell" + ((window.plugin.weather.cells_failed.length > 1) ? 's' : '') + " request failed ";
			summbox += '<button class="weather-button" onclick="window.plugin.weather.retry();">Retry</button>';
		} else {
			var first_key = Object.keys(window.plugin.weather.datas_counters.datas)[0];
			var cp_index  = window.plugin.weather.datas_counters.datas[first_key].scoreHistory.length;
			if (cp_index > 1) {
				summbox += '<p>Show another checkpoint : ';
				summbox += '<select id="cp_selector">';
				for (var i=0; i < cp_index; i++) { 
					var label     = cp_index - i;
					var selected  = ((window.plugin.weather.selected_cp !== null) && (window.plugin.weather.selected_cp == i)) ? 'selected' : '';
					summbox += '<option value="' + i + '" ' + selected + '> CP ' + label + ' </option>';
				}
				summbox += '</select><br />';
				summbox += '<button class="weather-button" onclick="window.plugin.weather.selectCheckPoint();">Show CP</button> ';
				summbox += '<button class="weather-button" onclick="window.plugin.weather.queueTimer();">CP Timeline</button>';
				summbox += '</p>';
			}
		}

		$("#sumbox-weather").empty();
		$('#sumbox-weather').html(summbox);
	};

	// check points

	window.plugin.weather.selectCheckPoint = function() {
		window.plugin.weather.selected_cp = $('#cp_selector').val();
		window.plugin.weather.drawCheckPoint();
	};

	window.plugin.weather.queueTimer = function() {
		if (window.plugin.weather.in_progress) {
			return false;
		}
		var first_key                           = Object.keys(window.plugin.weather.datas_counters.datas)[0];
		window.plugin.weather.cp_count          = window.plugin.weather.datas_counters.datas[first_key].scoreHistory.length;
		window.plugin.weather.timeline_count    = window.plugin.weather.cp_count;
		window.plugin.weather.timeline_interval = setInterval(window.plugin.weather.animeCheckPoint, 1000);
		window.plugin.weather.initCountDown();
	};

	window.plugin.weather.animeCheckPoint = function() {
		if (window.plugin.weather.in_progress) {
			window.plugin.weather.removeCountDown();
			return false;
		}

		if (window.plugin.weather.timeline_count <= 0) {
			clearInterval(window.plugin.weather.timeline_interval);
			window.plugin.weather.removeCountDown();
			return;
		}

		window.plugin.weather.selected_cp = (window.plugin.weather.timeline_count - 1);
		window.plugin.weather.setCountDown(parseInt(window.plugin.weather.cp_count ) - parseInt(window.plugin.weather.selected_cp));
		window.plugin.weather.drawCheckPoint();
		window.plugin.weather.timeline_count--;
	};

	window.plugin.weather.drawCheckPoint = function(cp_id) {
		if (window.plugin.weather.in_progress) {
			return false;
		}

		window.plugin.weather.in_progress      = true;
		window.plugin.weather.cells_failed     = [];
		window.plugin.weather.collected        = 0;
		window.plugin.weather.load_cells_count = 0;
		window.plugin.weather.datas_counters.teams = { 'ENL' : { cell_count : 0 , total : 0 }, 'RES' : {cell_count : 0 , total : 0} };

		window.plugin.weather.weatherLayer.clearLayers();
		window.plugin.weather.weatherLegendLayer.clearLayers();

		$("#sumbox-weather").empty();

		$.each(window.plugin.weather.datas_country, function(name, datas) {
			window.plugin.weather.collected++;
			window.plugin.weather.load_cells_count++;
			var result  = window.plugin.weather.datas_counters.datas[name];
			var corners = window.plugin.weather.datas_counters.corners[name];
			var center  = window.plugin.weather.datas_counters.center[name];
			window.plugin.weather.drawCell(result, corners, center, name, true);
		});

		addLayerGroup('Weather Map', window.plugin.weather.weatherLayer, true);
		addLayerGroup('Legend Weather Map', window.plugin.weather.weatherLegendLayer, true);
	};

	// check point countdown
	
	window.plugin.weather.initCountDown = function() {
		var dashboard = document.getElementById('dashboard');
		var counter_div = document.createElement('div');
		counter_div.setAttribute('style', "font-size:60px; position: fixed; left: 50px; top: 50px; width:200px; height: 70px; z-index: auto; opacity:0.7; pointer-events: none; background-color:white; color:gold; text-align:center; vertical-align:center;");
		counter_div.setAttribute('class', 'weather-countdown');
		dashboard.appendChild(counter_div);
	};

	window.plugin.weather.setCountDown = function(s) {
		$('.weather-countdown').html('CP ' + s);
	};

	window.plugin.weather.removeCountDown = function() {
		$('.weather-countdown').remove();
	};

	// progress counter

	window.plugin.weather.drawCounter = function() {
		$('#sumbox-weather').html(window.plugin.weather.load_cells_count + '/' + window.plugin.weather.datas_cells_count + ' cells loaded, in progress...');
	};

	// crappy resize font with zoom

	window.plugin.weather.update = function() {
		var zoom_level = map.getZoom();
		var font_size  = window.plugin.weather.setFontSize();

		if (zoom_level > 6) {
			if ($(".cell-content-name").css('font-size') != '12px') {
				$(".cell-content-name").css('font-size', '12px');
			}
		} else {
			$(".cell-content-name").css('font-size', font_size);
		}
	};

	// font size

	window.plugin.weather.setFontSize = function() {
		var zoom_level = map.getZoom();

		if (zoom_level > 6) {
			return '12px';
		} else if (zoom_level === 6) {
			return '9px';
		} else if (zoom_level <= 3) {
			return '1px';
		} else if (zoom_level <= 5) {
			return '3px';
		}
	};

	// get cell center coords

	window.plugin.weather.boxCenter = function(coords) {
		var sx = sy = sz = 0;

		for (var i=0; i<coords.length; i++) {
			var _lat = coords[i].lat * Math.PI / 180;
			var _lng = coords[i].lng * Math.PI / 180;
			sx += Math.cos(_lat) * Math.cos(_lng);
			sy += Math.cos(_lat) * Math.sin(_lng);
			sz += Math.sin(_lat);
		}

		var ax = sx / coords.length;
		var ay = sy / coords.length;
		var az = sz / coords.length;

		var rlng = Math.atan2(ay, ax);
		var rhyp = Math.sqrt(ax * ax + ay * ay);
		var rlat = Math.atan2(az, rhyp);

		var r = {
			'lat' : (rlat * 180 / Math.PI ),
			'lng' : (rlng * 180 / Math.PI)
		};

		return r;
	};

	// process

	window.plugin.weather.process = function() {
		if (window.plugin.weather.in_progress) {
			return false;
		}

		if (! window.plugin.weather.preferences.checkPrefs()) {
			alert('Please configure your country');
			return false;
		}

		window.plugin.weather.in_progress      = true;
		window.plugin.weather.cells_failed     = [];
		window.plugin.weather.collected        = 0;
		window.plugin.weather.load_cells_count = 0;
		window.plugin.weather.datas_counters   = { 'teams' : { 'ENL' : { cell_count : 0 , total : 0 }, 'RES' : {cell_count : 0 , total : 0} }, datas : {}, corners : {}, center : {} };

		window.plugin.weather.weatherLayer.clearLayers();
		window.plugin.weather.weatherLegendLayer.clearLayers();

		$("#sumbox-weather").empty();

		window.plugin.weather.datas_cells_count = Object.keys(window.plugin.weather.datas_country).length;
		window.plugin.weather.cells_count       = window.plugin.weather.datas_cells_count;

		$.each(window.plugin.weather.datas_country, function(data_key, datas) {
			window.plugin.weather.getScore(datas, true);
		});

		addLayerGroup('Weather Map', window.plugin.weather.weatherLayer, true);
		addLayerGroup('Legend Weather Map', window.plugin.weather.weatherLegendLayer, true);
	};

	// retry process for failed cells

	window.plugin.weather.retry = function() {
		if (window.plugin.weather.in_progress) {
			return false;
		}

		if (window.plugin.weather.cells_failed.length === 0) {
			window.plugin.weather.in_progress = false;
			window.plugin.weather.collected   = 0;
			return;
		}

		window.plugin.weather.in_progress  = true;

		var fail_cells  = window.plugin.weather.cells_failed;

		$.each(fail_cells, function(rkey, rname) {
			window.plugin.weather.getScore(window.plugin.weather.datas_country[rname], true);
		});
	};

	// get score

	window.plugin.weather.getScore = function(datas, loop) {
		var corners = datas.corners;
		var name    = datas.name;
		var center  = window.plugin.weather.boxCenter(corners);
		var latE6   = Math.round(center.lat*1E6);
		var lngE6   = Math.round(center.lng*1E6);

		window.postAjax('getRegionScoreDetails',
				{ latE6:latE6, lngE6:lngE6 },
				function(result) {
					if (Object.keys(result).length === 0) {
						if (window.plugin.weather.cells_failed.indexOf(name) === -1) {
							window.plugin.weather.cells_failed.push(name);
						}
						return;
					}
					if (window.plugin.weather.cells_failed.indexOf(name) !== -1) {
						window.plugin.weather.cells_failed.splice(window.plugin.weather.cells_failed.indexOf(name), 1);
					}
					window.plugin.weather.collected++;
			        	window.plugin.weather.load_cells_count++;
			        	window.plugin.weather.datas_counters.datas[name]   = result.result;
			        	window.plugin.weather.datas_counters.corners[name] = corners;
			        	window.plugin.weather.datas_counters.center[name]   = center;
					window.plugin.weather.drawCell(result, corners, center, name, false);
				},
				function() {
					if (window.plugin.weather.cells_failed.indexOf(name) === -1) {
						window.plugin.weather.cells_failed.push(name);
					}
					if (! loop) {
						window.plugin.weather.collected++;
						window.plugin.weather.drawCell(null, '', '', name, false);
						return false;
					}
					window.plugin.weather.getScore(datas, false);
				}
		);
	};

	// init setup

	window.plugin.weather.setup = function() {
		console.log('* WEATHER MAP : loaded *');
		window.plugin.weather.addButtons();
		 $("<style>")
		    .prop("type", "text/css")
		    .html(".cell-content-name { font-size: 12px; font-weight: bold; color: gold; opacity: 0.7; text-align: center; text-shadow: -1px -1px #000, 1px -1px #000, -1px 1px #000, 1px 1px #000, 0 0 2px #000; pointer-events: none; } .weather-button { padding: 2px; min-width: 40px; color: #FFCE00; border: 1px solid #FFCE00; background-color: rgba(8, 48, 78, 0.9); }")
		  .appendTo("head");
		$('#sidebar').append('<div id="sumbox-weather" style="padding:4px; color: rgb(255, 206, 0); font-size:10pt;"></div>');

	 	window.plugin.weather.weatherLayer       = L.layerGroup();
		window.plugin.weather.weatherLegendLayer = L.layerGroup();

		if (! window.plugin.weather.preferences.checkPrefs()) {
			window.plugin.weather.preferences.openDialog();
		}

		map.on('moveend', window.plugin.weather.update);
	};

	// toolbox menu

	window.plugin.weather.addButtons = function() {
		$('#toolbox').append(' <a onclick="window.plugin.weather.process()" title="Display weather map">Weather Map</a> <a onclick="window.plugin.weather.preferences.openDialog()" title="Weather map Configurator">Weather Map Config</a>');
	};

	// plugin setup

	var setup =  window.plugin.weather.setup;

	setup.info = plugin_info;
	if(!window.bootPlugins) window.bootPlugins = [];
	window.bootPlugins.push(setup);
	if(window.iitcLoaded && typeof setup === 'function') {
		setup();
	}

	// PLUGIN END /////////////////////////////////////////////////////////
} // WRAPPER END ////////////////////////////////////////////////////////

var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);
