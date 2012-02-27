// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


/**
* Quick template rendering function. For each cell passed to it, check
* to see if the cell's text content is a key in the supplied data array.
* If yes, replace the cell's contents with the corresponding value and
* unhide the cell. If no, then remove the cell's parent (tr) from the
* DOM.
*/
var isEmpty = function(obj) {
		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
				return false;
			}
		}
		return true;
	};

var ImageInfoPlus = function(imageInfo) {
	this.imageInfo = imageInfo;
	this.renderCells = function(cells, data) {
		for (var i = 0; i < cells.length; i++) {
			var cell = cells[i];
			var key = cell.innerText;
			if (data[key]) {
				cell.innerText = data[key];
				cell.parentElement.className = "rendered";
			} 
		}
	};

	/**
	* Resizes the window to the current dimensions of this page's body.
	*/
	this.resizeWindow = function() {
		window.setTimeout(function() {
			chrome.tabs.getCurrent(function (tab) {
				var newHeight = Math.min(document.body.offsetHeight + 140, 700);
				chrome.windows.update(tab.windowId, {
				height: newHeight,
				width: 520
				});
			});
		}, 150);
	};

	/**
	* Called directly by the background page with information about the
	* image. Outputs image data to the DOM.
	*/
	this.renderImageInfo = function(imageinfo) {
		console.log('imageinfo', imageinfo);

		var divloader = document.querySelector('#loader');
		var divoutput = document.querySelector('#output');
		divloader.style.display = "none";
		divoutput.style.display = "block";

		var divinfo = document.querySelector('#info');
		var divexif = document.querySelector('#exif');

		// Render general image data.
		var datacells = divinfo.querySelectorAll('td');
		this.renderCells(datacells, imageinfo);

		// If EXIF data exists, unhide the EXIF table and render.
		var exif = imageinfo.exif;
		if (exif && !isEmpty(exif)) {
			divexif.style.display = 'block';
			var exifcells = divexif.querySelectorAll('td');
			this.renderCells(exifcells, exif);
		}
		
		//Render Colormap button
		var map_trigger = document.getElementById("colormap-link");
		var sect = document.getElementById('color');
		var _this = this;
		map_trigger.addEventListener("click", function(){
			if(!_this.clicked){
				_this.clicked = true;
				sect.className="loading";
				window.setTimeout(function(){
					_this.imageInfo.setColorMap(_this.renderColorMap, _this);
				}, 0)
			}
			
		})
	};


	this.renderColorMap = function(color_map){
		var sect = document.getElementById('color'),
		map = document.getElementById("colormap"),
		fragment = document.createDocumentFragment();
		map.innerHTML = "";
		var color_keys = this.imageInfo.colorIndex;
		
		console.log(color_keys.length);
		color_keys.forEach(function( val, idx, arr ){
			var cell = document.createElement("div");
			cell.className = "cell";
			console.log(val);
			cell.style.backgroundColor = "rgba("+val+")";
			fragment.appendChild(cell);
		})
		map.appendChild(fragment);
		window.setTimeout(function(){
			sect.className = "loaded";
		}, 50);
		this.resizeWindow();
	}
	
	/**
	* Renders a thumbnail view of the image.
	*/
	this.renderThumbnail = function(tags) {
		var thumbnail = document.getElementById("thumbnail");

		var _this = this;
		if(thumbnail){ thumbnail.src = tags.dataURL; }
		
	};

	/**
	* Returns a function which will handle displaying information about the
	* image once the ImageInfo class has finished loading.
	*/
	this.getImageInfoHandler = function(url) {
		var _this = this;
		return function(tags) { //closure
			_this.renderThumbnail(tags);
			_this.renderImageInfo(tags);
			_this.resizeWindow();
		};
	};
	
	this.getInfoEngine = function(){
		return this.imageInfo;
	};
	this.init = function(url){
		this.url = url;
		return this.getImageInfoHandler(url);
	};
	return this;
};
/**
* Load the image in question and display it, along with its metadata.
*/
document.addEventListener("DOMContentLoaded", function () {
	// The URL of the image to load is passed on the URL fragment.
	var imageUrl = window.location.hash.substring(1);
	var info = new ImageInfo();
	window.app = new ImageInfoPlus(info);
	if (imageUrl) {
		// Use the ImageInfo library to load the image and parse it.
		info.loadInfo(
			imageUrl, 
			app.init(imageUrl)
		);
	}
});
