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
	
var getParams = function(url){
	var param = window.location.href.split('#')[0].split("?");
	var paramComponents = [];
	var params = {};
	if(param.length === 2){
		paramComponents = param[1].split("&")
		paramComponents.forEach(function(val,idx){
			var pair = val.split("=");
			if(pair.length == 2){
				params[pair[0]] = pair[1];
			}
		})
	}
	return params;
}
Element.prototype.delegate = function (eventType,  delegateTo, callbackFn) {
	var elementToBind = this ;
    elementToBind.addEventListener(eventType, function(evt){
      // again this is very primitive and lets you 
      // to operate only on tag selectors
      if(evt.target.nodeName.toLowerCase() === delegateTo.toLowerCase()) {
        // call callbackFn in context of evt.target with proper arguments
        callbackFn.call(evt.target, evt);
      }
    }, false);
}
var ImageInfoPlus = function(imageInfo, options) {
	this.imageInfo = imageInfo;
	this.cover = null;
	this.options = {
		useWorkerRenderer:true
	};
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
				}, 0);
				var info = document.getElementById("output");
				output.className = "colormapper";
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
			//console.log(val);
			var c = "rgba("+val+")"
			cell.style.backgroundColor = c;
			cell.title = val;
			
			fragment.appendChild(cell);
		})
		map.appendChild(fragment);
		var _this = this;
		map.delegate("click", "div", function(evt){
			var key = this.title;
			var indexes = _this.imageInfo.colorMap[key];
			_this.renderOverlay(indexes)
		});
		
		window.setTimeout(function(){
			sect.className = "loaded";
		}, 50);
		this.resizeWindow();
	};
	
	this.renderOverlay = function(indexes){
		var imageData = this.imageInfo.imageData;
		var data = imageData.data;
		var w = imageData.width;
		var h = imageData.height;
		var overlay = document.getElementById("overlay");
		var cover = this.cover;
		var ctx = overlay.getContext("2d");
		var ctx2 = cover.getContext("2d");
		
		ctx2.canvas.width = w;
		ctx2.canvas.height = h;
		
		var coverData = ctx2.createImageData(w,h);
		//ctx.putImageData(coverData, 0, 0);
		//var overlay = ctx.getImageData(0, 0, w, h);
		overlay = coverData;
		var len = indexes.length;
		for (var i = 0; i < len; i++){
		    var idx =  indexes[i];
		    //if (i == len-1){ console.log(i, cdata.data[idx]); }
		    overlay.data[idx] = 255;
		    overlay.data[idx+1] = 0;
		    overlay.data[idx+2] = 0;
			overlay.data[idx+3] = 200;
		}

		ctx2.putImageData(overlay , 0, 0);
		
		var view = document.getElementById("viewer");
		var o_w = view.offsetWidth;
		var o_h = view.offsetHeight;
		ctx.canvas.width = o_w;
		ctx.canvas.height = o_h;
		ctx.clearRect(0,0, o_w, o_h);
		ctx.drawImage(cover, 0 ,0, o_w, o_h)
	};
	
	this.renderOverlayByWorker = function(indexes){

		var imageData = this.imageInfo.imageData;
		var data = imageData.data;
		var w = imageData.width;
		var h = imageData.height;
		var overlay = document.getElementById("overlay");
		var cover = this.cover;
		var ctx = overlay.getContext("2d");
		var ctx2 = cover.getContext("2d");
		
		ctx2.canvas.width = w;
		ctx2.canvas.height = h;
		
		var coverData = ctx2.createImageData(w,h);
		
		var worker = new Worker('/lib/worker.overlay.js');

		var messageCall = function(evt){
			var overlay = evt.data.overlayData;
			ctx2.putImageData(overlay , 0, 0);

			var view = document.getElementById("viewer");
			var o_w = view.offsetWidth;
			var o_h = view.offsetHeight;
			ctx.canvas.width = o_w;
			ctx.canvas.height = o_h;
			ctx.clearRect(0,0, o_w, o_h);
			ctx.drawImage(cover, 0 ,0, o_w, o_h)
		};
		worker.addEventListener('message', messageCall.bind(this), false);

		worker.postMessage({ 
//		    'imageData': imageData,
			'overlayData': coverData,
			'indexes': indexes
		});
	}

	this.resizeViewer = function(img){
		var w = img.width;
		var h = img.height;
		var viewer =  document.getElementById("viewer");
		var _w = viewer.offsetWidth
		var scale = _w / w;
		var _h = Math.ceil(h * scale);
		viewer.style.height = _h+"px";
		var sizer = document.getElementById('current-size');
		sizer.innerHTML = _w +" x "+ _h;
		var overlay = document.getElementById('overlay');
		overlay.width = _w;
		overlay.height= _h;
		var cover = document.createElement("canvas");
		cover.width = w;
		cover.height = h;
		this.cover = cover;
	}
	/**
	* Renders a thumbnail view of the image.
	*/
	this.renderThumbnail = function(tags) {
		var thumbnail = document.getElementById("thumbnail");
		
		var _this = this;
		thumbnail.addEventListener('load', function(e){
			_this.resizeViewer(this);
		})
		window.addEventListener('resize', function(e){
			_this.resizeViewer(document.getElementById("thumbnail"));
		})
		if(thumbnail){ thumbnail.src = tags.src; }
		
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
	if (this.options.useWorkerRenderer){
		console.log("Renderer: Worker")
		this.renderOverlay = this.renderOverlayByWorker;
	}
	return this;
};
/**
* Load the image in question and display it, along with its metadata.
*/
document.addEventListener("DOMContentLoaded", function () {
	// The URL of the image to load is passed on the URL fragment.
	var params = getParams();
	var imageUrl =  decodeURIComponent(params["src"]);

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
