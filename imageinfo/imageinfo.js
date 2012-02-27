/* Origin:
 * ImageInfo 0.1.2 - A JavaScript library for reading image metadata.
 * Copyright (c) 2008 Jacob Seidelin, jseidelin@nihilogic.dk, http://blog.nihilogic.dk/
 * MIT License [http://www.nihilogic.dk/licenses/mit-license.txt]
 *
 * Modified by Vinci Wong (@vincicat)
 */


var ImageInfo;

if (!window.BlobBuilder && window.WebKitBlobBuilder) {
	window.BlobBuilder = window.WebKitBlobBuilder;
}
(function() {
	//exteral API
	window.ImageInfo = function(){
	
		return {
			tags: {},
			canvas: null,
			context: null,
			colorMap: {},
			colorIndex : [],
			conf: { useWorker: true, useAjax: true },
			url: '',
			loadInfo : function(url, cb) {
				if (!this.url) {
					this.url = url;
					this.readFileData(url, cb);
				} else {
					if (cb) cb();
				}
			},

			getAllFields : function(url) {
				return this.tags;
			},

			getField : function(url, field) {
				return this.tags[field];
			},

			loadFile: function (url, callback) {
				var args = Array.prototype.slice.call(arguments, 2);
				var xhr = new XMLHttpRequest();
				// Some Trick for reading binary http://stackoverflow.com/questions/6170421/blobbuilder-ruins-binary-data
				// oop, we have a better one: http://www.html5rocks.com/en/tutorials/file/xhr2/ 
				xhr.open("GET", url, true); //NOTE: must open xhr before setting the responseType to avoid 'DOM Exception 11'
				xhr.responseType = 'arraybuffer';
				xhr.onload = function() {
					if (this.status == 200 || this.status == "206") { callback.apply(xhr, args); }
				};
				xhr.send(null);
			},

			readFileData: function (url, callback) { // first callback
				var _this = this;
				if (this.conf.useAjax){
					this.loadFile(url, function(){
						var xhr = this;
						var mime = xhr.getResponseHeader('Content-type')
						_this.tags["mimeType"] = mime;

						var blobBuilder = new BlobBuilder();

						// FACT: this.response == this.responseText when parse as *string*, but when responseType is not string it doesn't stand
						// So we will use .response instead of .responseText
						blobBuilder.append(xhr.response);

						var blob = blobBuilder.getBlob(mime.split(";")[0]);
						_this.tags["blob"] = blob;
						_this.tags["byteSize"] = blob.size;
						_this.tags["url"] = url;
						var fs = new FileReader();
						fs.onload = (function(self) {
							return function(e) {
									var data_url = e.target.result 
									_this.tags['dataURL'] = data_url;
									self.setImage(data_url, callback);
									//callback(tags);
						        };
						})(_this);
						_this.tags["dataURL"] = fs.readAsDataURL(blob);

					});
				}else{ //theoretical faster and easier approach...NOT TESTED
					this.setImage(url, callback);
					tags["url"] = url;
				}

			},
		
			setImage : function(dataURL, callback){
				var image = new Image();
				var _this = this;
				image.addEventListener('load', function(){
					var img = this;
					_this.rawImage = img;
					var src_w = img.width;
					var src_h = img.height;
					_this.tags["width"] = src_w;
					_this.tags["height"] = src_h;
					
					_this.canvas = document.createElement('canvas');
					var ctx = _this.canvas.getContext('2d');
					_this.context = ctx;
					ctx.drawImage(image, 0, 0, src_w, src_h);
					_this.imageData = ctx.getImageData(0, 0, image.width, image.height);
					if(callback) callback(_this.tags);
				});
				image.src = dataURL;
			},

			setColorMap : function(callback, _this){
				if (this.conf.useWorker){
					var worker = new Worker('/imageinfo/colormap.js');
					var messageCall = function(evt){
						this.onMessage(evt);
						if(callback) {
							callback.apply(_this, [evt.data.colorMap]);
						}
					};
				    worker.addEventListener('message', messageCall.bind(this), false);
					
					// Note:  
					// You need to put all the data reference into event data object in the web worker call.
					// Caution:
					// - Event data object and all contents will be *COPIED* during the invocation
					// - Inside web worker, nothing outside the sandbox can be accessed
					// - NOTHING in main thread/caller/window will be changed by web worker. You need to fire event when thing is done to bring data away.
					// - EXTRA CARE: Thing you can't put in event data object
					// 	* DOMElement (HTML*), DOMDocuemnt, DOMWindow (so you can pass ImageData into worker)
					// 	* function (Closure involve DOMWindow) - DOM Exception 25
				    worker.postMessage({ 
				        'colorMap': this.colorMap,
				        'colorIndex': this.colorIndex,
				        'imageData': this.imageData
				    });
				}else{
					var color_map = this.colorMap;
					var color_index = this.colorIndex;
					var data_map = this.imageData;
					var data = data_map.data;

					var hex = '';
					for ( var i = 0, r = -1, g = -1, b = -1, a = -1; i < data.length; i += 4){
						r = i;
						g = i+1;
						b = i+2;
						a = i+3; 
						hex = [data[r],data[g],data[b],data[a]].join(",");
						if(!color_map.hasOwnProperty(hex)){  
							color_index.push(hex);
							color_map[hex] = []; 
						} 
						color_map[hex].push(i);
					}

					if(callback) callback.apply(_this, [color_map]);
				}


			},
			
			onMessage: function(evt){ //Process web worker data, as they work as "call by copy", not "call by reference" (Sandboxing)
				this.colorMap = evt.data.colorMap;
				this.colorIndex = evt.data.colorIndex;
				this.imageData = evt.data.imageData;
			},
			
	
		};
	};
	//Helper
	window.ImageHelper = {
		getAspectResize: function(w, h, new_w){
			var ratio = w / h;
		    var new_h = new_w / ratio;
		    
			return { w: Math.ceil(new_w), h: Math.ceil(new_h) };
		}
	}

})();

