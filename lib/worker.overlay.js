onmessage = function (event) {
	var indexes = event.data.indexes;
	var overlay = event.data.overlayData;
	var len = indexes.length;
	for (var i = 0; i < len; i++){
	    var idx =  indexes[i];
	    overlay.data[idx] = 255;
	    overlay.data[idx+1] = 0;
	    overlay.data[idx+2] = 0;
		overlay.data[idx+3] = 200;
	}

	postMessage({ status: 'complete', overlayData: overlay });
}